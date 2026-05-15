import { prisma } from "../config/db.js";

// Get all inventory transactions
export const getAllTransactions = async (req, res) => {
  try {
    const { productId, type, startDate, endDate, limit = 100 } = req.query;

    const where = {
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

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
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

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create manual inventory transaction
export const createTransaction = async (req, res) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: "productId, type, and quantity are required",
      });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be IN or OUT",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if OUT transaction would result in negative stock
    if (type === "OUT" && product.stockLevel < parseInt(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stockLevel}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantity: parseInt(quantity),
          reason: reason || `Manual ${type} adjustment`,
        },
      });

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: {
          stockLevel:
            type === "IN"
              ? { increment: parseInt(quantity) }
              : { decrement: parseInt(quantity) },
        },
      });

      return transaction;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get inventory summary
export const getInventorySummary = async (req, res) => {
  try {
    const totalProducts = await prisma.product.count({
      where: { isDeleted: false, status: "ACTIVE" },
    });

    const lowStockProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        status: "ACTIVE",
        stockLevel: {
          lte: prisma.raw("low_stock_threshold"),
        },
      },
    });

    const outOfStockProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        status: "ACTIVE",
        stockLevel: 0,
      },
    });

    const totalStockValue = await prisma.product.aggregate({
      where: { isDeleted: false, status: "ACTIVE" },
      _sum: {
        stockLevel: true,
      },
    });

    const recentTransactions = await prisma.inventoryTransaction.findMany({
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
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockUnits: totalStockValue._sum.stockLevel || 0,
        recentTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stock movement report
export const getStockMovementReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const transactions = await prisma.inventoryTransaction.findMany({
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

    // Group by product
    const productMovements = transactions.reduce((acc, trans) => {
      const productId = trans.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: trans.product,
          totalIn: 0,
          totalOut: 0,
          transactions: [],
        };
      }

      if (trans.type === "IN") {
        acc[productId].totalIn += trans.quantity;
      } else {
        acc[productId].totalOut += trans.quantity;
      }

      acc[productId].transactions.push(trans);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: transactions.length,
          totalIn: transactions
            .filter((t) => t.type === "IN")
            .reduce((sum, t) => sum + t.quantity, 0),
          totalOut: transactions
            .filter((t) => t.type === "OUT")
            .reduce((sum, t) => sum + t.quantity, 0),
        },
        productMovements: Object.values(productMovements),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
