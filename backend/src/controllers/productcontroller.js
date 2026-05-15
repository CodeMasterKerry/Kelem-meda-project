import { prisma } from "../config/db.js";

// Get all products with search and filtering
export const getAllProducts = async (req, res) => {
  try {
    const { search, categoryId, status } = req.query;

    const where = {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(status && { status }),
    };

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockHistory: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!product || product.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate unique SKU automatically
const generateSKU = async (categoryId) => {
  try {
    // Get category
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Get category prefix (first 3 letters uppercase)
    const categoryPrefix = category.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X");

    // Count products in this category
    const productCount = await prisma.product.count({
      where: { categoryId: parseInt(categoryId) },
    });

    // Generate SKU: PREFIX-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const sequence = String(productCount + 1).padStart(4, "0");

    let sku = `${categoryPrefix}-${dateStr}-${sequence}`;
    let counter = 1;

    // Ensure uniqueness
    while (await prisma.product.findUnique({ where: { sku } })) {
      const newSequence = String(productCount + 1 + counter).padStart(4, "0");
      sku = `${categoryPrefix}-${dateStr}-${newSequence}`;
      counter++;
    }

    return sku;
  } catch (error) {
    throw new Error(`Failed to generate SKU: ${error.message}`);
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      costPrice,
      sellingPrice,
      stockLevel,
      lowStockThreshold,
    } = req.body;

    if (!name || !categoryId || !costPrice || !sellingPrice) {
      return res.status(400).json({
        success: false,
        message: "name, categoryId, costPrice, and sellingPrice are required",
      });
    }

    // Generate SKU automatically
    const sku = await generateSKU(categoryId);

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        categoryId: parseInt(categoryId),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        stockLevel: parseInt(stockLevel) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
      },
      include: {
        category: true,
      },
    });

    // Record initial stock if provided
    if (stockLevel > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: parseInt(stockLevel),
          reason: "Initial Stock",
        },
      });
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.categoryId)
      updateData.categoryId = parseInt(updateData.categoryId);
    if (updateData.costPrice)
      updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.sellingPrice)
      updateData.sellingPrice = parseFloat(updateData.sellingPrice);
    if (updateData.stockLevel !== undefined)
      updateData.stockLevel = parseInt(updateData.stockLevel);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product (Soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Adjust stock (manual stock adjustment)
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body; // type: IN or OUT

    if (!["IN", "OUT"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid stock type. Use IN or OUT" });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update stock level
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stockLevel:
            type === "IN"
              ? { increment: parseInt(quantity) }
              : { decrement: parseInt(quantity) },
        },
      });

      // Record inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          productId: id,
          type,
          quantity: parseInt(quantity),
          reason: reason || `Manual ${type} adjustment`,
        },
      });

      return updatedProduct;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        status: "ACTIVE",
        stockLevel: {
          lte: prisma.raw("low_stock_threshold"),
        },
      },
      include: { category: true },
      orderBy: { stockLevel: "asc" },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stock history for a product
export const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const history = await prisma.inventoryTransaction.findMany({
      where: { productId: id },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
