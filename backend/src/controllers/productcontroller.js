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
      include: { category: true, stockHistory: { take: 10, orderBy: { createdAt: "desc" } } },
    });

    if (!product || product.isDeleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const { name, sku, description, categoryId, costPrice, sellingPrice, stockLevel, lowStockThreshold } = req.body;

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ success: false, message: "SKU already exists" });
    }

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

    if (updateData.categoryId) updateData.categoryId = parseInt(updateData.categoryId);
    if (updateData.costPrice) updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.sellingPrice) updateData.sellingPrice = parseFloat(updateData.sellingPrice);
    if (updateData.stockLevel !== undefined) updateData.stockLevel = parseInt(updateData.stockLevel);

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
