import { prisma } from "../config/db.js";

export const VAT_RATE = 0.15; // 15% VAT
export const APPROVAL_THRESHOLD = 50000; // Sales above this amount require approval

export const generateSKU = async (categoryId) => {
  try {
    // Get category
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!category) {
      throw new Error("Category not found");
    }

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

export const generateInvoiceNumber = async () => {
  try {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Count sales today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySalesCount = await prisma.sale.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const sequence = String(todaySalesCount + 1).padStart(4, "0");
    let invoiceNumber = `INV-${dateStr}-${sequence}`;
    let counter = 1;

    // Ensure uniqueness
    while (await prisma.sale.findUnique({ where: { invoiceNumber } })) {
      const newSequence = String(todaySalesCount + 1 + counter).padStart(
        4,
        "0",
      );
      invoiceNumber = `INV-${dateStr}-${newSequence}`;
      counter++;
    }

    return invoiceNumber;
  } catch (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }
};

export const calculateItemTotal = (
  quantity,
  unitPrice,
  itemDiscountPercent = 0,
) => {
  const subtotal = quantity * unitPrice;
  const discount = subtotal * (itemDiscountPercent / 100);
  const taxableAmount = subtotal - discount;
  const vat = taxableAmount * VAT_RATE;
  const total = taxableAmount + vat;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

export const calculateSaleTotal = (items, saleDiscountPercent = 0) => {
  // Sum up all item subtotals
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  // Apply sale-level discount
  const saleDiscount = subtotal * (saleDiscountPercent / 100);

  // Add item-level discounts
  const itemDiscounts = items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0,
  );

  const totalDiscount = saleDiscount + itemDiscounts;
  const taxableAmount = subtotal - totalDiscount;
  const vat = taxableAmount * VAT_RATE;
  const totalAmount = taxableAmount + vat;

  // Check if approval is required
  const requiresApproval = totalAmount > APPROVAL_THRESHOLD;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(totalDiscount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    requiresApproval,
  };
};

export const calculateProfitMargin = (costPrice, sellingPrice) => {
  const profit = sellingPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return {
    profit: parseFloat(profit.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
  };
};

export const calculateSalesSummary = (sales) => {
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalVAT = sales.reduce((sum, s) => sum + s.vat, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
  const subtotal = sales.reduce((sum, s) => sum + s.subtotal, 0);
  const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Group by payment method
  const paymentMethods = {
    CASH: sales.filter((s) => s.paymentMethod === "CASH").length,
    TRANSFER: sales.filter((s) => s.paymentMethod === "TRANSFER").length,
    MOBILE: sales.filter((s) => s.paymentMethod === "MOBILE").length,
  };

  // Group by status
  const statusBreakdown = {
    APPROVED: sales.filter((s) => s.status === "APPROVED").length,
    PENDING: sales.filter((s) => s.status === "PENDING").length,
    REJECTED: sales.filter((s) => s.status === "REJECTED").length,
  };

  return {
    totalSales,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalVAT: parseFloat(totalVAT.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    averageSaleValue: parseFloat(averageSaleValue.toFixed(2)),
    paymentMethods,
    statusBreakdown,
  };
};

export const calculateInventoryValue = (products) => {
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockLevel, 0);
  const totalCostValue = products.reduce(
    (sum, p) => sum + p.stockLevel * p.costPrice,
    0,
  );
  const totalSellingValue = products.reduce(
    (sum, p) => sum + p.stockLevel * p.sellingPrice,
    0,
  );
  const potentialProfit = totalSellingValue - totalCostValue;

  return {
    totalProducts,
    totalStockUnits,
    totalCostValue: parseFloat(totalCostValue.toFixed(2)),
    totalSellingValue: parseFloat(totalSellingValue.toFixed(2)),
    potentialProfit: parseFloat(potentialProfit.toFixed(2)),
  };
};

export const calculateTopSellingProducts = (saleItems, limit = 10) => {
  const productSales = {};

  saleItems.forEach((item) => {
    const productId = item.productId;
    if (!productSales[productId]) {
      productSales[productId] = {
        productId,
        productName: item.product?.name || "Unknown",
        sku: item.product?.sku || "N/A",
        totalQuantity: 0,
        totalRevenue: 0,
        salesCount: 0,
      };
    }

    productSales[productId].totalQuantity += item.quantity;
    productSales[productId].totalRevenue += item.total;
    productSales[productId].salesCount += 1;
  });

  return Object.values(productSales)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
    .map((p) => ({
      ...p,
      totalRevenue: parseFloat(p.totalRevenue.toFixed(2)),
    }));
};

export const calculateDailySalesTrend = (sales) => {
  const dailySales = {};

  sales.forEach((sale) => {
    const day = sale.createdAt.toISOString().split("T")[0];
    if (!dailySales[day]) {
      dailySales[day] = {
        date: day,
        count: 0,
        revenue: 0,
        vat: 0,
      };
    }

    dailySales[day].count++;
    dailySales[day].revenue += sale.totalAmount;
    dailySales[day].vat += sale.vat;
  });

  return Object.values(dailySales)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((d) => ({
      ...d,
      revenue: parseFloat(d.revenue.toFixed(2)),
      vat: parseFloat(d.vat.toFixed(2)),
    }));
};

export const validateSaleItems = (items) => {
  const errors = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push("Sale must have at least one item");
    return { valid: false, errors };
  }

  items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item ${index + 1}: productId is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: quantity must be greater than 0`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const checkStockAvailability = (product, requestedQuantity) => {
  const available = product.stockLevel;
  const sufficient = available >= requestedQuantity;

  return {
    sufficient,
    available,
    requested: requestedQuantity,
    shortage: sufficient ? 0 : requestedQuantity - available,
  };
};

export const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;

    case "week":
      const firstDayOfWeek = now.getDate() - now.getDay();
      startDate = new Date(now.setDate(firstDayOfWeek));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      break;

    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
  }

  return { startDate, endDate };
};

export const formatCurrency = (amount) => {
  return `${parseFloat(amount).toFixed(2)} Birr`;
};

export const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const safeParseInt = (value, defaultValue = 0) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};
