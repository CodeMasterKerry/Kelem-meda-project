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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
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
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface EditFormData {
  name: string;
  description: string;
  categoryId: string;
  costPrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
  status: "ACTIVE" | "INACTIVE";
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProductsPage() {
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
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "", description: "", categoryId: "", costPrice: "",
    sellingPrice: "", lowStockThreshold: "5", status: "ACTIVE"
  });
  const [restockAmount, setRestockAmount] = useState("");
  const [restockReason, setRestockReason] = useState("Restock");
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

    const matchesFilter =
      filterStatus === "ALL"
        ? true
        : filterStatus === "LOW_STOCK"
          ? product.stockLevel <= product.lowStockThreshold
          : product.status === filterStatus;

    const matchesCategory =
      filterCategory === "ALL"
        ? true
        : product.categoryId === parseInt(filterCategory);

    return matchesSearch && matchesFilter && matchesCategory;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    lowStock: products.filter((p) => p.stockLevel <= p.lowStockThreshold)
      .length,
    outOfStock: products.filter((p) => p.stockLevel === 0).length,
  };

  const handleEdit = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId.toString(),
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      status: product.status as "ACTIVE" | "INACTIVE",
    });
    setShowEditDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
    setError(null);
  };

  const handleRestock = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setRestockAmount("");
    setRestockReason("Restock");
    setShowRestockDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
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

      if (!response.ok) throw new Error(responseData.message || "Failed to update product");

      setSuccess("Product updated successfully!");
      setShowEditDialog(false);
      if (token) fetchProducts(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
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

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || "Failed to delete product");
      }

      setSuccess("Product deleted successfully!");
      setShowDeleteDialog(false);
      if (token) fetchProducts(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockProduct = async () => {
    if (!selectedProduct || !restockAmount) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${selectedProduct.id}/adjust-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: parseInt(restockAmount),
            type: "IN",
            reason: restockReason,
          }),
        },
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || "Failed to restock product");
      }

      setSuccess("Stock adjusted successfully!");
      setShowRestockDialog(false);
      if (token) fetchProducts(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restock product");
    } finally {
      setIsSubmitting(false);
    }
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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}
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
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Loading products...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
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
                          {categories.find((c) => c.id === product.categoryId)
                            ?.name || "Uncategorized"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.sellingPrice.toLocaleString()} Birr
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              product.stockLevel <= product.lowStockThreshold
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            {product.stockLevel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              product.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                            }
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestock(product)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Restock"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
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

            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </CardContent>
        </Card>
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat">Category</Label>
              <Select
                value={editFormData.categoryId}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, categoryId: value })
                }
              >
                <SelectTrigger id="edit-cat">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value: "ACTIVE" | "INACTIVE") =>
                  setEditFormData({ ...editFormData, status: value })
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Cost Price</Label>
              <Input
                id="edit-cost"
                type="number"
                value={editFormData.costPrice}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, costPrice: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Selling Price</Label>
              <Input
                id="edit-price"
                type="number"
                value={editFormData.sellingPrice}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    sellingPrice: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProduct}
              disabled={isSubmitting}
              className="bg-[#1E5BA8]"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProduct?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add stock to {selectedProduct?.name}. Current stock: {selectedProduct?.stockLevel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restock-amount">Adjustment Amount</Label>
              <Input
                id="restock-amount"
                type="number"
                placeholder="e.g. 50"
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restock-reason">Reason</Label>
              <Input
                id="restock-reason"
                placeholder="Restock, Adjustment, etc."
                value={restockReason}
                onChange={(e) => setRestockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestockDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestockProduct}
              disabled={isSubmitting || !restockAmount}
              className="bg-[#1E5BA8]"
            >
              {isSubmitting ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
