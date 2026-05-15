"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore, useSalesStore, type Sale } from "@/store";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  ShoppingCart,
  DollarSign,
  Percent,
  CheckCircle,
} from "lucide-react";
import type { SaleItem } from "@/store";

export default function SalesOfficerReportsPage() {
  const { user, token } = useAuthStore();
  const { sales, fetchSales, isLoading } = useSalesStore();

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (token) fetchSales(token);
  }, [token, fetchSales]);

  // My approved sales only
  const mySales = useMemo(
    () => sales.filter((s) => s.preparedById === user?.id),
    [sales, user],
  );

  const filteredSales = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    return mySales.filter((s) => {
      const d = new Date(s.createdAt);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [mySales, startDate, endDate]);

  const approved = filteredSales.filter((s) => s.status === "APPROVED");
  const pending = filteredSales.filter((s) => s.status === "PENDING");
  const rejected = filteredSales.filter((s) => s.status === "REJECTED");
  const totalRevenue = approved.reduce((s, x) => s + x.totalAmount, 0);
  const totalVAT = approved.reduce((s, x) => s + x.vat, 0);
  const totalDiscount = approved.reduce((s, x) => s + x.discount, 0);
  const avgSale = approved.length > 0 ? totalRevenue / approved.length : 0;

  // Payment breakdown from approved
  const paymentBreakdown = {
    CASH: approved.filter((s) => s.paymentMethod === "CASH").length,
    TRANSFER: approved.filter((s) => s.paymentMethod === "TRANSFER").length,
    MOBILE: approved.filter((s) => s.paymentMethod === "MOBILE").length,
  };

  // Daily trend for filtered window
  const dailyMap: Record<string, number> = {};
  approved.forEach((s) => {
    const key = new Date(s.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dailyMap[key] = (dailyMap[key] || 0) + s.totalAmount;
  });
  const dailyEntries = Object.entries(dailyMap).slice(-7);
  const maxRevDay = Math.max(...dailyEntries.map(([, v]) => v), 1);

  const viewSaleDetails = async (saleId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSelectedSale(data.data);
      setShowDetails(true);
    } catch (e) {
      console.error(e);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Invoice",
      "Date",
      "Time",
      "Status",
      "Payment",
      "Subtotal",
      "Discount",
      "VAT",
      "Total",
    ];
    const rows = filteredSales.map((s) => {
      const dateObj = new Date(s.createdAt);
      return [
        s.invoiceNumber,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        s.status,
        s.paymentMethod || "",
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.vat.toFixed(2),
        s.totalAmount.toFixed(2),
      ];
    });

    const escapeCSV = (val: string) => {
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [headers, ...rows]
      .map((r) => r.map(escapeCSV).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `My_Sales_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
          <p className="text-sm text-gray-500">
            Personal sales performance & history
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => token && fetchSales(token)}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#1E5BA8] hover:bg-[#164a8f]"
            onClick={exportCSV}
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date();
                d.setDate(1);
                setStartDate(d.toISOString().split("T")[0]);
                setEndDate(new Date().toISOString().split("T")[0]);
              }}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 6);
                setStartDate(d.toISOString().split("T")[0]);
                setEndDate(new Date().toISOString().split("T")[0]);
              }}
            >
              Last 7 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "My Revenue",
            value: `${totalRevenue.toFixed(0)} Birr`,
            sub: `${approved.length} approved`,
            icon: DollarSign,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Avg Sale",
            value: `${avgSale.toFixed(0)} Birr`,
            sub: "Per approved sale",
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "VAT Collected",
            value: `${totalVAT.toFixed(0)} Birr`,
            sub: `${totalDiscount.toFixed(0)} Birr discounted`,
            icon: Percent,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Total Submitted",
            value: filteredSales.length.toString(),
            sub: `${pending.length} pending · ${rejected.length} rejected`,
            icon: ShoppingCart,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((kpi, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`${kpi.bg} ${kpi.color} p-2.5 rounded-lg`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trend */}
      {dailyEntries.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1E5BA8]" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Approved revenue per day in selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-36">
              {dailyEntries.map(([label, revenue], i) => {
                const h = (revenue / maxRevDay) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="relative w-full flex items-end justify-center h-24">
                      <div
                        title={`${revenue.toFixed(0)} Birr`}
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#1E5BA8] to-sky-400 transition-all duration-700 cursor-pointer hover:opacity-80"
                        style={{ height: `${Math.max(h, 5)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center leading-tight">
                      {label}
                    </p>
                    <p className="text-[11px] font-semibold text-gray-600">
                      {revenue.toFixed(0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment & Status side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>Breakdown of your approved sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["CASH", "TRANSFER", "MOBILE"] as const).map((m) => {
                const cnt = paymentBreakdown[m];
                const total = approved.length || 1;
                const pct = Math.round((cnt / total) * 100);
                const colors: Record<string, string> = {
                  CASH: "bg-green-500",
                  TRANSFER: "bg-blue-500",
                  MOBILE: "bg-purple-500",
                };
                return (
                  <div key={m}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{m}</span>
                      <span className="text-gray-500">
                        {cnt} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`${colors[m]} h-2.5 rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Approval status */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Submission Status</CardTitle>
            <CardDescription>
              {filteredSales.length} total submissions in range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-xl p-4">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">
                  {approved.length}
                </p>
                <p className="text-xs text-green-600 font-medium">Approved</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <Calendar className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">
                  {pending.length}
                </p>
                <p className="text-xs text-orange-600 font-medium">Pending</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <ShoppingCart className="w-6 h-6 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">
                  {rejected.length}
                </p>
                <p className="text-xs text-red-600 font-medium">Rejected</p>
              </div>
            </div>
            {filteredSales.length > 0 && (
              <div className="flex gap-1 mt-4 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-700"
                  style={{
                    width: `${(approved.length / filteredSales.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-orange-400 h-full transition-all duration-700"
                  style={{
                    width: `${(pending.length / filteredSales.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-500 h-full transition-all duration-700"
                  style={{
                    width: `${(rejected.length / filteredSales.length) * 100}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sales Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                All your sales in the selected date range
              </CardDescription>
            </div>
            <Badge variant="secondary">{filteredSales.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10">
              <RefreshCw className="w-7 h-7 animate-spin text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No sales found in this period</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm font-medium">
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(sale.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {sale.paymentMethod || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#1E5BA8]">
                        {sale.totalAmount.toFixed(2)} Birr
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.status === "APPROVED"
                              ? "success"
                              : sale.status === "PENDING"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSaleDetails(sale.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Invoice: {selectedSale?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(selectedSale.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge
                    variant={
                      selectedSale.status === "APPROVED"
                        ? "success"
                        : selectedSale.status === "PENDING"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {selectedSale.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Payment</p>
                  <p className="font-medium">
                    {selectedSale.paymentMethod || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Requires Approval</p>
                  <p className="font-medium">
                    {selectedSale.requiresApproval ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* Items table */}
              <div>
                <p className="font-semibold text-sm mb-2">Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items?.map((item: SaleItem) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {item.product?.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.product?.sku}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {(item.unitPrice ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 text-sm">
                            -{(item.discount ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {(item.total ?? 0).toFixed(2)} Birr
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                {[
                  {
                    label: "Subtotal",
                    value: `${selectedSale.subtotal.toFixed(2)} Birr`,
                  },
                  {
                    label: "Discount",
                    value: `-${selectedSale.discount.toFixed(2)} Birr`,
                    red: true,
                  },
                  {
                    label: "Taxable Amount",
                    value: `${selectedSale.taxableAmount.toFixed(2)} Birr`,
                  },
                  {
                    label: "VAT (15%)",
                    value: `${selectedSale.vat.toFixed(2)} Birr`,
                  },
                ].map(({ label, value, red }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className={red ? "text-red-600 font-medium" : "font-medium"}>
                      {value}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-[#1E5BA8]">
                    {selectedSale.totalAmount.toFixed(2)} Birr
                  </span>
                </div>
              </div>

              {/* Approval info */}
              {selectedSale.approval && (
                <div className="border-t pt-3">
                  <p className="font-semibold text-sm mb-2">
                    Approval Information
                  </p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reviewed By</span>
                      <span className="font-medium">
                        {selectedSale.approvedBy?.name || "N/A"}
                      </span>
                    </div>
                    {selectedSale.approval.comment && (
                      <div>
                        <span className="text-gray-500">Comment:</span>
                        <p className="mt-1 bg-gray-50 rounded p-2 text-gray-700">
                          {selectedSale.approval.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
