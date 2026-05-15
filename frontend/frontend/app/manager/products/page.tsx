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
  PackagePlus,
} from "lucide-react";
// Typed interfaces for product forms
interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  costPrice: string;
  sellingPrice: string;
  stockLevel: string;
  lowStockThreshold: string;
  status?: string;
}

export default function ManagerProductsPage() {
  const { token } = useAuthStore();
  const { products, fetchProducts, isLoading } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "LOW_STOCK"
  >("ALL");

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [editFormData, setEditFormData] = useState<ProductFormData>({
    name: "", description: "", categoryId: "", costPrice: "",
    sellingPrice: "", stockLevel: "", lowStockThreshold: "5", status: "ACTIVE",
  });
  const [addFormData, setAddFormData] = useState({
    name: "", description: "", categoryId: "",
    costPrice: "", sellingPrice: "", stockLevel: "", lowStockThreshold: "5",
  });
  const [restockQty, setRestockQty] = useState("1");
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
  const filteredProducts = (products || []).filter((product) => {
    if (!product) return false;

    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === "ALL"
        ? true
        : product.categoryId === parseInt(filterCategory);

    const matchesStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "LOW_STOCK"
          ? product.stockLevel <= product.lowStockThreshold
          : product.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: (products || []).length,
    active: (products || []).filter((p) => p.status === "ACTIVE").length,
    lowStock: (products || []).filter((p) => p && p.stockLevel <= p.lowStockThreshold)
      .length,
    outOfStock: (products || []).filter((p) => p && p.stockLevel === 0).length,
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
      stockLevel: "",
      status: product.status,
    });
    setShowEditDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleRestock = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setRestockQty("1");
    setShowRestockDialog(true);
    setError(null);
  };

  const handleRestockSubmit = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(restockQty);
    if (!qty || qty < 1) { setError("Enter a valid quantity"); return; }
    setIsSubmitting(true); setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${selectedProduct.id}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: qty, type: "IN", reason: "Manager Restock" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Restock failed");
      setSuccess(`Restocked ${qty} units of ${selectedProduct.name}`);
      setShowRestockDialog(false);
      if (token) fetchProducts(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restock failed");
    } finally { setIsSubmitting(false); }
  };

  const handleAddProduct = async () => {
    if (!addFormData.name || !addFormData.categoryId || !addFormData.sellingPrice) {
      setError("Name, category and selling price are required"); return;
    }
    setIsSubmitting(true); setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: addFormData.name,
          description: addFormData.description || undefined,
          categoryId: parseInt(addFormData.categoryId),
          costPrice: parseFloat(addFormData.costPrice) || 0,
          sellingPrice: parseFloat(addFormData.sellingPrice),
          stockLevel: parseInt(addFormData.stockLevel) || 0,
          lowStockThreshold: parseInt(addFormData.lowStockThreshold) || 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create product");
      setSuccess("Product created successfully!");
      setShowAddDialog(false);
      setAddFormData({ name: "", description: "", categoryId: "", costPrice: "", sellingPrice: "", stockLevel: "", lowStockThreshold: "5" });
      if (token) fetchProducts(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
    setError(null);
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
          <p className="text-sm text-gray-500">Manage products, stock levels and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => token && fetchProducts(token)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-[#1E5BA8] hover:bg-[#164a8f]">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
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
                className={filterStatus === "LOW_STOCK" ? "bg-orange-600" : ""}
              >
                Low Stock
              </Button>
            </div>
          </div>

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
                ) : (products || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">No products available in the database.</p>
                      <p className="text-sm text-gray-400 mt-1">Try adding a new product or refreshing the list.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => token && fetchProducts(token)}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-2" />
                        Check Again
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">No products match your filters.</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter settings.</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-4 text-blue-600"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterCategory("ALL");
                          setFilterStatus("ALL");
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {categories.find(c => c.id === product.categoryId)?.name || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(product.sellingPrice || 0).toLocaleString()} Birr
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
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Restock"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </Button>
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

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Create a new product in inventory</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <Label>Product Name *</Label>
              <Input value={addFormData.name} onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })} placeholder="e.g. Laptop HP ProBook" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={addFormData.description} onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={addFormData.categoryId} onValueChange={(v) => setAddFormData({ ...addFormData, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cost Price</Label>
                <Input type="number" value={addFormData.costPrice} onChange={(e) => setAddFormData({ ...addFormData, costPrice: e.target.value })} placeholder="0.00" min="0" />
              </div>
              <div className="space-y-1">
                <Label>Selling Price *</Label>
                <Input type="number" value={addFormData.sellingPrice} onChange={(e) => setAddFormData({ ...addFormData, sellingPrice: e.target.value })} placeholder="0.00" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Initial Stock</Label>
                <Input type="number" value={addFormData.stockLevel} onChange={(e) => setAddFormData({ ...addFormData, stockLevel: e.target.value })} placeholder="0" min="0" />
              </div>
              <div className="space-y-1">
                <Label>Low Stock Alert</Label>
                <Input type="number" value={addFormData.lowStockThreshold} onChange={(e) => setAddFormData({ ...addFormData, lowStockThreshold: e.target.value })} placeholder="5" min="1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting} className="bg-[#1E5BA8]">
              {isSubmitting ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>Add stock for: <strong>{selectedProduct?.name}</strong></DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Stock: <span className="font-semibold text-gray-800">{selectedProduct?.stockLevel}</span></p>
            </div>
            <div className="space-y-1">
              <Label>Quantity to Add *</Label>
              <Input type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="e.g. 50" min="1" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestockDialog(false)}>Cancel</Button>
            <Button onClick={handleRestockSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Restocking..." : "Confirm Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
