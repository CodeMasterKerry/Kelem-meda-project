import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "7d",
  });

export const register = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already taken" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, username, password: hashed, role: role || "SALES_OFFICER" },
      select: { id: true, name: true, username: true, role: true },
    });

    const token = signToken(user.id);
    res.status(201).json({ success: true, token, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, username: true, role: true },
  });
  res.json({ success: true, data: user });
};
