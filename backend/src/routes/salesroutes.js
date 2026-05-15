import express from "express";
import {
  createSale,
  getSales,
  getSaleById,
  approveSale,
} from "../controllers/salescontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getSales)
  .post(createSale);

router
  .route("/:id")
  .get(getSaleById);

router
  .route("/:id/approve")
  .patch(restrictTo("MANAGER"), approveSale);

export default router;
