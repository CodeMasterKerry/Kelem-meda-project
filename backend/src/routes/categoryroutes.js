import express from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../controllers/categorycontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getAllCategories)
  .post(restrictTo("MANAGER", "SALES_OFFICER"), createCategory);

router
  .route("/:id")
  .get(getCategoryById)
  .put(restrictTo("MANAGER"), updateCategory)
  .delete(restrictTo("MANAGER"), deleteCategory);

router
  .route("/:id/toggle-status")
  .patch(restrictTo("MANAGER"), toggleCategoryStatus);

export default router;
