import { prisma } from "../config/db.js";
import { generateSKU } from "../utils/utils.js";

/**
 * Retrieves products based on UI filters (search, category, etc.)
 * Optimized for the main inventory dashboard.
 */
export const getAllProducts = async (req, res) => {
  try {
    const { search, categoryId, status } = req.query;

    // Build filter object dynamically based on what the manager selected in the UI
    const productFilters = {
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

    const productList = await prisma.product.findMany({
      where: productFilters,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: productList });
  } catch (err) {
    console.error("Failed to fetch product list:", err.message);
    res.status(500).json({ success: false, message: "Could not load products. Please try again later." });
  }
};

// Fetch a single product's full profile including recent stock movements
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockHistory: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!targetProduct || targetProduct.isDeleted) {
      return res.status(404).json({ success: false, message: "The requested product does not exist or has been archived." });
    }

    res.json({ success: true, data: targetProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error while retrieving product details." });
  }
};

/**
 * Registers a new product in the system.
 * Automatically handles SKU generation based on category.
 */
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

    // Safety check: Ensure mandatory fields are present before hitting the DB
    if (!name || !categoryId || !costPrice || !sellingPrice) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, category, and pricing are mandatory.",
      });
    }

    // Generate unique SKU using our internal utility
    const productSku = await generateSKU(categoryId);

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku: productSku,
        description,
        categoryId: parseInt(categoryId),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        stockLevel: parseInt(stockLevel) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
      },
      include: { category: true },
    });

    // If starting with inventory, log the opening balance
    if (stockLevel > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: newProduct.id,
          type: "IN",
          quantity: parseInt(stockLevel),
          reason: "Opening Inventory / Initial Load",
        },
      });
    }

    console.info(`Product created successfully: ${newProduct.name} [${newProduct.sku}]`);
    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: "System failure during product creation: " + err.message });
  }
};

// Updates existing product details
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    // Clean up numeric inputs to prevent Prisma type mismatches
    if (payload.categoryId) payload.categoryId = parseInt(payload.categoryId);
    if (payload.costPrice) payload.costPrice = parseFloat(payload.costPrice);
    if (payload.sellingPrice) payload.sellingPrice = parseFloat(payload.sellingPrice);
    if (payload.stockLevel !== undefined) payload.stockLevel = parseInt(payload.stockLevel);

    const updatedRecord = await prisma.product.update({
      where: { id },
      data: payload,
    });

    res.json({ success: true, data: updatedRecord });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed. Verify the product ID and try again." });
  }
};

// Archive product (Soft Delete to preserve historical sales data)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({ success: true, message: "Product archived successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not remove product from active list." });
  }
};

/**
 * Manual Inventory Adjustment
 * Used for audits, damage, or stock corrections.
 */
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({ success: false, message: "Movement type must be either 'IN' or 'OUT'." });
    }

    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct || currentProduct.isDeleted) {
      return res.status(404).json({ success: false, message: "Cannot adjust stock for non-existent product." });
    }

    const finalizedInventory = await prisma.$transaction(async (tx) => {
      // 1. Calculate new stock level
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stockLevel:
            type === "IN"
              ? { increment: parseInt(quantity) }
              : { decrement: parseInt(quantity) },
        },
      });

      // 2. Audit the change
      await tx.inventoryTransaction.create({
        data: {
          productId: id,
          type,
          quantity: parseInt(quantity),
          reason: reason || `Admin correction: ${type}`,
        },
      });

      return updatedProduct;
    });

    res.json({ success: true, data: finalizedInventory });
  } catch (err) {
    res.status(500).json({ success: false, message: "Inventory transaction failed: " + err.message });
  }
};

// Fetches list of items that have dropped below the safety threshold
export const getLowStockProducts = async (req, res) => {
  try {
    // This query finds items where current stock is less than or equal to their specific threshold
    // Prisma cannot compare two columns in findMany directly. 
    // We use a raw query to identify items hitting their specific safety thresholds.
    const criticalStockItems = await prisma.$queryRaw`
      SELECT p.*, c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."isDeleted" = false 
        AND p.status = 'ACTIVE' 
        AND p."stockLevel" <= p."lowStockThreshold"
      ORDER BY p."stockLevel" ASC
    `;

    res.json({ success: true, data: criticalStockItems });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to identify low stock items." });
  }
};

// Retrieves movement history (In/Out) for a specific product
export const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const ledger = await prisma.inventoryTransaction.findMany({
      where: { productId: id },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ success: true, data: ledger });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error loading inventory ledger." });
  }
};

