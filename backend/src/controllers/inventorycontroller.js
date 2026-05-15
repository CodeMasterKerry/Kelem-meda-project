import { prisma } from "../config/db.js";

/**
 * Fetches the entire inventory movement history.
 * Supports filtering by product, transaction type, and date range.
 */
export const getAllTransactions = async (req, res) => {
  try {
    const { productId, type, startDate, endDate, limit = 100 } = req.query;

    const transactionFilters = {
      ...(productId && { productId }),
      ...(type && { type }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const movementLogs = await prisma.inventoryTransaction.findMany({
      where: transactionFilters,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stockLevel: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: movementLogs });
  } catch (err) {
    console.error("Ledger access error:", err.message);
    res.status(500).json({ success: false, message: "System could not load transaction history." });
  }
};

// Retrieve a specific transaction record by its unique ID
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const singleTransaction = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!singleTransaction) {
      return res.status(404).json({ success: false, message: "Movement record not found in system storage." });
    }

    res.json({ success: true, data: singleTransaction });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving record: " + err.message });
  }
};

/**
 * Manually registers an inventory transaction (e.g., restock or damage write-off).
 */
export const createTransaction = async (req, res) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    // Field validation
    if (!productId || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing mandatory adjustment details: product, type, and amount are required.",
      });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid movement type. Must be either 'IN' or 'OUT'." });
    }

    const targetProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!targetProduct || targetProduct.isDeleted) {
      return res.status(404).json({ success: false, message: "The specified product is no longer active." });
    }

    // Guard against negative stock levels
    if (type === "OUT" && targetProduct.stockLevel < parseInt(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Stock level too low. Currently ${targetProduct.stockLevel} units available.`,
      });
    }

    const adjustmentResult = await prisma.$transaction(async (tx) => {
      // 1. Create the audit record
      const auditLog = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantity: parseInt(quantity),
          reason: reason || `Manual store ${type.toLowerCase()}put adjustment`,
        },
      });

      // 2. Synchronize the product stock level
      await tx.product.update({
        where: { id: productId },
        data: {
          stockLevel:
            type === "IN"
              ? { increment: parseInt(quantity) }
              : { decrement: parseInt(quantity) },
        },
      });

      return auditLog;
    });

    res.status(201).json({ success: true, data: adjustmentResult });
  } catch (err) {
    res.status(500).json({ success: false, message: "Manual adjustment failed: " + err.message });
  }
};

/**
 * Compiles a high-level overview of current warehouse status.
 */
export const getInventorySummary = async (req, res) => {
  try {
    const activeProductsCount = await prisma.product.count({
      where: { isDeleted: false, status: "ACTIVE" },
    });

    const lowStockAlerts = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM "Product" 
      WHERE "isDeleted" = false 
        AND status = 'ACTIVE' 
        AND "stockLevel" <= "lowStockThreshold"
    `;
    const lowStockAlertsCount = lowStockAlerts[0]?.count || 0;

    const outOfStockCount = await prisma.product.count({
      where: {
        isDeleted: false,
        status: "ACTIVE",
        stockLevel: 0,
      },
    });

    const aggregateStockValue = await prisma.product.aggregate({
      where: { isDeleted: false, status: "ACTIVE" },
      _sum: {
        stockLevel: true,
      },
    });

    const latestLogs = await prisma.inventoryTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalProducts: activeProductsCount,
        lowStockProducts: lowStockAlertsCount,
        outOfStockProducts: outOfStockCount,
        totalStockUnits: aggregateStockValue._sum.stockLevel || 0,
        recentTransactions: latestLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate warehouse summary." });
  }
};

/**
 * Generates a detailed stock movement report for a specified date range.
 */
export const getStockMovementReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Please specify both start and end dates for the movement report.",
      });
    }

    const reportEntries = await prisma.inventoryTransaction.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compile movements by product for easier UI rendering
    const categorizedMovements = reportEntries.reduce((acc, log) => {
      const pid = log.productId;
      if (!acc[pid]) {
        acc[pid] = {
          product: log.product,
          inboundCount: 0,
          outboundCount: 0,
          details: [],
        };
      }

      if (log.type === "IN") {
        acc[pid].inboundCount += log.quantity;
      } else {
        acc[pid].outboundCount += log.quantity;
      }

      acc[pid].details.push(log);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        meta: {
          totalActions: reportEntries.length,
          totalIn: reportEntries
            .filter((l) => l.type === "IN")
            .reduce((s, l) => s + l.quantity, 0),
          totalOut: reportEntries
            .filter((l) => l.type === "OUT")
            .reduce((s, l) => s + l.quantity, 0),
        },
        productLevelReports: Object.values(categorizedMovements),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Report generation error: " + err.message });
  }
};

