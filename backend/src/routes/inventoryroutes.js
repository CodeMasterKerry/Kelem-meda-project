import express from "express";
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  getInventorySummary,
  getStockMovementReport,
} from "../controllers/inventorycontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getAllTransactions).post(createTransaction);

router.route("/summary").get(getInventorySummary);

router.route("/movement-report").get(getStockMovementReport);

router.route("/:id").get(getTransactionById);

export default router;
