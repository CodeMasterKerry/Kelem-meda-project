"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useSalesStore, useProductStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManagerAnalyticsPage() {
  const { token } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { sales, fetchSales, isLoading } = useSalesStore();

  useEffect(() => {
    if (token) {
      fetchProducts(token);
      fetchSales(token);
    }
  }, [token, fetchProducts, fetchSales]);

  const approvedSales = sales.filter((s) => s.status === "APPROVED");
  const pendingSales = sales.filter((s) => s.status === "PENDING");
  const rejectedSales = sales.filter((s) => s.status === "REJECTED");
  const totalRevenue = approvedSales.reduce((s, x) => s + x.totalAmount, 0);
  const totalVAT = approvedSales.reduce((s, x) => s + x.vat, 0);
  const totalDiscount = approvedSales.reduce((s, x) => s + x.discount, 0);
  const avgSale =
    approvedSales.length > 0 ? totalRevenue / approvedSales.length : 0;
  const approvalRate =
    sales.length > 0
      ? ((approvedSales.length / sales.length) * 100).toFixed(1)
      : "0.0";

  // Payment method breakdown
  const paymentCounts = {
    CASH: approvedSales.filter((s) => s.paymentMethod === "CASH").length,
    TRANSFER: approvedSales.filter((s) => s.paymentMethod === "TRANSFER")
      .length,
    MOBILE: approvedSales.filter((s) => s.paymentMethod === "MOBILE").length,
  };
  const totalPayments = Object.values(paymentCounts).reduce((a, b) => a + b, 0) || 1;

  // Sales by day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dailyData = last7Days.map((day) => {
    const daySales = approvedSales.filter(
      (s) => new Date(s.createdAt).toDateString() === day.toDateString(),
    );
    return {
      label: day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      count: daySales.length,
      revenue: daySales.reduce((s, x) => s + x.totalAmount, 0),
    };
  });
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);

  // Low stock items
  const lowStock = products.filter((p) => p.stockLevel <= p.lowStockThreshold && p.stockLevel > 0);
  const outOfStock = products.filter((p) => p.stockLevel === 0);

  // Status distribution bar
  const statusData = [
    { label: "Approved", count: approvedSales.length, color: "bg-green-500" },
    { label: "Pending", count: pendingSales.length, color: "bg-orange-400" },
    { label: "Rejected", count: rejectedSales.length, color: "bg-red-500" },
  ];
  const totalStatus = sales.length || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">
            Business intelligence overview
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => token && fetchSales(token)}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: `${totalRevenue.toFixed(0)} Birr`,
            sub: `${approvedSales.length} approved sales`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            title: "Avg Sale Value",
            value: `${avgSale.toFixed(2)} Birr`,
            sub: "Per approved transaction",
            icon: TrendingUp,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            title: "Approval Rate",
            value: `${approvalRate}%`,
            sub: `${sales.length} total submissions`,
            icon: CheckCircle,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            title: "VAT Collected",
            value: `${totalVAT.toFixed(0)} Birr`,
            sub: `${totalDiscount.toFixed(0)} Birr discounted`,
            icon: BarChart3,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((kpi, i) => (
          <Card
            key={i}
            className="border-0 shadow-md hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`${kpi.bg} ${kpi.color} p-2.5 rounded-lg`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-1">{kpi.title}</p>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Bar Chart (last 7 days) */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1E5BA8]" />
            Revenue — Last 7 Days
          </CardTitle>
          <CardDescription>Approved sales revenue per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-44">
            {dailyData.map((d, i) => {
              const heightPct = (d.revenue / maxRevenue) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="relative w-full flex items-end justify-center h-32">
                    <div
                      title={`${d.revenue.toFixed(0)} Birr`}
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#1E5BA8] to-[#3b82f6] transition-all duration-700 cursor-pointer group-hover:opacity-80"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 text-center leading-tight">
                    {d.label}
                  </p>
                  <p className="text-xs font-semibold text-gray-700">
                    {d.count}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-right mt-2">
            Bar height = revenue · Number below = sales count
          </p>
        </CardContent>
      </Card>

      {/* Status Distribution & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Sales Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of all {sales.length} sales by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map((s) => {
                const pct = Math.round((s.count / totalStatus) * 100);
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">
                        {s.label}
                      </span>
                      <span className="text-gray-500">
                        {s.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`${s.color} h-3 rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>
              Approved transactions by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {(["CASH", "TRANSFER", "MOBILE"] as const).map((method) => {
                const count = paymentCounts[method];
                const pct = Math.round((count / totalPayments) * 100);
                const colors: Record<string, string> = {
                  CASH: "text-green-600 bg-green-50",
                  TRANSFER: "text-blue-600 bg-blue-50",
                  MOBILE: "text-purple-600 bg-purple-50",
                };
                return (
                  <div
                    key={method}
                    className={`${colors[method]} rounded-xl p-4`}
                  >
                    <p className="text-3xl font-bold">{count}</p>
                    <p className="text-xs font-medium mt-1">{method}</p>
                    <p className="text-xs opacity-70 mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-4 h-3 rounded-full overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-700"
                style={{
                  width: `${Math.round((paymentCounts.CASH / totalPayments) * 100)}%`,
                }}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-700"
                style={{
                  width: `${Math.round((paymentCounts.TRANSFER / totalPayments) * 100)}%`,
                }}
              />
              <div
                className="bg-purple-500 h-full transition-all duration-700"
                style={{
                  width: `${Math.round((paymentCounts.MOBILE / totalPayments) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Health */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1E5BA8]" />
            Inventory Health
          </CardTitle>
          <CardDescription>
            {products.length} total products tracked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {products.filter((p) => p.stockLevel > p.lowStockThreshold)
                  .length}
              </p>
              <p className="text-sm text-green-700 font-medium mt-1">
                Healthy Stock
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {lowStock.length}
              </p>
              <p className="text-sm text-orange-700 font-medium mt-1">
                Low Stock
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-600">
                {outOfStock.length}
              </p>
              <p className="text-sm text-red-700 font-medium mt-1">
                Out of Stock
              </p>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Low Stock Items
              </p>
              {lowStock.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 bg-orange-50/60 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                  <Badge
                    variant={p.stockLevel === 0 ? "destructive" : "warning"}
                  >
                    {p.stockLevel} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
