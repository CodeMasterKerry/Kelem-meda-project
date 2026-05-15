import { prisma } from "../config/db.js";

/**
 * Returns all product categories for use in dropdowns and filter menus.
 * Inactive categories are hidden from the sales UI by default.
 */
export const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;

    // Admin can request inactive categories for management purposes
    const categoryVisibilityFilter = includeInactive === "true" ? {} : { isActive: true };

    const categoryList = await prisma.category.findMany({
      where: categoryVisibilityFilter,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: categoryList });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load category list: " + err.message });
  }
};

// Returns a specific category and all its currently active products
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const categoryDetails = await prisma.category.findUnique({
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

    if (!categoryDetails) {
      return res.status(404).json({ success: false, message: "The requested category does not exist." });
    }

    res.json({ success: true, data: categoryDetails });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching category data." });
  }
};

/**
 * Adds a new product category to the system.
 * Duplicate names are blocked to maintain clean dropdown lists.
 */
export const createCategory = async (req, res) => {
  try {
    const { name, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "A category name is required." });
    }

    // Stop duplicate category names from cluttering the system
    const duplicateCheck = await prisma.category.findUnique({ where: { name } });
    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: `A category named '${name}' already exists. Try a more specific name.`,
      });
    }

    const newCategory = await prisma.category.create({
      data: { name, isActive },
    });

    console.info(`New category added to the catalog: ${newCategory.name}`);
    res.status(201).json({ success: true, data: newCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Category creation failed: " + err.message });
  }
};

// Updates a category's name or its active/inactive status
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    // Only apply the fields that were actually sent
    const changesPayload = {};
    if (name !== undefined) changesPayload.name = name;
    if (isActive !== undefined) changesPayload.isActive = isActive;

    const refreshedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: changesPayload,
    });

    res.json({ success: true, data: refreshedCategory });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Category not found for update." });
    }
    res.status(500).json({ success: false, message: "Category update failed." });
  }
};

/**
 * Permanently removes a category — only allowed if no products are assigned to it.
 * This prevents orphaned product records.
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Safety check: block deletion if any products still belong to this group
    const linkedProductsCount = await prisma.product.count({
      where: { categoryId: parseInt(id), isDeleted: false },
    });

    if (linkedProductsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove this category — ${linkedProductsCount} product(s) are still assigned to it. Reassign them first.`,
      });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true, message: "Category has been removed from the system." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    res.status(500).json({ success: false, message: "Failed to delete category." });
  }
};

// Flips the active/inactive flag — useful for seasonal or temporary categories
export const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const targetCategory = await prisma.category.findUnique({
      where: { id: parseInt(id) },
    });

    if (!targetCategory) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    const newStatus = !targetCategory.isActive;
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { isActive: newStatus },
    });

    res.json({
      success: true,
      data: updatedCategory,
      message: `Category is now ${newStatus ? "active" : "inactive"}.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Status toggle failed: " + err.message });
  }
};

