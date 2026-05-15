import express from "express";
import {
  getAllAuditLogs,
  getAuditLogsByUser,
  getAuditLogsByEntity,
  getAuditStatistics,
  getRecentActivity,
  cleanupOldLogs,
} from "../controllers/auditcontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("MANAGER")); // Only managers can access audit logs

router.route("/").get(getAllAuditLogs);

router.route("/statistics").get(getAuditStatistics);

router.route("/recent").get(getRecentActivity);

router.route("/cleanup").post(cleanupOldLogs);

router.route("/user/:userId").get(getAuditLogsByUser);

router.route("/entity/:entity/:entityId").get(getAuditLogsByEntity);

export default router;
