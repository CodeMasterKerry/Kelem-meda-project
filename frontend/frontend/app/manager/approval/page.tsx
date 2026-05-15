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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function ApprovalPage() {
  const { user, token } = useAuthStore();
  const { sales, fetchSales, isLoading } = useSalesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchSales(token);
    }
  }, [token, fetchSales]);

  const pendingSales = sales.filter((sale) => sale.status === "PENDING");

  const filteredSales = pendingSales.filter((sale) =>
    sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      setComment("");
      setError(null);
      setSuccess(null);
    } catch (error) {
      console.error("Error fetching sale details:", error);
    }
  };

  const handleApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedSale) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/sales/${selectedSale.id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            comment,
            managerId: user?.id,
          }),
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to process approval");
      }

      setSuccess(
        `Sale ${status === "APPROVED" ? "approved" : "rejected"} successfully!`,
      );

      // Refresh sales list
      if (token) {
        await fetchSales(token);
      }

      setTimeout(() => {
        setShowDetails(false);
        setSelectedSale(null);
        setComment("");
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process approval",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Approvals</h1>
          <p className="text-sm text-gray-500">Review & Approve Sales</p>
        </div>
      </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pendingSales.length}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-[#1E5BA8]">
                    {pendingSales
                      .reduce((sum, sale) => sum + sale.totalAmount, 0)
                      .toFixed(0)}{" "}
                    Birr
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Requires Approval</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingSales.filter((s) => s.requiresApproval).length}
                  </p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Sales Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Sales</CardTitle>
                <CardDescription>
                  Review and approve sales transactions
                </CardDescription>
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
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Prepared By</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Requires Approval</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Loading sales...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-500">
                          {pendingSales.length === 0
                            ? "No pending approvals"
                            : "No sales found"}
                        </p>
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
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </TableCell>
                        <TableCell>
                          {sale.preparedBy?.name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {sale.totalAmount.toFixed(2)} Birr
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sale.requiresApproval ? "warning" : "secondary"
                            }
                          >
                            {sale.requiresApproval ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewSaleDetails(sale.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {filteredSales.length} of {pendingSales.length} pending
              sales
            </div>
          </CardContent>
        </Card>

      {/* Sale Details & Approval Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Sale</DialogTitle>
            <DialogDescription>
              Invoice: {selectedSale?.invoiceNumber || "N/A"}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
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

              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">
                    {selectedSale?.createdAt ? new Date(selectedSale.createdAt).toLocaleString() : "N/A"}
                  </p>
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
                <div>
                  <p className="text-sm text-gray-600">Requires Approval</p>
                  <Badge
                    variant={
                      selectedSale?.requiresApproval ? "warning" : "secondary"
                    }
                  >
                    {selectedSale?.requiresApproval ? "Yes" : "No"}
                  </Badge>
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
                    {selectedSale?.subtotal.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    -{selectedSale?.discount.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Amount:</span>
                  <span className="font-medium">
                    {selectedSale?.taxableAmount.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT (15%):</span>
                  <span className="font-medium">
                    {selectedSale?.vat.toFixed(2)} Birr
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-[#1E5BA8]">
                    {selectedSale?.totalAmount.toFixed(2)} Birr
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Input
                  id="comment"
                  placeholder="Add a comment about this approval..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetails(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApproval("REJECTED")}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Reject"}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleApproval("APPROVED")}
              disabled={isProcessing}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
