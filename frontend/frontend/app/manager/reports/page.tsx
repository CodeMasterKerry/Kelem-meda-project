"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Percent,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DailySummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalVAT: number;
  totalDiscount: number;
  subtotal: number;
  paymentMethods: { CASH: number; TRANSFER: number; MOBILE: number };
}

interface MonthlySummary {
  period: string;
  totalSales: number;
  totalRevenue: number;
  totalVAT: number;
  totalDiscount: number;
  averageSaleValue: number;
  dailySales: Record<string, { count: number; revenue: number }>;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

interface SaleRow {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  vat: number;
  discount: number;
  subtotal: number;
  status: string;
  createdAt: string;
  preparedBy?: { name: string };
}

type ReportMode = "daily" | "monthly";

export default function ManagerReportsPage() {
  const { token } = useAuthStore();

  const [mode, setMode] = useState<ReportMode>("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString(),
  );

  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(
    null,
  );
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyReport = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:5000/api/reports/daily?date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch daily report");
      const data = await res.json();
      setDailySummary(data.data.summary);
      setSales(data.data.sales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch report");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:5000/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch monthly report");
      const data = await res.json();
      setMonthlySummary(data.data.summary);
      setSales(data.data.sales);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch report");
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when mode/token changes — using a flag to avoid lint warning
  // about calling setState inside useEffect directly (the fetch functions are stable refs)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) return;
      if (mode === "daily") {
        if (!cancelled) fetchDailyReport();
      } else {
        if (!cancelled) fetchMonthlyReport();
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token]);

  const handleExport = async (format: "excel" | "pdf", type: "sales" | "stock" = "sales") => {
    if (!token) return;
    setIsExporting(true);
    try {
      let endpoint = `http://localhost:5000/api/reports/export/${format}?type=${type}`;
      let filename = type === "sales" ? `Sales_Report.${format === "excel" ? "xlsx" : "pdf"}` : `Stock_Report.${format === "excel" ? "xlsx" : "pdf"}`;
      
      if (type === "sales") {
        endpoint += `&period=${mode}`;
        if (mode === "daily") {
          endpoint += `&date=${selectedDate}`;
        } else {
          endpoint += `&year=${selectedYear}&month=${selectedMonth}`;
        }
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const summary = mode === "daily" ? dailySummary : monthlySummary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-500">
            View and export approved sales data
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel", "sales")}
            disabled={isExporting}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf", "sales")}
            disabled={isExporting}
            className="text-red-700 border-red-300 hover:bg-red-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mode Toggle & Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Mode switch */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "daily" ? "default" : "outline"}
                className={mode === "daily" ? "bg-[#1E5BA8]" : ""}
                onClick={() => setMode("daily")}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Daily
              </Button>
              <Button
                size="sm"
                variant={mode === "monthly" ? "default" : "outline"}
                className={mode === "monthly" ? "bg-[#1E5BA8]" : ""}
                onClick={() => setMode("monthly")}
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Monthly
              </Button>
            </div>

            {/* Date filter */}
            {mode === "daily" ? (
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Select Date
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={fetchDailyReport}
                  disabled={isLoading}
                  className="bg-[#1E5BA8] hover:bg-[#164a8f]"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Load
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Year
                  </label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-24"
                    min="2020"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Month
                  </label>
                  <select
                    aria-label="Select month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5BA8] w-32"
                  >
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  onClick={fetchMonthlyReport}
                  disabled={isLoading}
                  className="bg-[#1E5BA8] hover:bg-[#164a8f]"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Load
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-[#1E5BA8]">
                    {summary.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Birr</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalSales}
                  </p>
                  <p className="text-xs text-gray-400">Transactions</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total VAT</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.totalVAT.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Birr (15%)</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Percent className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {mode === "monthly" ? "Avg Sale Value" : "Total Discount"}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {mode === "monthly"
                      ? (
                          (summary as MonthlySummary).averageSaleValue ?? 0
                        ).toFixed(2)
                      : summary.totalDiscount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Birr</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Breakdown (Daily only) */}
      {mode === "daily" && dailySummary && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
            <CardDescription>
              Number of transactions per payment method on{" "}
              {new Date(dailySummary.date + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" },
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {(["CASH", "TRANSFER", "MOBILE"] as const).map((method) => {
                const count = dailySummary.paymentMethods[method] ?? 0;
                const total = dailySummary.totalSales || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={method} className="text-center">
                    <p className="text-sm text-gray-500 mb-1">{method}</p>
                    <p className="text-3xl font-bold text-gray-900">{count}</p>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                      <div
                        className="bg-[#1E5BA8] h-2 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Products (Monthly only) */}
      {mode === "monthly" && (monthlySummary?.topProducts?.length ?? 0) > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Top Selling Products</CardTitle>
            <CardDescription>By revenue for {monthlySummary?.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlySummary?.topProducts.map((p, i) => {
                const maxRevenue = monthlySummary?.topProducts[0].revenue || 1;
                const pct = Math.round((p.revenue / maxRevenue) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">
                        {i + 1}. {p.name}
                      </span>
                      <span className="text-gray-600">
                        {p.revenue.toFixed(2)} Birr ({p.quantity} units)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#1E5BA8] to-[#F5A623] h-2 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {mode === "daily" ? "Daily" : "Monthly"} Sales Detail
              </CardTitle>
              <CardDescription>
                Approved transactions for the selected period
              </CardDescription>
            </div>
            <Badge variant="secondary">{sales.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Loading report data...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">
                No approved sales found for this period
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Prepared By</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm font-medium">
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(sale.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.preparedBy?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {sale.subtotal.toFixed(2)} Birr
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-600">
                        -{sale.discount.toFixed(2)} Birr
                      </TableCell>
                      <TableCell className="text-right text-sm text-purple-600">
                        {sale.vat.toFixed(2)} Birr
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#1E5BA8]">
                        {sale.totalAmount.toFixed(2)} Birr
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
