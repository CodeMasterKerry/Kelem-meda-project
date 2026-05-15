import express from "express";
import {
  getDailyReport,
  getMonthlyReport,
  exportToExcel,
  exportToPDF,
} from "../controllers/reportcontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("MANAGER")); // Usually reports are for managers

router.get("/daily", getDailyReport);
router.get("/monthly", getMonthlyReport);
router.get("/export/excel", exportToExcel);
router.get("/export/pdf", exportToPDF);

export default router;
