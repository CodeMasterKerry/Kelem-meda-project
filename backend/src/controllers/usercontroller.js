import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

/**
 * Returns all staff accounts in the system.
 * Supports filtering by role (MANAGER / SALES_OFFICER) and name search.
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    const staffFilters = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const staffList = await prisma.user.findMany({
      where: staffFilters,
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

    res.json({ success: true, data: staffList });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not retrieve staff list." });
  }
};

// Fetches a single staff member's profile along with their activity counts
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const staffProfile = await prisma.user.findUnique({
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

    if (!staffProfile) {
      return res.status(404).json({ success: false, message: "Staff account not found." });
    }

    res.json({ success: true, data: staffProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching staff record." });
  }
};

// Allows admin to update a staff member's name, username, or role
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, role } = req.body;

    // Build the update object from only the fields provided
    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (username) updatedFields.username = username;
    if (role) updatedFields.role = role;

    const updatedProfile = await prisma.user.update({
      where: { id },
      data: updatedFields,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: updatedProfile });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "That username is already taken by another account." });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Staff account not found for update." });
    }
    res.status(500).json({ success: false, message: "Profile update failed." });
  }
};

/**
 * Lets a staff member change their own login password.
 * Requires verification of the old password before applying the change.
 */
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both the current password and the new one must be provided.",
      });
    }

    // Load account with password hash for verification
    const staffAccount = await prisma.user.findUnique({ where: { id } });
    if (!staffAccount) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    // Reject if the old password doesn't match
    const isPasswordCorrect = await bcrypt.compare(currentPassword, staffAccount.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "The current password you entered is incorrect." });
    }

    const freshHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: freshHash },
    });

    res.json({ success: true, message: "Password updated successfully. Please log in again." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Password change failed: " + err.message });
  }
};

/**
 * Admin-only: Force-reset a staff member's password without knowing the old one.
 * Used when a user is locked out.
 */
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: "A new password must be specified for the reset." });
    }

    const resetHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: resetHash },
    });

    res.json({ success: true, message: "Staff password has been reset by admin." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Staff account not found." });
    }
    res.status(500).json({ success: false, message: "Password reset failed." });
  }
};

/**
 * Removes a user account permanently.
 * Blocked if the user has any associated sales records to protect data integrity.
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for any linked sales — deletion would break referential integrity
    const linkedSalesCount = await prisma.sale.count({
      where: {
        OR: [{ preparedById: id }, { approvedById: id }],
      },
    });

    if (linkedSalesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `This staff member has ${linkedSalesCount} sales on record. Deactivate the account instead of deleting.`,
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ success: true, message: "Staff account has been permanently removed." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    res.status(500).json({ success: false, message: "Account deletion failed." });
  }
};

/**
 * Compiles a performance summary for a specific user — sales processed and (for managers) approvals granted.
 */
export const getUserStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const periodBoundary =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    const staffInfo = await prisma.user.findUnique({
      where: { id },
      select: { name: true, username: true, role: true },
    });

    if (!staffInfo) {
      return res.status(404).json({ success: false, message: "Staff account not found." });
    }

    // Retrieve all sales this officer has been involved in
    const officerSalesLog = await prisma.sale.findMany({
      where: {
        preparedById: id,
        ...periodBoundary,
      },
      select: {
        totalAmount: true,
        status: true,
      },
    });

    const totalPrepared = officerSalesLog.length;
    const revenueGenerated = officerSalesLog
      .filter((s) => s.status === "APPROVED")
      .reduce((acc, s) => acc + s.totalAmount, 0);

    // Only pull manager-specific data if this is a manager account
    let managerApprovalData = null;
    if (staffInfo.role === "MANAGER") {
      const managerApprovalHistory = await prisma.approval.findMany({
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

      managerApprovalData = {
        totalDecisions: managerApprovalHistory.length,
        approvedCount: managerApprovalHistory.filter((a) => a.status === "APPROVED").length,
        rejectedCount: managerApprovalHistory.filter((a) => a.status === "REJECTED").length,
        totalValueSigned: managerApprovalHistory
          .filter((a) => a.status === "APPROVED")
          .reduce((acc, a) => acc + a.sale.totalAmount, 0),
      };
    }

    res.json({
      success: true,
      data: {
        staffProfile: staffInfo,
        salesBreakdown: {
          totalPrepared,
          revenueGenerated,
          approvedCount: officerSalesLog.filter((s) => s.status === "APPROVED").length,
          pendingCount: officerSalesLog.filter((s) => s.status === "PENDING").length,
          rejectedCount: officerSalesLog.filter((s) => s.status === "REJECTED").length,
        },
        ...(managerApprovalData && { approvalActivity: managerApprovalData }),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not compile performance data." });
  }
};

// Returns a list of all Sales Officers — used for dropdown selections and reports
export const getSalesOfficers = async (req, res) => {
  try {
    const officerRoster = await prisma.user.findMany({
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

    res.json({ success: true, data: officerRoster });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load sales officers." });
  }
};

// Returns all managers — used in the approval assignment page
export const getManagers = async (req, res) => {
  try {
    const managerRoster = await prisma.user.findMany({
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

    res.json({ success: true, data: managerRoster });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load manager list." });
  }
};

