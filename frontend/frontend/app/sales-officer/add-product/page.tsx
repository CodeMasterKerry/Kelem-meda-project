"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useCategoryStore } from "@/store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

export default function AddProductPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    costPrice: "",
    sellingPrice: "",
    stockLevel: "",
    lowStockThreshold: "5",
  });

  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  useEffect(() => {
    if (token) {
      fetchCategories(token);
    }
  }, [token, fetchCategories]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Product name must be at least 3 characters";
    }

    if (!formData.categoryId) {
      errors.categoryId = "Category is required";
    }

    if (!formData.costPrice) {
      errors.costPrice = "Cost price is required";
    } else if (parseFloat(formData.costPrice) <= 0) {
      errors.costPrice = "Cost price must be greater than 0";
    }

    if (!formData.sellingPrice) {
      errors.sellingPrice = "Selling price is required";
    } else if (parseFloat(formData.sellingPrice) <= 0) {
      errors.sellingPrice = "Selling price must be greater than 0";
    } else if (
      parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)
    ) {
      errors.sellingPrice = "Selling price must be greater than cost price";
    }

    if (!formData.stockLevel) {
      errors.stockLevel = "Stock level is required";
    } else if (parseInt(formData.stockLevel) < 0) {
      errors.stockLevel = "Stock level cannot be negative";
    }

    if (!formData.lowStockThreshold) {
      errors.lowStockThreshold = "Low stock threshold is required";
    } else if (parseInt(formData.lowStockThreshold) < 0) {
      errors.lowStockThreshold = "Low stock threshold cannot be negative";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          categoryId: parseInt(formData.categoryId),
          costPrice: parseFloat(formData.costPrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          stockLevel: parseInt(formData.stockLevel),
          lowStockThreshold: parseInt(formData.lowStockThreshold),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create product");
      }

      setSuccess(true);
      setFormData({
        name: "",
        description: "",
        categoryId: "",
        costPrice: "",
        sellingPrice: "",
        stockLevel: "",
        lowStockThreshold: "5",
      });

      setTimeout(() => {
        router.push("/sales-officer/manage-products");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              Product created successfully! Redirecting...
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Information
            </CardTitle>
            <CardDescription>
              Fill in the details to add a new product to inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter product name"
                  className={validationErrors.name ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Enter product description (optional)"
                  disabled={isSubmitting}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    handleInputChange("categoryId", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={
                      validationErrors.categoryId ? "border-red-500" : ""
                    }
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.categoryId && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.categoryId}
                  </p>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">
                    Cost Price (Birr) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) =>
                      handleInputChange("costPrice", e.target.value)
                    }
                    placeholder="0.00"
                    className={
                      validationErrors.costPrice ? "border-red-500" : ""
                    }
                    disabled={isSubmitting}
                  />
                  {validationErrors.costPrice && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.costPrice}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">
                    Selling Price (Birr) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      handleInputChange("sellingPrice", e.target.value)
                    }
                    placeholder="0.00"
                    className={
                      validationErrors.sellingPrice ? "border-red-500" : ""
                    }
                    disabled={isSubmitting}
                  />
                  {validationErrors.sellingPrice && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.sellingPrice}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockLevel">
                    Initial Stock Level <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="stockLevel"
                    type="number"
                    min="0"
                    value={formData.stockLevel}
                    onChange={(e) =>
                      handleInputChange("stockLevel", e.target.value)
                    }
                    placeholder="0"
                    className={
                      validationErrors.stockLevel ? "border-red-500" : ""
                    }
                    disabled={isSubmitting}
                  />
                  {validationErrors.stockLevel && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.stockLevel}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">
                    Low Stock Threshold <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      handleInputChange("lowStockThreshold", e.target.value)
                    }
                    placeholder="5"
                    className={
                      validationErrors.lowStockThreshold ? "border-red-500" : ""
                    }
                    disabled={isSubmitting}
                  />
                  {validationErrors.lowStockThreshold && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.lowStockThreshold}
                    </p>
                  )}
                </div>
              </div>

              {/* Profit Margin Display */}
              {formData.costPrice && formData.sellingPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Profit Margin:</span>{" "}
                    {(
                      ((parseFloat(formData.sellingPrice) -
                        parseFloat(formData.costPrice)) /
                        parseFloat(formData.costPrice)) *
                      100
                    ).toFixed(2)}
                    % ({" "}
                    {(
                      parseFloat(formData.sellingPrice) -
                      parseFloat(formData.costPrice)
                    ).toFixed(2)}{" "}
                    Birr per unit)
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#1E5BA8] to-[#164a8f] hover:from-[#164a8f] hover:to-[#1E5BA8] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Product...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Create Product
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/sales-officer/manage-products")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
