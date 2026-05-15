import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const restrictTo = (...roles) => {
  return async (req, res, next) => {
    // We need to fetch the user role from DB if it's not in the token
    // For simplicity, let's assume we fetch it or it's in the token.
    // Let's fetch it for safety.
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }
    next();
  };
};
