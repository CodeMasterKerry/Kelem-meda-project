import { create } from "zustand";

export interface SaleItem {
  id?: string;
  saleId?: string;
  productId: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
  discount?: number;
  vat?: number;
  total?: number;
  product?: { name: string; sku: string };
  createdAt?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  vat: number;
  totalAmount: number;
  paymentMethod?: "CASH" | "TRANSFER" | "MOBILE";
  requiresApproval: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  preparedById: string;
  preparedBy?: { id: string; name: string };
  approvedById?: string | null;
  approvedBy?: { id: string; name: string } | null;
  salesOfficerId?: string;
  items: SaleItem[];
  approval?: {
    id: string;
    status: string;
    comment?: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface SalesState {
  sales: Sale[];
  selectedSale: Sale | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSales: (token: string) => Promise<void>;
  createSale: (sale: { items: SaleItem[] }, token: string) => Promise<void>;
  updateSaleStatus: (
    id: string,
    status: "APPROVED" | "REJECTED",
    token: string,
  ) => Promise<void>;
  setSelectedSale: (sale: Sale | null) => void;
  clearError: () => void;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  selectedSale: null,
  isLoading: false,
  error: null,

  fetchSales: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/sales", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sales");
      }

      const responseData = await response.json();
      set({ sales: responseData.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch sales",
        isLoading: false,
      });
    }
  },

  createSale: async (sale, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sale),
      });

      if (!response.ok) {
        throw new Error("Failed to create sale");
      }

      const responseData = await response.json();
      set((state) => ({
        sales: [...state.sales, responseData.data],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create sale",
        isLoading: false,
      });
    }
  },

  updateSaleStatus: async (
    id: string,
    status: "APPROVED" | "REJECTED",
    token: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `http://localhost:5000/api/sales/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update sale status");
      }

      const responseData = await response.json();
      set((state) => ({
        sales: state.sales.map((s) => (s.id === id ? responseData.data : s)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update sale status",
        isLoading: false,
      });
    }
  },

  setSelectedSale: (sale: Sale | null) => {
    set({ selectedSale: sale });
  },

  clearError: () => {
    set({ error: null });
  },
}));
