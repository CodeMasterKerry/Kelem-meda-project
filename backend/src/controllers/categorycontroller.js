import { prisma } from "../config/db.js";

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;

    const where = includeInactive === "true" ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        products: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            sku: true,
            sellingPrice: true,
            stockLevel: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name, isActive = true } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    // Check if category already exists
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Category already exists" });
    }

    const category = await prisma.category.create({
      data: { name, isActive },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: parseInt(id), isDeleted: false },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productsCount} active products`,
      });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle category status
export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { isActive: !category.isActive },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
