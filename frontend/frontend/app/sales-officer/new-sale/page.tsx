"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useProductStore, type Product } from "@/store";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  discountPercent: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const {
    products,
    fetchProducts,
    isLoading: productsLoading,
    error: productsError,
  } = useProductStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "TRANSFER" | "MOBILE"
  >("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      if (useAuthStore.persist.hasHydrated()) {
        // Defer to avoid cascading render warning
        Promise.resolve().then(() => setHydrated(true));
      }
    };

    const unsub = useAuthStore.persist.onFinishHydration(checkHydration);
    
    // Check once on mount
    checkHydration();

    return () => unsub();
  }, []);

  useEffect(() => {
    if (hydrated && token) {
      fetchProducts(token);
    }
  }, [hydrated, token, fetchProducts]);

  const filteredProducts = products.filter(
    (product) =>
      product.status === "ACTIVE" &&
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stockLevel) {
        setCart(
          cart.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      }
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          product,
          quantity: 1,
          discountPercent: 0,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find((item) => item.productId === productId);
    if (item && newQuantity > 0 && newQuantity <= item.product.stockLevel) {
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: newQuantity }
            : item,
        ),
      );
    }
  };

  const updateDiscount = (productId: string, discount: number) => {
    if (discount >= 0 && discount <= 100) {
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? { ...item, discountPercent: discount }
            : item,
        ),
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const calculateItemTotal = (item: CartItem) => {
    const subtotal = item.quantity * item.product.sellingPrice;
    const discount = (subtotal * item.discountPercent) / 100;
    const taxableAmount = subtotal - discount;
    const vat = taxableAmount * 0.15;
    const total = taxableAmount + vat;
    return { subtotal, discount, vat, total };
  };

  const calculateCartTotal = () => {
    let subtotal = 0;
    let discount = 0;
    let vat = 0;
    let total = 0;

    cart.forEach((item) => {
      const itemTotals = calculateItemTotal(item);
      subtotal += itemTotals.subtotal;
      discount += itemTotals.discount;
      vat += itemTotals.vat;
      total += itemTotals.total;
    });

    return { subtotal, discount, vat, total };
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError("Please add items to the cart");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const saleData = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountPercent: item.discountPercent,
        })),
        paymentMethod,
        preparedById: user?.id,
      };

      const response = await fetch("http://localhost:5000/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create sale");
      }

      setSuccess(true);
      setCart([]);

      // Refresh products to update stock levels
      if (token) {
        fetchProducts(token);
      }

      setTimeout(() => {
        router.push("/sales-officer/my-sales");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateCartTotal();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
          <p className="text-sm text-gray-500">
            Create a new sales transaction
          </p>
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
            Sale created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Backend connection error */}
      {productsError && !productsLoading && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Could not load products: {productsError}. Is the backend server
            running on port 5000?
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
              <CardDescription>Search and add products to cart</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search + Refresh row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => token && fetchProducts(token)}
                  disabled={productsLoading}
                  className="flex items-center gap-2 shrink-0"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${productsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>

              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            <p className="text-sm">Loading products...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <p className="text-gray-500">
                            {products.length === 0
                              ? "No products found. Make sure the backend is running."
                              : "No matching products found."}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.sku}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {product.sellingPrice.toFixed(2)} Birr
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                product.stockLevel === 0
                                  ? "destructive"
                                  : product.stockLevel <=
                                      product.lowStockThreshold
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {product.stockLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => addToCart(product)}
                              disabled={
                                product.stockLevel === 0 ||
                                cart.find(
                                  (item) => item.productId === product.id,
                                )?.quantity === product.stockLevel
                              }
                              className="bg-[#1E5BA8] hover:bg-[#164a8f] disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              {product.stockLevel === 0
                                ? "Out of Stock"
                                : "Add"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-md sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cart</span>
                <Badge variant="secondary">{cart.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 text-sm">Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemTotal = calculateItemTotal(item);
                    return (
                      <div
                        key={item.productId}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.product.sellingPrice.toFixed(2)} Birr
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.productId,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="h-8 w-16 text-center"
                            min={1}
                            max={item.product.stockLevel}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.product.stockLevel}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Label className="text-xs">Discount %:</Label>
                          <Input
                            type="number"
                            value={item.discountPercent}
                            onChange={(e) =>
                              updateDiscount(
                                item.productId,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 w-20 text-sm"
                            min={0}
                            max={100}
                            step={0.1}
                          />
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#1E5BA8]">
                            {itemTotal.total.toFixed(2)} Birr
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t pt-4 space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        {totals.subtotal.toFixed(2)} Birr
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        -{totals.discount.toFixed(2)} Birr
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT (15%):</span>
                      <span className="font-medium">
                        {totals.vat.toFixed(2)} Birr
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-[#1E5BA8]">
                        {totals.total.toFixed(2)} Birr
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm mb-2 block">
                        Payment Method
                      </Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(
                          value: "CASH" | "TRANSFER" | "MOBILE",
                        ) => setPaymentMethod(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="TRANSFER">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="MOBILE">Mobile Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-[#1E5BA8] to-[#164a8f] hover:from-[#164a8f] hover:to-[#1E5BA8] text-white"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : "Complete Sale"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
