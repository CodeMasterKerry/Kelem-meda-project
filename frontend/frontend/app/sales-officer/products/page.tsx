"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useProductStore } from "@/store";
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
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

export default function ProductsPage() {
  const { token } = useAuthStore();
  const { products, fetchProducts, isLoading } = useProductStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "LOW_STOCK"
  >("ALL");

  useEffect(() => {
    if (token) {
      fetchProducts(token);
    }
  }, [token, fetchProducts]);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "ALL"
        ? true
        : filterStatus === "LOW_STOCK"
          ? product.stockLevel <= product.lowStockThreshold
          : product.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    lowStock: products.filter((p) => p.stockLevel <= p.lowStockThreshold)
      .length,
    outOfStock: products.filter((p) => p.stockLevel === 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">View and manage inventory</p>
        </div>
      </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.active}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.lowStock}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.outOfStock}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>
                  Browse and search all products
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => token && fetchProducts(token)}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "ALL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("ALL")}
                  className={filterStatus === "ALL" ? "bg-[#1E5BA8]" : ""}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "ACTIVE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("ACTIVE")}
                  className={filterStatus === "ACTIVE" ? "bg-green-600" : ""}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === "LOW_STOCK" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("LOW_STOCK")}
                  className={
                    filterStatus === "LOW_STOCK" ? "bg-orange-600" : ""
                  }
                >
                  Low Stock
                </Button>
              </div>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Loading products...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-500">No products found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {product.category?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {product.sellingPrice.toFixed(2)} Birr
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              product.stockLevel === 0
                                ? "text-red-600"
                                : product.stockLevel <=
                                    product.lowStockThreshold
                                  ? "text-orange-600"
                                  : "text-green-600"
                            }`}
                          >
                            {product.stockLevel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.status === "ACTIVE"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
