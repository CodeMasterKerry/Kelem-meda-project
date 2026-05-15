import { prisma } from "../config/db.js";
import { createAuditLog } from "./auditcontroller.js";
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

      // 1. Process each item
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

        // 2. Deduct stock
        await tx.product.update({
          where: { id: product.id },
          data: { stockLevel: { decrement: item.quantity } },
        });

        // 3. Record inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity: item.quantity,
            reason: `Sale Transaction`,
          },
        });
      }

      // 4. Calculate final totals using utils
      const saleTotals = calculateSaleTotal(saleItemsData, discountPercent);

      // 5. Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // 6. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          subtotal: saleTotals.subtotal,
          discount: saleTotals.discount,
          taxableAmount: saleTotals.taxableAmount,
          vat: saleTotals.vat,
          totalAmount: saleTotals.totalAmount,
          paymentMethod,
          requiresApproval: saleTotals.requiresApproval,
          status: saleTotals.requiresApproval ? "PENDING" : "APPROVED",
          preparedById,
          items: {
            create: saleItemsData,
          },
        },
        include: { items: true },
      });

      return sale;
    });

    // Audit Log
    await createAuditLog(req.body.preparedById, "CREATE_SALE", "SALE", result.id);

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
    const sale = await prisma.sale.findUnique({ where: { id } });
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

      // 3. If rejected, rollback stock?
      // Business logic choice: usually, we hold stock until approved/rejected.
      // If rejected, we should add back the stock.
      if (status === "REJECTED") {
        const items = await tx.saleItem.findMany({ where: { saleId: id } });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockLevel: { increment: item.quantity } },
          });

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "IN",
              quantity: item.quantity,
              reason: `Sale Rejected: ${id}`,
            },
          });
        }
      }

      return updated;
    });

    // Audit Log
    await createAuditLog(managerId, status === "APPROVED" ? "APPROVE_SALE" : "REJECT_SALE", "SALE", id);

    res.json({ success: true, data: updatedSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
