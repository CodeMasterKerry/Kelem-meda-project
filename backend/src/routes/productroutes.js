import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productcontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All product routes require authentication

router
  .route("/")
  .get(getAllProducts)
  .post(createProduct); // Sales Officer or Manager can create

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(restrictTo("MANAGER"), deleteProduct); // Only manager can delete

export default router;
