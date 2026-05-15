"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useProductStore, useCategoryStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManagerProductsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { products, fetchProducts, isLoading } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "LOW_STOCK"
  >("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchProducts(token);
      fetchCategories(token);
    }
  }, [token, fetchProducts, fetchCategories]);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "LOW_STOCK"
          ? product.stockLevel <= product.lowStockThreshold
          : product.status === filterStatus;

    const matchesCategory =
      filterCategory === "ALL"
        ? true
        : product.categoryId === parseInt(filterCategory);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    lowStock: products.filter((p) => p.stockLevel <= p.lowStockThreshold)
      .length,
    outOfStock: products.filter((p) => p.stockLevel === 0).length,
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId.toString(),
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      status: product.status,
    });
    setShowEditDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = (product: any) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
    setError(null);
  };

  const handleUpdateProduct = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${selectedProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editFormData.name,
            description: editFormData.description || undefined,
            categoryId: parseInt(editFormData.categoryId),
            costPrice: parseFloat(editFormData.costPrice),
            sellingPrice: parseFloat(editFormData.sellingPrice),
            lowStockThreshold: parseInt(editFormData.lowStockThreshold),
            status: editFormData.status,
          }),
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to update product");
      }

      setSuccess("Product updated successfully!");
      setShowEditDialog(false);
      if (token) {
        fetchProducts(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${selectedProduct.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to delete product");
      }

      setSuccess("Product deleted successfully!");
      setShowDeleteDialog(false);
      if (token) {
        fetchProducts(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500">Manage and track product stock levels</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory List</CardTitle>
              <CardDescription>View and manage product details</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => token && fetchProducts(token)}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {product.sellingPrice.toFixed(2)} Birr
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          product.stockLevel === 0 ? "text-red-600" : 
                          product.stockLevel <= product.lowStockThreshold ? "text-orange-600" : 
                          "text-green-600"
                        }`}>
                          {product.stockLevel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "ACTIVE" ? "success" : "secondary"}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update inventory details for {selectedProduct?.name}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={editFormData.name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  value={editFormData.costPrice || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  value={editFormData.sellingPrice || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={editFormData.lowStockThreshold || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, lowStockThreshold: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct} className="bg-[#1E5BA8]">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure? This will permanently remove {selectedProduct?.name}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
