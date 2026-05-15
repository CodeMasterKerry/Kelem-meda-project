"use client";

import { useEffect, useState } from "react";
import { useAuthStore, useSalesStore, type Sale, type SaleItem } from "@/store";
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
  Search,
  RefreshCw,
  Eye,
  ShoppingCart,
  Calendar,
  DollarSign,
} from "lucide-react";

export default function MySalesPage() {
  const { user, token } = useAuthStore();
  const { sales, fetchSales, isLoading } = useSalesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSales(token);
    }
  }, [token, fetchSales]);

  // Filter sales by current user
  const mySales = sales.filter((sale) => sale.preparedById === user?.id);

  // Apply search and filter
  const filteredSales = mySales.filter((sale) => {
    const matchesSearch = sale.invoiceNumber
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "ALL" ? true : sale.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: mySales.length,
    pending: mySales.filter((s) => s.status === "PENDING").length,
    approved: mySales.filter((s) => s.status === "APPROVED").length,
    rejected: mySales.filter((s) => s.status === "REJECTED").length,
    totalRevenue: mySales
      .filter((s) => s.status === "APPROVED")
      .reduce((sum, s) => sum + s.totalAmount, 0),
  };

  const viewSaleDetails = async (saleId: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/sales/${saleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sale details");
      }

      const responseData = await response.json();
      setSelectedSale(responseData.data);
      setShowDetails(true);
    } catch (error) {
      console.error("Error fetching sale details:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
          <p className="text-sm text-gray-500">Sales History & Tracking</p>
        </div>
      </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.pending}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approved}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.rejected}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-xl font-bold text-[#1E5BA8]">
                    {stats.totalRevenue.toFixed(0)} Birr
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>View and track all your sales</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => token && fetchSales(token)}
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
                  placeholder="Search by invoice number..."
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
                  variant={filterStatus === "PENDING" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("PENDING")}
                  className={filterStatus === "PENDING" ? "bg-orange-600" : ""}
                >
                  Pending
                </Button>
                <Button
                  variant={filterStatus === "APPROVED" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("APPROVED")}
                  className={filterStatus === "APPROVED" ? "bg-green-600" : ""}
                >
                  Approved
                </Button>
                <Button
                  variant={filterStatus === "REJECTED" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("REJECTED")}
                  className={filterStatus === "REJECTED" ? "bg-red-600" : ""}
                >
                  Rejected
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Loading sales...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-500">No sales found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-medium">
                          {sale.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.subtotal.toFixed(2)} Birr
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -{sale.discount.toFixed(2)} Birr
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.vat.toFixed(2)} Birr
                        </TableCell>
                        <TableCell className="text-right font-semibold">
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {filteredSales.length} of {mySales.length} sales
            </div>
          </CardContent>
        </Card>

      {/* Sale Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Invoice: {selectedSale?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">
                    {selectedSale?.createdAt ? new Date(selectedSale.createdAt).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge
                    variant={
                      selectedSale?.status === "APPROVED"
                        ? "success"
                        : selectedSale?.status === "PENDING"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {selectedSale?.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium">
                    {selectedSale?.paymentMethod || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prepared By</p>
                  <p className="font-medium">
                    {selectedSale?.preparedBy?.name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items</h3>
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
                      {selectedSale?.items?.map((item: SaleItem) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.product?.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.product?.sku}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {(item.unitPrice ?? 0).toFixed(2)} Birr
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{(item.discount ?? 0).toFixed(2)} Birr
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {(item.total ?? 0).toFixed(2)} Birr
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {selectedSale?.subtotal?.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    -{selectedSale?.discount?.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Amount:</span>
                  <span className="font-medium">
                    {selectedSale?.taxableAmount?.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT (15%):</span>
                  <span className="font-medium">
                    {selectedSale?.vat?.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-[#1E5BA8]">
                    {selectedSale?.totalAmount?.toFixed(2)} Birr
                  </span>
                </div>
              </div>

              {/* Approval Info */}
              {selectedSale?.approval && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Approval Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved By:</span>
                      <span className="font-medium">
                        {selectedSale?.approvedBy?.name || "N/A"}
                      </span>
                    </div>
                    {selectedSale?.approval?.comment && (
                      <div>
                        <span className="text-gray-600">Comment:</span>
                        <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                          {selectedSale?.approval?.comment}
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
