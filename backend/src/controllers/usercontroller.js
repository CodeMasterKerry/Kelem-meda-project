import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            preparedSales: true,
            approvedSales: true,
            approvals: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            preparedSales: true,
            approvedSales: true,
            approvals: true,
          },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (role) updateData.role = role;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, message: "Username already taken" });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reset password (Admin only)
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New password is required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has sales
    const salesCount = await prisma.sale.count({
      where: {
        OR: [{ preparedById: id }, { approvedById: id }],
      },
    });

    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user with ${salesCount} associated sales. Consider deactivating instead.`,
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user statistics
export const getUserStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, username: true, role: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Sales prepared by user
    const preparedSales = await prisma.sale.findMany({
      where: {
        preparedById: id,
        ...dateFilter,
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const totalSalesPrepared = preparedSales.length;
    const totalRevenuePrepared = preparedSales
      .filter((s) => s.status === "APPROVED")
      .reduce((sum, s) => sum + s.totalAmount, 0);

    // If manager, get approval statistics
    let approvalStats = null;
    if (user.role === "MANAGER") {
      const approvals = await prisma.approval.findMany({
        where: {
          managerId: id,
          ...(startDate &&
            endDate && {
              approvedAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }),
        },
        include: {
          sale: { select: { totalAmount: true } },
        },
      });

      approvalStats = {
        totalApprovals: approvals.length,
        approved: approvals.filter((a) => a.status === "APPROVED").length,
        rejected: approvals.filter((a) => a.status === "REJECTED").length,
        totalValueApproved: approvals
          .filter((a) => a.status === "APPROVED")
          .reduce((sum, a) => sum + a.sale.totalAmount, 0),
      };
    }

    res.json({
      success: true,
      data: {
        user,
        salesStatistics: {
          totalSalesPrepared,
          totalRevenuePrepared,
          approvedSales: preparedSales.filter((s) => s.status === "APPROVED")
            .length,
          pendingSales: preparedSales.filter((s) => s.status === "PENDING")
            .length,
          rejectedSales: preparedSales.filter((s) => s.status === "REJECTED")
            .length,
        },
        ...(approvalStats && { approvalStatistics: approvalStats }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get sales officers
export const getSalesOfficers = async (req, res) => {
  try {
    const officers = await prisma.user.findMany({
      where: { role: "SALES_OFFICER" },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        _count: {
          select: { preparedSales: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: officers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get managers
export const getManagers = async (req, res) => {
  try {
    const managers = await prisma.user.findMany({
      where: { role: "MANAGER" },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        _count: {
          select: { approvals: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: managers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
