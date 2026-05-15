import { create } from "zustand";

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  salesOfficerId: string;
  items: SaleItem[];
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
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

      const data = await response.json();
      set({ sales: data, isLoading: false });
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

      const newSale = await response.json();
      set((state) => ({
        sales: [...state.sales, newSale],
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

      const updatedSale = await response.json();
      set((state) => ({
        sales: state.sales.map((s) => (s.id === id ? updatedSale : s)),
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
