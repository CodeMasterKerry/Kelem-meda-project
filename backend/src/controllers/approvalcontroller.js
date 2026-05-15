import { prisma } from "../config/db.js";

// Get all approvals
export const getAllApprovals = async (req, res) => {
  try {
    const { status, managerId, startDate, endDate } = req.query;

    const where = {
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

    const approvals = await prisma.approval.findMany({
      where,
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

    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get approval by ID
export const getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;

    const approval = await prisma.approval.findUnique({
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

    if (!approval) {
      return res
        .status(404)
        .json({ success: false, message: "Approval not found" });
    }

    res.json({ success: true, data: approval });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get pending approvals (sales requiring approval)
export const getPendingApprovals = async (req, res) => {
  try {
    const pendingSales = await prisma.sale.findMany({
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

    res.json({ success: true, data: pendingSales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get approvals by manager
export const getApprovalsByManager = async (req, res) => {
  try {
    const { managerId } = req.params;

    const approvals = await prisma.approval.findMany({
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

    res.json({ success: true, data: approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get approval statistics
export const getApprovalStatistics = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.query;

    const where = {
      ...(managerId && { managerId }),
      ...(startDate &&
        endDate && {
          approvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const totalApprovals = await prisma.approval.count({ where });

    const approvedCount = await prisma.approval.count({
      where: { ...where, status: "APPROVED" },
    });

    const rejectedCount = await prisma.approval.count({
      where: { ...where, status: "REJECTED" },
    });

    const pendingCount = await prisma.sale.count({
      where: {
        requiresApproval: true,
        status: "PENDING",
      },
    });

    // Get total value of approved sales
    const approvedSales = await prisma.sale.findMany({
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

    const totalApprovedValue = approvedSales.reduce(
      (sum, sale) => sum + sale.totalAmount,
      0,
    );

    res.json({
      success: true,
      data: {
        totalApprovals,
        approvedCount,
        rejectedCount,
        pendingCount,
        totalApprovedValue,
        approvalRate:
          totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
