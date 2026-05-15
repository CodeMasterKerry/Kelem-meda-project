import { create } from "zustand";

interface InventoryTransaction {
  id: string;
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockLevel: number;
  };
}

interface InventorySummary {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockUnits: number;
  recentTransactions: InventoryTransaction[];
}

interface InventoryState {
  transactions: InventoryTransaction[];
  summary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTransactions: (token: string, filters?: any) => Promise<void>;
  fetchSummary: (token: string) => Promise<void>;
  addStock: (
    productId: string,
    quantity: number,
    reason: string,
    token: string,
  ) => Promise<void>;
  reduceStock: (
    productId: string,
    quantity: number,
    reason: string,
    token: string,
  ) => Promise<void>;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  transactions: [],
  summary: null,
  isLoading: false,
  error: null,

  fetchTransactions: async (token: string, filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (filters?.productId)
        queryParams.append("productId", filters.productId);
      if (filters?.type) queryParams.append("type", filters.type);
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());

      const response = await fetch(
        `http://localhost:5000/api/inventory?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const responseData = await response.json();
      set({ transactions: responseData.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions",
        isLoading: false,
      });
    }
  },

  fetchSummary: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        "http://localhost:5000/api/inventory/summary",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory summary");
      }

      const responseData = await response.json();
      set({ summary: responseData.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inventory summary",
        isLoading: false,
      });
    }
  },

  addStock: async (
    productId: string,
    quantity: number,
    reason: string,
    token: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          type: "IN",
          quantity,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add stock");
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add stock",
        isLoading: false,
      });
      throw error;
    }
  },

  reduceStock: async (
    productId: string,
    quantity: number,
    reason: string,
    token: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          type: "OUT",
          quantity,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reduce stock");
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to reduce stock",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
