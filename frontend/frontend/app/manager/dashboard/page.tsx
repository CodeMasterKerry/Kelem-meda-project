"use client";

import { useEffect } from "react";
import { useAuthStore, useProductStore, useSalesStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";

export default function ManagerDashboard() {
  const { token } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { sales, fetchSales } = useSalesStore();

  useEffect(() => {
    if (token) {
      fetchProducts(token);
      fetchSales(token);
    }
  }, [token, fetchProducts, fetchSales]);

  // Calculate statistics
  const pendingApprovals = sales.filter((sale) => sale.status === "PENDING");
  const todaySales = sales.filter((sale) => {
    const today = new Date().toDateString();
    return new Date(sale.createdAt).toDateString() === today;
  });

  const approvedSales = sales.filter((sale) => sale.status === "APPROVED");
  const totalRevenue = approvedSales.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0,
  );
  const todayRevenue = todaySales
    .filter((sale) => sale.status === "APPROVED")
    .reduce((sum, sale) => sum + sale.totalAmount, 0);

  const lowStockProducts = products.filter(
    (p) => p.stockLevel <= p.lowStockThreshold,
  );
  const outOfStockProducts = products.filter((p) => p.stockLevel === 0);

  const stats = [
    {
      title: "Total Revenue",
      value: `${totalRevenue.toFixed(2)}`,
      unit: "Birr",
      icon: DollarSign,
      description: `+${todayRevenue.toFixed(2)} today`,
      trend: "up",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Approvals",
      value: pendingApprovals.length,
      icon: AlertCircle,
      description: "Require your attention",
      trend: pendingApprovals.length > 0 ? "neutral" : "down",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Sales",
      value: sales.length,
      icon: ShoppingBag,
      description: `${todaySales.length} today`,
      trend: "up",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Low Stock Items",
      value: lowStockProducts.length,
      icon: Package,
      description: `${outOfStockProducts.length} out of stock`,
      trend: lowStockProducts.length > 0 ? "down" : "neutral",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Manager Dashboard
        </h2>
        <p className="text-gray-600">
          Here&apos;s your business overview for today.
        </p>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}
                  >
                    <stat.icon className="w-6 h-6" />
                  </div>
                  {stat.trend === "up" && (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  )}
                  {stat.trend === "down" && (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {stat.value}{" "}
                    {stat.unit && <span className="text-lg">{stat.unit}</span>}
                  </p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Approvals Alert */}
        {pendingApprovals.length > 0 && (
          <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 shadow-md mb-8">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Pending Approvals
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      You have {pendingApprovals.length} sales waiting for your
                      approval
                    </p>
                  </div>
                </div>
                <Link href="/manager/approval">
                  <Button className="bg-gradient-to-r from-[#1E5BA8] to-[#164a8f] hover:from-[#164a8f] hover:to-[#1E5BA8] text-white">
                    Review Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Sales */}
          <Card className="border-0 shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Sales</span>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </CardTitle>
              <CardDescription>
                Latest transactions across all sales officers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sales.slice(0, 6).map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-50 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          sale.status === "APPROVED"
                            ? "bg-green-100"
                            : sale.status === "PENDING"
                              ? "bg-orange-100"
                              : "bg-red-100"
                        }`}
                      >
                        {sale.status === "APPROVED" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : sale.status === "PENDING" ? (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {sale.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(sale.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {sale.totalAmount.toFixed(2)} Birr
                      </p>
                      <Badge
                        variant={
                          sale.status === "APPROVED"
                            ? "success"
                            : sale.status === "PENDING"
                              ? "warning"
                              : "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No sales recorded yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Approval Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {sales.length > 0
                        ? ((approvedSales.length / sales.length) * 100).toFixed(
                            0,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#1E5BA8] to-[#F5A623] h-2 rounded-full transition-all duration-500"
                      style={{
                        width:
                          sales.length > 0
                            ? `${(approvedSales.length / sales.length) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Stock Health</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {products.length > 0
                        ? (
                            ((products.length - lowStockProducts.length) /
                              products.length) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width:
                          products.length > 0
                            ? `${((products.length - lowStockProducts.length) / products.length) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Today&apos;s Performance
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sales Count</span>
                      <span className="font-semibold">{todaySales.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-semibold text-green-600">
                        {todayRevenue.toFixed(2)} Birr
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg. Sale Value</span>
                      <span className="font-semibold">
                        {todaySales.length > 0
                          ? (todayRevenue / todaySales.length).toFixed(2)
                          : "0.00"}{" "}
                        Birr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50/50 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Package className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Inventory Alert
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {lowStockProducts.length} products need restocking (
                      {outOfStockProducts.length} out of stock)
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                >
                  View Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
