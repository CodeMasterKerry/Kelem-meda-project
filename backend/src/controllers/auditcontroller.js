import { prisma } from "../config/db.js";

// Create audit log entry
export const createAuditLog = async (userId, action, entity, entityId) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error.message);
  }
};

// Get all audit logs
export const getAllAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      entity,
      action,
      startDate,
      endDate,
      limit = 100,
    } = req.query;

    const where = {
      ...(userId && { userId }),
      ...(entity && { entity }),
      ...(action && { action }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get audit logs by user
export const getAuditLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get audit logs by entity
export const getAuditLogsByEntity = async (req, res) => {
  try {
    const { entity, entityId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get audit log statistics
export const getAuditStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    const totalLogs = await prisma.auditLog.count({ where });

    // Group by action
    const actionCounts = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: { action: true },
    });

    // Group by entity
    const entityCounts = await prisma.auditLog.groupBy({
      by: ["entity"],
      where,
      _count: { entity: true },
    });

    // Group by user
    const userCounts = await prisma.auditLog.groupBy({
      by: ["userId"],
      where,
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        totalLogs,
        actionCounts,
        entityCounts,
        topUsers: userCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete old audit logs (cleanup)
export const cleanupOldLogs = async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} audit logs older than ${daysOld} days`,
      deletedCount: result.count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
