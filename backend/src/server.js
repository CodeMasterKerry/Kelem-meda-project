import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./config/db.js";
import authRoutes from "./routes/authroutes.js";
import productRoutes from "./routes/productroutes.js";
import salesRoutes from "./routes/salesroutes.js";
import reportRoutes from "./routes/reportroutes.js";
import categoryRoutes from "./routes/categoryroutes.js";
import inventoryRoutes from "./routes/inventoryroutes.js";
import approvalRoutes from "./routes/approvalroutes.js";
import userRoutes from "./routes/userroutes.js";

const app = express();

// Allow the frontend (Next.js) to talk to this server.
// CLIENT_URL is set in .env — in prod this points to the deployed frontend domain.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Parse incoming JSON bodies and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount feature-specific route handlers — each module handles its own validation
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/users", userRoutes);

// Catch-all for any route the frontend may call that doesn't exist yet
app.use((req, res) => {
  res.status(404).json({ success: false, message: `No route found for ${req.method} ${req.originalUrl}` });
});

// Central error handler — catches anything thrown inside route controllers
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Server Error] ${err.stack}`);
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected error occurred on the server.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Clean up the Prisma connection before the process exits
// This prevents connection pool leaks during container restarts
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Default port 5000 — avoids conflict with the Next.js dev server on 3000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

