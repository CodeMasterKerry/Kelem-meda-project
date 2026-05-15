import express from "express";
import {
  getAllApprovals,
  getApprovalById,
  getPendingApprovals,
  getApprovalsByManager,
  getApprovalStatistics,
} from "../controllers/approvalcontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getAllApprovals);

router.route("/pending").get(restrictTo("MANAGER"), getPendingApprovals);

router.route("/statistics").get(restrictTo("MANAGER"), getApprovalStatistics);

router
  .route("/manager/:managerId")
  .get(restrictTo("MANAGER"), getApprovalsByManager);

router.route("/:id").get(getApprovalById);

export default router;
