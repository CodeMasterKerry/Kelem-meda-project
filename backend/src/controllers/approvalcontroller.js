import { prisma } from "../config/db.js";

/**
 * Fetches all formal approvals logged in the system.
 * Useful for auditing manager activity.
 */
export const getAllApprovals = async (req, res) => {
  try {
    const { status, managerId, startDate, endDate } = req.query;

    const approvalFilters = {
      ...(status && { status }),
      ...(managerId && { managerId }),
      ...(startDate &&
        endDate && {
          approvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const approvalLogs = await prisma.approval.findMany({
      where: approvalFilters,
      include: {
        sale: {
          include: {
            preparedBy: { select: { id: true, name: true, username: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true } },
              },
            },
          },
        },
        manager: { select: { id: true, name: true, username: true } },
      },
      orderBy: { approvedAt: "desc" },
    });

    res.json({ success: true, data: approvalLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error loading approval ledger: " + err.message });
  }
};

// Retrieve details for a specific manager approval event
export const getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;

    const specificApproval = await prisma.approval.findUnique({
      where: { id: parseInt(id) },
      include: {
        sale: {
          include: {
            preparedBy: { select: { id: true, name: true, username: true } },
            approvedBy: { select: { id: true, name: true, username: true } },
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        manager: {
          select: { id: true, name: true, username: true, role: true },
        },
      },
    });

    if (!specificApproval) {
      return res.status(404).json({ success: false, message: "Approval record not found." });
    }

    res.json({ success: true, data: specificApproval });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during record retrieval." });
  }
};

/**
 * Lists all high-value sales that are currently waiting for a manager's signature.
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const pendingTransactions = await prisma.sale.findMany({
      where: {
        requiresApproval: true,
        status: "PENDING",
      },
      include: {
        preparedBy: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, sellingPrice: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: pendingTransactions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch pending sales list." });
  }
};

// Get a filtered history of what a specific manager has reviewed
export const getApprovalsByManager = async (req, res) => {
  try {
    const { managerId } = req.params;

    const managerHistory = await prisma.approval.findMany({
      where: { managerId },
      include: {
        sale: {
          include: {
            preparedBy: { select: { name: true } },
            items: true,
          },
        },
      },
      orderBy: { approvedAt: "desc" },
    });

    res.json({ success: true, data: managerHistory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error loading manager's history." });
  }
};

/**
 * Compiles performance metrics for the approval workflow.
 * Shows totals, rates, and values for auditing.
 */
export const getApprovalStatistics = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.query;

    const statFilters = {
      ...(managerId && { managerId }),
      ...(startDate &&
        endDate && {
          approvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const processedCount = await prisma.approval.count({ where: statFilters });
    const approvedTotal = await prisma.approval.count({
      where: { ...statFilters, status: "APPROVED" },
    });
    const rejectedTotal = await prisma.approval.count({
      where: { ...statFilters, status: "REJECTED" },
    });

    const currentPendingCount = await prisma.sale.count({
      where: {
        requiresApproval: true,
        status: "PENDING",
      },
    });

    // Calculate the actual monetary value of approved high-value sales
    const approvedSalesList = await prisma.sale.findMany({
      where: {
        status: "APPROVED",
        requiresApproval: true,
        ...(startDate &&
          endDate && {
            updatedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
      select: { totalAmount: true },
    });

    const totalApprovedVolume = approvedSalesList.reduce(
      (runningSum, sale) => runningSum + sale.totalAmount,
      0,
    );

    res.json({
      success: true,
      data: {
        totalProcessed: processedCount,
        approvedTotal,
        rejectedTotal,
        pendingNow: currentPendingCount,
        monetaryVolume: totalApprovedVolume,
        successRate:
          processedCount > 0 ? (approvedTotal / processedCount) * 100 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Statistics calculation failed: " + err.message });
  }
};

