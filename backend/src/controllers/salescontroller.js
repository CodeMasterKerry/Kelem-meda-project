import { prisma } from "../config/db.js";

import {
  generateInvoiceNumber,
  calculateItemTotal,
  calculateSaleTotal,
  validateSaleItems,
  checkStockAvailability,
} from "../utils/utils.js";

/**
 * Handles the creation of a new sale record.
 * Validates inventory availability, applies business pricing logic, 
 * and determines if manager authorization is required based on invoice total.
 */
export const createSale = async (req, res) => {
  const { items, paymentMethod, discountPercent = 0, preparedById } = req.body;

  try {
    // Validate that the shopping basket contains valid, actionable items
    const basketValidation = validateSaleItems(items);
    if (!basketValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "The provided cart items are invalid.",
        details: basketValidation.errors,
      });
    }

    const processedSale = await prisma.$transaction(async (tx) => {
      const lineItemsToProcess = [];

      // 1. Validate existence and inventory depth for every item
      for (const entry of items) {
        const productData = await tx.product.findUnique({
          where: { id: entry.productId },
        });

        if (!productData || productData.isDeleted || productData.status !== "ACTIVE") {
          throw new Error(`Product ${entry.productId} is currently unavailable for selection.`);
        }

        // Verify that current shelf levels meet the demand
        const availabilityCheck = checkStockAvailability(productData, entry.quantity);
        if (!availabilityCheck.sufficient) {
          throw new Error(
            `Insufficient stock for ${productData.name}. Requested: ${entry.quantity}, Available: ${availabilityCheck.available}.`,
          );
        }

        // Calculate pricing components for the line item
        const itemPricing = calculateItemTotal(
          entry.quantity,
          productData.sellingPrice,
          entry.discountPercent || 0,
        );

        lineItemsToProcess.push({
          productId: productData.id,
          quantity: entry.quantity,
          unitPrice: productData.sellingPrice,
          subtotal: itemPricing.subtotal,
          discount: itemPricing.discount,
          vat: itemPricing.vat,
          total: itemPricing.total,
        });
      }

      // 2. Aggregate final totals and check for executive approval requirements
      const invoiceSummary = calculateSaleTotal(lineItemsToProcess, discountPercent);
      const isApprovalMandatory = invoiceSummary.requiresApproval;

      // 3. Deduct inventory immediately if the sale is standard (auto-approved)
      if (!isApprovalMandatory) {
        for (const item of lineItemsToProcess) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockLevel: { decrement: item.quantity } },
          });

          // Create an audit trail for the inventory reduction
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              reason: `Retail Sale - Invoice finalized`,
            },
          });
        }
      }

      // 4. Generate a unique reference number for the receipt
      const invoiceReference = await generateInvoiceNumber();

      // 5. Store the finalized sale record
      const createdSale = await tx.sale.create({
        data: {
          invoiceNumber: invoiceReference,
          subtotal: invoiceSummary.subtotal,
          discount: invoiceSummary.discount,
          taxableAmount: invoiceSummary.taxableAmount,
          vat: invoiceSummary.vat,
          totalAmount: invoiceSummary.totalAmount,
          paymentMethod,
          requiresApproval: isApprovalMandatory,
          status: isApprovalMandatory ? "PENDING" : "APPROVED",
          preparedById,
          items: {
            create: lineItemsToProcess,
          },
        },
        include: { items: true },
      });

      // 6. Record financial entry if transaction does not require manager review
      if (createdSale.status === "APPROVED") {
        await tx.financialTransaction.create({
          data: {
            saleId: createdSale.id,
            type: "INCOME",
            amount: createdSale.totalAmount,
            paymentMethod: createdSale.paymentMethod,
            reference: createdSale.invoiceNumber,
            description: `Revenue captured for Invoice ${createdSale.invoiceNumber}`,
          },
        });
      }

      return createdSale;
    });

    res.status(201).json({ success: true, data: processedSale });
  } catch (err) {
    console.error("Sale process error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Retrieves sales logs with flexible filtering for status and specific date ranges.
 */
export const getSales = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const filterCriteria = {
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const salesHistory = await prisma.sale.findMany({
      where: filterCriteria,
      include: {
        preparedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: salesHistory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not retrieve sales registry: " + err.message });
  }
};

// Fetch full, itemized details for a single transaction
export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const saleRecord = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        preparedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        approval: true,
      },
    });

    if (!saleRecord) {
      return res.status(404).json({ success: false, message: "Invoice not found in the system archives." });
    }

    res.json({ success: true, data: saleRecord });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error while fetching invoice data." });
  }
};

/**
 * Allows a manager to approve or reject a pending high-value sale.
 */
export const approveSale = async (req, res) => {
  const { id } = req.params;
  const { status, comment, managerId } = req.body; 

  try {
    const targetSale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!targetSale) {
      return res.status(404).json({ success: false, message: "Pending sale not found." });
    }

    const updatedSaleResult = await prisma.$transaction(async (tx) => {
      // 1. Update the sale status based on manager decision
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: status === "APPROVED" ? "APPROVED" : "REJECTED",
          approvedById: managerId,
        },
      });

      // 2. Log the formal approval/rejection record
      await tx.approval.create({
        data: {
          saleId: id,
          managerId,
          status,
          comment: comment || `Manager ${status.toLowerCase()}d this transaction.`,
        },
      });

      // 3. Post-approval logic: Stock deduction and Finance entry
      if (status === "APPROVED") {
        for (const lineItem of targetSale.items) {
          // Re-verify stock levels at the moment of approval (important for busy stores)
          const currentStock = await tx.product.findUnique({
            where: { id: lineItem.productId },
          });

          if (!currentStock || currentStock.stockLevel < lineItem.quantity) {
            throw new Error(
              `Stock for ${currentStock?.name || "item"} is no longer sufficient to fulfill this sale.`,
            );
          }

          // Execute stock deduction
          await tx.product.update({
            where: { id: lineItem.productId },
            data: { stockLevel: { decrement: lineItem.quantity } },
          });

          // Log inventory movement
          await tx.inventoryTransaction.create({
            data: {
              productId: lineItem.productId,
              type: "OUT",
              quantity: lineItem.quantity,
              reason: `Approved Sale fulfillment: ${targetSale.invoiceNumber}`,
            },
          });
        }

        // Create the financial record for the income
        await tx.financialTransaction.create({
          data: {
            saleId: targetSale.id,
            type: "INCOME",
            amount: targetSale.totalAmount,
            paymentMethod: targetSale.paymentMethod,
            reference: targetSale.invoiceNumber,
            description: `Auto-recorded income for Approved Invoice ${targetSale.invoiceNumber}`,
          },
        });
      }

      return updatedSale;
    });

    res.json({ success: true, data: updatedSaleResult });
  } catch (err) {
    console.error("Manager Approval Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

