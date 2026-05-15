import { prisma } from "../config/db.js";
import PDFDocument from "pdfkit-table";
import XLSX from "xlsx";

// Get daily sales report
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: targetDate,
          lt: nextDay,
        },
        status: "APPROVED",
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
        preparedBy: { select: { name: true } },
      },
    });

    const summary = {
      date: targetDate.toISOString().split("T")[0],
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalVAT: sales.reduce((sum, s) => sum + s.vat, 0),
      totalDiscount: sales.reduce((sum, s) => sum + s.discount, 0),
      subtotal: sales.reduce((sum, s) => sum + s.subtotal, 0),
      paymentMethods: {
        CASH: sales.filter((s) => s.paymentMethod === "CASH").length,
        TRANSFER: sales.filter((s) => s.paymentMethod === "TRANSFER").length,
        MOBILE: sales.filter((s) => s.paymentMethod === "MOBILE").length,
      },
    };

    res.json({ success: true, data: { summary, sales } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: firstDay,
          lte: lastDay,
        },
        status: "APPROVED",
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, category: { select: { name: true } } },
            },
          },
        },
        preparedBy: { select: { name: true } },
      },
    });

    // Group sales by day
    const dailySales = sales.reduce((acc, sale) => {
      const day = sale.createdAt.getDate();
      if (!acc[day]) {
        acc[day] = { count: 0, revenue: 0 };
      }
      acc[day].count++;
      acc[day].revenue += sale.totalAmount;
      return acc;
    }, {});

    // Top selling products
    const productSales = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productId = item.productId;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.total;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const summary = {
      period: `${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}`,
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalVAT: sales.reduce((sum, s) => sum + s.vat, 0),
      totalDiscount: sales.reduce((sum, s) => sum + s.discount, 0),
      averageSaleValue:
        sales.length > 0
          ? sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length
          : 0,
      dailySales,
      topProducts,
    };

    res.json({ success: true, data: { summary, sales } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportToExcel = async (req, res) => {
  try {
    const { type, period, date, year, month } = req.query; // 'sales' or 'stock'
    let data = [];
    let filename = "";

    if (type === "sales") {
      let whereClause = {}; // We export all or just approved? Usually approved
      let suffix = "";

      if (period === "daily") {
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.createdAt = { gte: targetDate, lt: nextDay };
        suffix = `_${targetDate.toISOString().split("T")[0]}`;
      } else if (period === "monthly") {
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
        const firstDay = new Date(targetYear, targetMonth, 1);
        const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        whereClause.createdAt = { gte: firstDay, lte: lastDay };
        suffix = `_${targetYear}_${targetMonth + 1}`;
      }

      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: { preparedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      data = sales.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: s.createdAt.toLocaleDateString(),
        Subtotal: s.subtotal,
        Discount: s.discount,
        VAT: s.vat,
        Total: s.totalAmount,
        Status: s.status,
        PreparedBy: s.preparedBy?.name || "N/A",
      }));
      filename = `Sales_Report${suffix}.xlsx`;
    } else {
      const products = await prisma.product.findMany({
        where: { isDeleted: false },
        include: { category: true },
      });
      data = products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category?.name || "N/A",
        Stock: p.stockLevel,
        Price: p.sellingPrice,
        Status: p.status,
      }));
      filename = "Stock_Report.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportToPDF = async (req, res) => {
  try {
    const { type, period, date, year, month } = req.query;
    const doc = new PDFDocument();

    let filename = "";
    let title = "";
    let whereClause = {};

    if (type === "sales") {
      let suffix = "";
      if (period === "daily") {
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.createdAt = { gte: targetDate, lt: nextDay };
        suffix = `_${targetDate.toISOString().split("T")[0]}`;
        title = `Daily Sales Report - ${targetDate.toLocaleDateString()}`;
      } else if (period === "monthly") {
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
        const firstDay = new Date(targetYear, targetMonth, 1);
        const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        whereClause.createdAt = { gte: firstDay, lte: lastDay };
        suffix = `_${targetYear}_${targetMonth + 1}`;
        title = `Monthly Sales Report - ${targetMonth + 1}/${targetYear}`;
      } else {
        title = "Complete Sales Report";
      }
      filename = `Sales_Report${suffix}.pdf`;
    } else {
      filename = "Stock_Report.pdf";
      title = "Current Stock Report";
    }

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Qelem Meda Technologies", { align: "center" });
    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown();

    if (type === "sales") {
      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: { preparedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      if (sales.length === 0) {
        doc
          .fontSize(12)
          .text("No sales found for this period.", { align: "center" });
      } else {
        const table = {
          title: "Sales Data",
          headers: ["Invoice", "Date", "Status", "Amount (Birr)"],
          rows: sales.map((s) => [
            s.invoiceNumber,
            s.createdAt.toLocaleDateString(),
            s.status,
            s.totalAmount.toString(),
          ]),
        };
        await doc.table(table, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
          prepareRow: () => doc.font("Helvetica").fontSize(10),
        });

        // Add signature block at the bottom
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
        });
        doc.moveDown(4);

        const currentY = doc.y;
        const preparers = [...new Set(sales.map(s => s.preparedBy?.name).filter(Boolean))].join(", ");
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text(
          `Prepared By: ${preparers || "_______________________"}`,
          50,
          currentY,
        );
        doc.text(
          `Approved By: ${user?.name || "_______________________"}`,
          350,
          currentY,
        );
      }
    } else {
      const products = await prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      });
      if (products.length === 0) {
        doc.fontSize(12).text("No products found.", { align: "center" });
      } else {
        const table = {
          title: "Inventory Data",
          headers: ["SKU", "Product Name", "Stock Level", "Price (Birr)"],
          rows: products.map((p) => [
            p.sku,
            p.name,
            p.stockLevel.toString(),
            p.sellingPrice.toString(),
          ]),
        };
        await doc.table(table, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
          prepareRow: () => doc.font("Helvetica").fontSize(10),
        });
      }
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
