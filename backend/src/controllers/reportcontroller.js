import { prisma } from "../config/db.js";
import PDFDocument from "pdfkit-table";
import XLSX from "xlsx";

/**
 * Returns an approved-sales summary for a single day.
 * Defaults to today if no date is specified.
 */
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    // Build the next-day boundary for the WHERE clause
    const dayAfter = new Date(reportDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const approvedSalesForDay = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: reportDate,
          lt: dayAfter,
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

    const dailySummary = {
      date: reportDate.toISOString().split("T")[0],
      totalSales: approvedSalesForDay.length,
      totalRevenue: approvedSalesForDay.reduce((acc, s) => acc + s.totalAmount, 0),
      totalVAT: approvedSalesForDay.reduce((acc, s) => acc + s.vat, 0),
      totalDiscount: approvedSalesForDay.reduce((acc, s) => acc + s.discount, 0),
      subtotal: approvedSalesForDay.reduce((acc, s) => acc + s.subtotal, 0),
      paymentMethods: {
        CASH: approvedSalesForDay.filter((s) => s.paymentMethod === "CASH").length,
        TRANSFER: approvedSalesForDay.filter((s) => s.paymentMethod === "TRANSFER").length,
        MOBILE: approvedSalesForDay.filter((s) => s.paymentMethod === "MOBILE").length,
      },
    };

    res.json({ success: true, data: { summary: dailySummary, sales: approvedSalesForDay } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate daily report: " + err.message });
  }
};

/**
 * Builds a month-level report showing performance trends and top products.
 */
export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const monthStart = new Date(reportYear, reportMonth, 1);
    const monthEnd = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);

    const monthlySales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
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

    // Break down revenue by calendar day for trending charts
    const dayByDayBreakdown = monthlySales.reduce((acc, sale) => {
      const dayNum = sale.createdAt.getDate();
      if (!acc[dayNum]) {
        acc[dayNum] = { count: 0, revenue: 0 };
      }
      acc[dayNum].count++;
      acc[dayNum].revenue += sale.totalAmount;
      return acc;
    }, {});

    // Find out which products drove the most revenue this month
    const revenuePerProduct = {};
    monthlySales.forEach((sale) => {
      sale.items.forEach((item) => {
        const pid = item.productId;
        if (!revenuePerProduct[pid]) {
          revenuePerProduct[pid] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        revenuePerProduct[pid].quantity += item.quantity;
        revenuePerProduct[pid].revenue += item.total;
      });
    });

    const topPerformers = Object.values(revenuePerProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const monthLabel = `${monthStart.toLocaleDateString()} - ${monthEnd.toLocaleDateString()}`;
    const totalRev = monthlySales.reduce((acc, s) => acc + s.totalAmount, 0);

    const monthlySummary = {
      period: monthLabel,
      totalSales: monthlySales.length,
      totalRevenue: totalRev,
      totalVAT: monthlySales.reduce((acc, s) => acc + s.vat, 0),
      totalDiscount: monthlySales.reduce((acc, s) => acc + s.discount, 0),
      averageSaleValue: monthlySales.length > 0 ? totalRev / monthlySales.length : 0,
      dailySales: dayByDayBreakdown,
      topProducts: topPerformers,
    };

    res.json({ success: true, data: { summary: monthlySummary, sales: monthlySales } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Monthly report failed: " + err.message });
  }
};

/**
 * Exports either a Sales or Stock report as an Excel file.
 * Period can be 'daily' or 'monthly'. Type is 'sales' or 'stock'.
 */
export const exportToExcel = async (req, res) => {
  try {
    const { type, period, date, year, month } = req.query;
    let reportRows = [];
    let outputFilename = "";

    if (type === "sales") {
      let dateRangeFilter = {};
      let fileSuffix = "";

      if (period === "daily") {
        const exportDate = date ? new Date(date) : new Date();
        exportDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(exportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        dateRangeFilter.createdAt = { gte: exportDate, lt: nextDay };
        fileSuffix = `_${exportDate.toISOString().split("T")[0]}`;
      } else if (period === "monthly") {
        const expYear = year ? parseInt(year) : new Date().getFullYear();
        const expMonth = month ? parseInt(month) - 1 : new Date().getMonth();
        const firstDay = new Date(expYear, expMonth, 1);
        const lastDay = new Date(expYear, expMonth + 1, 0, 23, 59, 59);
        dateRangeFilter.createdAt = { gte: firstDay, lte: lastDay };
        fileSuffix = `_${expYear}_${expMonth + 1}`;
      }

      const salesData = await prisma.sale.findMany({
        where: dateRangeFilter,
        include: { preparedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      // Map to clean rows suitable for the spreadsheet
      reportRows = salesData.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: s.createdAt.toLocaleDateString(),
        Time: s.createdAt.toLocaleTimeString(),
        Status: s.status,
        Payment: s.paymentMethod || "N/A",
        Subtotal: s.subtotal,
        Discount: s.discount,
        VAT: s.vat,
        Total: s.totalAmount,
        "Prepared By": s.preparedBy?.name || "N/A",
      }));
      outputFilename = `Sales_Report${fileSuffix}.xlsx`;
    } else {
      // Stock export — all non-deleted products
      const stockData = await prisma.product.findMany({
        where: { isDeleted: false },
        include: { category: true },
      });
      reportRows = stockData.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category?.name || "N/A",
        "Stock Level": p.stockLevel,
        "Selling Price": p.sellingPrice,
        Status: p.status,
      }));
      outputFilename = "Stock_Report.xlsx";
    }

    const sheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${outputFilename}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(fileBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Excel export failed: " + err.message });
  }
};

/**
 * Generates and streams a PDF report directly to the browser.
 * Includes company header, data table, and a dual-signature block.
 */
export const exportToPDF = async (req, res) => {
  try {
    const { type, period, date, year, month } = req.query;
    const pdfDoc = new PDFDocument();

    let outputFilename = "";
    let reportTitle = "";
    let whereClause = {};

    if (type === "sales") {
      let suffix = "";
      if (period === "daily") {
        const reportDate = date ? new Date(date) : new Date();
        reportDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.createdAt = { gte: reportDate, lt: nextDay };
        suffix = `_${reportDate.toISOString().split("T")[0]}`;
        reportTitle = `Daily Sales Report - ${reportDate.toLocaleDateString()}`;
      } else if (period === "monthly") {
        const rYear = year ? parseInt(year) : new Date().getFullYear();
        const rMonth = month ? parseInt(month) - 1 : new Date().getMonth();
        const firstDay = new Date(rYear, rMonth, 1);
        const lastDay = new Date(rYear, rMonth + 1, 0, 23, 59, 59);
        whereClause.createdAt = { gte: firstDay, lte: lastDay };
        suffix = `_${rYear}_${rMonth + 1}`;
        reportTitle = `Monthly Sales Report - ${rMonth + 1}/${rYear}`;
      } else {
        reportTitle = "Complete Sales Report";
      }
      outputFilename = `Sales_Report${suffix}.pdf`;
    } else {
      outputFilename = "Stock_Report.pdf";
      reportTitle = "Current Stock Inventory Report";
    }

    res.setHeader("Content-Disposition", `attachment; filename=${outputFilename}`);
    res.setHeader("Content-Type", "application/pdf");
    pdfDoc.pipe(res);

    // Company header
    pdfDoc.fontSize(20).text("Qelem Meda Technologies", { align: "center" });
    pdfDoc.fontSize(16).text(reportTitle, { align: "center" });
    pdfDoc.moveDown();

    if (type === "sales") {
      const salesRecords = await prisma.sale.findMany({
        where: whereClause,
        include: { preparedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      if (salesRecords.length === 0) {
        pdfDoc.fontSize(12).text("No approved sales were found for this period.", { align: "center" });
      } else {
        const tableConfig = {
          title: "Sales Transactions",
          headers: ["Invoice #", "Date", "Status", "Total (Birr)"],
          rows: salesRecords.map((s) => [
            s.invoiceNumber,
            s.createdAt.toLocaleDateString(),
            s.status,
            s.totalAmount.toString(),
          ]),
        };
        await pdfDoc.table(tableConfig, {
          prepareHeader: () => pdfDoc.font("Helvetica-Bold").fontSize(10),
          prepareRow: () => pdfDoc.font("Helvetica").fontSize(10),
        });

        // Dual-signature block for accountability
        const signingUser = await prisma.user.findUnique({
          where: { id: req.user.id },
        });
        pdfDoc.moveDown(4);

        const sigLineY = pdfDoc.y;
        const preparerNames = [
          ...new Set(salesRecords.map((s) => s.preparedBy?.name).filter(Boolean)),
        ].join(", ");

        pdfDoc.font("Helvetica-Bold").fontSize(10);
        pdfDoc.text(`Prepared By: ${preparerNames || "_______________________"}`, 50, sigLineY);
        pdfDoc.text(`Approved By: ${signingUser?.name || "_______________________"}`, 350, sigLineY);
      }
    } else {
      const inventoryList = await prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      });

      if (inventoryList.length === 0) {
        pdfDoc.fontSize(12).text("No products found in inventory.", { align: "center" });
      } else {
        const stockTable = {
          title: "Current Inventory Levels",
          headers: ["SKU", "Product Name", "Stock Qty", "Selling Price (Birr)"],
          rows: inventoryList.map((p) => [
            p.sku,
            p.name,
            p.stockLevel.toString(),
            p.sellingPrice.toString(),
          ]),
        };
        await pdfDoc.table(stockTable, {
          prepareHeader: () => pdfDoc.font("Helvetica-Bold").fontSize(10),
          prepareRow: () => pdfDoc.font("Helvetica").fontSize(10),
        });
      }
    }

    pdfDoc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: "PDF generation failed: " + err.message });
  }
};

