import { prisma } from "../config/db.js";
import PDFDocument from "pdfkit";
import XLSX from "xlsx";

export const getDailyReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: "APPROVED",
      },
      include: { items: true },
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalVAT: sales.reduce((sum, s) => sum + s.vat, 0),
      totalDiscount: sales.reduce((sum, s) => sum + s.discount, 0),
    };

    res.json({ success: true, data: { summary, sales } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: firstDay },
        status: "APPROVED",
      },
      include: { items: true },
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalVAT: sales.reduce((sum, s) => sum + s.vat, 0),
    };

    res.json({ success: true, data: { summary, sales } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportToExcel = async (req, res) => {
  try {
    const { type } = req.query; // 'sales' or 'stock'
    let data = [];
    let filename = "";

    if (type === "sales") {
      const sales = await prisma.sale.findMany({
        include: { preparedBy: { select: { name: true } } },
      });
      data = sales.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: s.createdAt.toLocaleDateString(),
        Subtotal: s.subtotal,
        Discount: s.discount,
        VAT: s.vat,
        Total: s.totalAmount,
        Status: s.status,
        PreparedBy: s.preparedBy.name,
      }));
      filename = "Sales_Report.xlsx";
    } else {
      const products = await prisma.product.findMany({
        where: { isDeleted: false },
        include: { category: true },
      });
      data = products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category.name,
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
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportToPDF = async (req, res) => {
  try {
    const { type } = req.query;
    const doc = new PDFDocument();
    let filename = type === "sales" ? "Sales_Report.pdf" : "Stock_Report.pdf";

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Qelem Meda Technologies", { align: "center" });
    doc.fontSize(16).text(`${type === "sales" ? "Sales" : "Stock"} Report`, { align: "center" });
    doc.moveDown();

    if (type === "sales") {
      const sales = await prisma.sale.findMany({ take: 50, orderBy: { createdAt: "desc" } });
      sales.forEach((s) => {
        doc.fontSize(10).text(`${s.invoiceNumber} | ${s.createdAt.toLocaleDateString()} | Total: ${s.totalAmount} Birr`);
      });
    } else {
      const products = await prisma.product.findMany({ where: { isDeleted: false } });
      products.forEach((p) => {
        doc.fontSize(10).text(`${p.sku} | ${p.name} | Stock: ${p.stockLevel} | Price: ${p.sellingPrice}`);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
