import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getStockHistory,
} from "../controllers/productcontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All product routes require authentication

router.route("/").get(getAllProducts).post(createProduct); // Sales Officer or Manager can create

router.route("/low-stock").get(getLowStockProducts);

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(restrictTo("MANAGER", "SALES_OFFICER"), deleteProduct);

router.route("/:id/adjust-stock").post(adjustStock);

router.route("/:id/stock-history").get(getStockHistory);

export default router;
