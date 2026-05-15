import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

// JWT token lifespan is 7 days — long enough to avoid constant re-logins
const buildAuthToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "7d",
  });

/**
 * Creates a new user account in the system.
 * Defaults to SALES_OFFICER role unless explicitly set by admin.
 */
export const register = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are mandatory: name, username, and password.",
      });
    }

    // Prevent duplicate usernames in the system
    const existingAccount = await prisma.user.findUnique({ where: { username } });
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: `The username '${username}' is already in use. Please choose a different one.`,
      });
    }

    // Hash with salt rounds of 12 — good balance of security and speed
    const securePassword = await bcrypt.hash(password, 12);
    const newStaffAccount = await prisma.user.create({
      data: {
        name,
        username,
        password: securePassword,
        role: role || "SALES_OFFICER",
      },
      select: { id: true, name: true, username: true, role: true },
    });

    const sessionToken = buildAuthToken(newStaffAccount.id);
    console.info(`New account registered: ${newStaffAccount.username} [${newStaffAccount.role}]`);

    res.status(201).json({ success: true, token: sessionToken, data: newStaffAccount });
  } catch (err) {
    res.status(500).json({ success: false, message: "Account creation failed: " + err.message });
  }
};

/**
 * Authenticates a staff member and returns a session token.
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const staffMember = await prisma.user.findUnique({ where: { username } });

    // Intentionally vague error to prevent username enumeration attacks
    if (!staffMember || !(await bcrypt.compare(password, staffMember.password))) {
      return res.status(401).json({
        success: false,
        message: "Login failed. Please verify your username and password.",
      });
    }

    const sessionToken = buildAuthToken(staffMember.id);

    // Strip out the password hash before sending the profile back
    const { password: _removed, ...publicProfile } = staffMember;

    res.json({ success: true, token: sessionToken, data: publicProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login service unavailable: " + err.message });
  }
};

// Returns the currently authenticated user's profile info
export const getMe = async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, username: true, role: true },
    });
    res.json({ success: true, data: currentUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load profile." });
  }
};

