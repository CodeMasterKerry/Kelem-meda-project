import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  resetPassword,
  deleteUser,
  getUserStatistics,
  getSalesOfficers,
  getManagers,
} from "../controllers/usercontroller.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(restrictTo("MANAGER"), getAllUsers);

router.route("/sales-officers").get(getSalesOfficers);

router.route("/managers").get(getManagers);

router
  .route("/:id")
  .get(getUserById)
  .put(restrictTo("MANAGER"), updateUser)
  .delete(restrictTo("MANAGER"), deleteUser);

router.route("/:id/change-password").patch(changePassword);

router.route("/:id/reset-password").patch(restrictTo("MANAGER"), resetPassword);

router.route("/:id/statistics").get(getUserStatistics);

export default router;
