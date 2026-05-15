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
  ShoppingCart,
  Package,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Filter,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SalesOfficerDashboard() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { sales, fetchSales } = useSalesStore();

  useEffect(() => {
    if (token) {
      fetchProducts(token);
      fetchSales(token);
    }
  }, [token, fetchProducts, fetchSales]);

  // Calculate statistics
  const todaySales = sales.filter((sale) => {
    const today = new Date().toDateString();
    return new Date(sale.createdAt).toDateString() === today;
  });

  const pendingSales = sales.filter((sale) => sale.status === "PENDING");
  const totalRevenue = todaySales
    .filter((sale) => sale.status === "APPROVED")
    .reduce((sum, sale) => sum + sale.totalAmount, 0);

  const stats = [
    {
      title: "Today's Sales",
      value: todaySales.length,
      icon: ShoppingCart,
      description: `${todaySales.filter((s) => s.status === "APPROVED").length} approved`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: `${totalRevenue.toFixed(2)} Birr`,
      icon: TrendingUp,
      description: "Today's earnings",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Approval",
      value: pendingSales.length,
      icon: Clock,
      description: "Awaiting manager",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Products Available",
      value: products.filter((p) => p.status === "ACTIVE").length,
      icon: Package,
      description: `${products.filter((p) => p.stockLevel <= p.lowStockThreshold).length} low stock`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name?.split(" ")[0]}! 👋
        </h2>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your sales today.
        </p>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                  <div
                    className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}
                  >
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quick Actions</span>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  className="h-24 bg-gradient-to-r from-[#1E5BA8] to-[#164a8f] hover:from-[#164a8f] hover:to-[#1E5BA8] text-white shadow-md hover:shadow-lg transition-all"
                  size="lg"
                  onClick={() => router.push("/sales-officer/new-sale")}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Plus className="w-6 h-6" />
                    <span className="font-semibold">New Sale</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 border-2 border-[#1E5BA8] text-[#1E5BA8] hover:bg-[#1E5BA8] hover:text-white transition-all"
                  size="lg"
                  onClick={() => router.push("/sales-officer/products")}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Search className="w-6 h-6" />
                    <span className="font-semibold">View Products</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 border-2 border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623] hover:text-white transition-all"
                  size="lg"
                  onClick={() => router.push("/sales-officer/my-sales")}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <ShoppingCart className="w-6 h-6" />
                    <span className="font-semibold">My Sales</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
                  size="lg"
                  onClick={() => router.push("/sales-officer/reports")}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Filter className="w-6 h-6" />
                    <span className="font-semibold">Reports</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sales.slice(0, 5).map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {sale.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
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
                        className="text-xs"
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No sales yet. Create your first sale!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {products.filter((p) => p.stockLevel <= p.lowStockThreshold).length >
          0 && (
          <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Low Stock Alert
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {
                      products.filter(
                        (p) => p.stockLevel <= p.lowStockThreshold,
                      ).length
                    }{" "}
                    products are running low on stock
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                    onClick={() => router.push("/sales-officer/products")}
                  >
                    View Products
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
