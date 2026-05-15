import { prisma } from "../config/db.js";

import {
  generateInvoiceNumber,
  calculateItemTotal,
  calculateSaleTotal,
  validateSaleItems,
  checkStockAvailability,
} from "../utils/utils.js";

export const createSale = async (req, res) => {
  const { items, paymentMethod, discountPercent = 0, preparedById } = req.body;

  try {
    // Validate items
    const validation = validateSaleItems(items);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale items",
        errors: validation.errors,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const saleItemsData = [];

      // 1. Prepare data and check stock availability for all items
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.isDeleted || product.status !== "ACTIVE") {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }

        // Check stock availability
        const stockCheck = checkStockAvailability(product, item.quantity);
        if (!stockCheck.sufficient) {
          throw new Error(
            `Insufficient stock for product: ${product.name}. Available: ${stockCheck.available}, Requested: ${stockCheck.requested}`,
          );
        }

        // Calculate item totals using utils
        const itemTotals = calculateItemTotal(
          item.quantity,
          product.sellingPrice,
          item.discountPercent || 0,
        );

        saleItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          subtotal: itemTotals.subtotal,
          discount: itemTotals.discount,
          vat: itemTotals.vat,
          total: itemTotals.total,
        });
      }

      // 2. Calculate final totals to determine if approval is required
      const saleTotals = calculateSaleTotal(saleItemsData, discountPercent);
      const requiresApproval = saleTotals.requiresApproval;

      // 3. Deduct stock ONLY if the sale does NOT require approval
      // If it requires approval, stock will be deducted when the manager approves it.
      if (!requiresApproval) {
        for (const item of saleItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockLevel: { decrement: item.quantity } },
          });

          // Record inventory transaction
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              reason: `Sale Transaction`,
            },
          });
        }
      }

      // 4. Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // 5. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          subtotal: saleTotals.subtotal,
          discount: saleTotals.discount,
          taxableAmount: saleTotals.taxableAmount,
          vat: saleTotals.vat,
          totalAmount: saleTotals.totalAmount,
          paymentMethod,
          requiresApproval: requiresApproval,
          status: requiresApproval ? "PENDING" : "APPROVED",
          preparedById,
          items: {
            create: saleItemsData,
          },
        },
        include: { items: true },
      });

      // 6. Record financial transaction if approved immediately
      if (sale.status === "APPROVED") {
        await tx.financialTransaction.create({
          data: {
            saleId: sale.id,
            type: "INCOME",
            amount: sale.totalAmount,
            paymentMethod: sale.paymentMethod,
            reference: sale.invoiceNumber,
            description: `Payment for Sale ${sale.invoiceNumber}`,
          },
        });
      }

      return sale;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Sale Transaction Failed:", error.message);
    res.status(400).json({ success: false, message: error.message });
    // Prisma $transaction automatically rolls back on error
  }
};

export const getSales = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const where = {
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        preparedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        preparedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        approval: true,
      },
    });

    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });

    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveSale = async (req, res) => {
  const { id } = req.params;
  const { status, comment, managerId } = req.body; // status: APPROVED or REJECTED

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });

    const updatedSale = await prisma.$transaction(async (tx) => {
      // 1. Update Sale status
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: status === "APPROVED" ? "APPROVED" : "REJECTED",
          approvedById: managerId,
        },
      });

      // 2. Record Approval
      await tx.approval.create({
        data: {
          saleId: id,
          managerId,
          status,
          comment,
        },
      });

      // If approved, deduct stock and record financial transaction
      if (status === "APPROVED") {
        for (const item of sale.items) {
          // Check stock availability again at approval time
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.stockLevel < item.quantity) {
            throw new Error(
              `Insufficient stock for product: ${product?.name || "Unknown"} at approval time.`,
            );
          }

          // Deduct stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stockLevel: { decrement: item.quantity } },
          });

          // Record inventory transaction
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              reason: `Sale Approved: ${sale.invoiceNumber}`,
            },
          });
        }

        // Record financial transaction
        await tx.financialTransaction.create({
          data: {
            saleId: sale.id,
            type: "INCOME",
            amount: sale.totalAmount,
            paymentMethod: sale.paymentMethod,
            reference: sale.invoiceNumber,
            description: `Payment for Approved Sale ${sale.invoiceNumber}`,
          },
        });
      }

      return updated;
    });

    res.json({ success: true, data: updatedSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
