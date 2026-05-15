import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load environment variables
require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcrypt");

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seed...");

  // Create Users
  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("password", 12);

  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      password: hashedPassword,
      name: "Manager User",
      role: "MANAGER",
    },
  });

  const officer = await prisma.user.upsert({
    where: { username: "officer" },
    update: {},
    create: {
      username: "officer",
      password: hashedPassword,
      name: "Sales Officer",
      role: "SALES_OFFICER",
    },
  });

  console.log("✅ Users created");

  // Create Categories
  console.log("Creating categories...");
  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: {
      name: "Electronics",
      isActive: true,
    },
  });

  const clothing = await prisma.category.upsert({
    where: { name: "Clothing" },
    update: {},
    create: {
      name: "Clothing",
      isActive: true,
    },
  });

  const food = await prisma.category.upsert({
    where: { name: "Food & Beverages" },
    update: {},
    create: {
      name: "Food & Beverages",
      isActive: true,
    },
  });

  const furniture = await prisma.category.upsert({
    where: { name: "Furniture" },
    update: {},
    create: {
      name: "Furniture",
      isActive: true,
    },
  });

  console.log("✅ Categories created");

  // Create Products
  console.log("Creating products...");

  const products = [
    {
      name: "Laptop HP ProBook",
      description: "High-performance laptop for business",
      categoryId: electronics.id,
      costPrice: 25000,
      sellingPrice: 35000,
      stockLevel: 15,
      lowStockThreshold: 5,
    },
    {
      name: "Samsung Galaxy Phone",
      description: "Latest smartphone model",
      categoryId: electronics.id,
      costPrice: 15000,
      sellingPrice: 22000,
      stockLevel: 25,
      lowStockThreshold: 10,
    },
    {
      name: "Men's Formal Shirt",
      description: "Cotton formal shirt",
      categoryId: clothing.id,
      costPrice: 500,
      sellingPrice: 850,
      stockLevel: 50,
      lowStockThreshold: 15,
    },
    {
      name: "Women's Dress",
      description: "Elegant evening dress",
      categoryId: clothing.id,
      costPrice: 800,
      sellingPrice: 1500,
      stockLevel: 30,
      lowStockThreshold: 10,
    },
    {
      name: "Coffee Beans 1kg",
      description: "Premium Ethiopian coffee",
      categoryId: food.id,
      costPrice: 300,
      sellingPrice: 500,
      stockLevel: 100,
      lowStockThreshold: 20,
    },
    {
      name: "Office Chair",
      description: "Ergonomic office chair",
      categoryId: furniture.id,
      costPrice: 3000,
      sellingPrice: 5000,
      stockLevel: 10,
      lowStockThreshold: 3,
    },
    {
      name: "Desk Lamp",
      description: "LED desk lamp",
      categoryId: electronics.id,
      costPrice: 200,
      sellingPrice: 400,
      stockLevel: 40,
      lowStockThreshold: 10,
    },
    {
      name: "Water Bottle",
      description: "Stainless steel water bottle",
      categoryId: food.id,
      costPrice: 150,
      sellingPrice: 300,
      stockLevel: 60,
      lowStockThreshold: 15,
    },
  ];

  for (const productData of products) {
    // Generate SKU
    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
    });

    const categoryPrefix = category.name.substring(0, 3).toUpperCase();
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const productCount = await prisma.product.count({
      where: { categoryId: productData.categoryId },
    });
    const sequence = String(productCount + 1).padStart(4, "0");
    const sku = `${categoryPrefix}-${dateStr}-${sequence}`;

    const product = await prisma.product.create({
      data: {
        ...productData,
        sku,
        status: "ACTIVE",
      },
    });

    // Create initial stock transaction
    await prisma.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: "IN",
        quantity: productData.stockLevel,
        reason: "Initial Stock",
      },
    });
  }

  console.log("✅ Products created");

  console.log("🎉 Database seeded successfully!");
  console.log("\n📝 Login Credentials:");
  console.log("Manager - username: manager, password: password");
  console.log("Sales Officer - username: officer, password: password");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
