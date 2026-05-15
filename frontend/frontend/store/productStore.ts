import { create } from "zustand";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  category?: { id: number; name: string };
  costPrice: number;
  sellingPrice: number;
  stockLevel: number;
  lowStockThreshold: number;
  status: "ACTIVE" | "INACTIVE";
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProducts: (token: string) => Promise<void>;
  addProduct: (
    product: Omit<Product, "id" | "createdAt" | "updatedAt">,
    token: string,
  ) => Promise<void>;
  updateProduct: (
    id: string,
    product: Partial<Product>,
    token: string,
  ) => Promise<void>;
  deleteProduct: (id: string, token: string) => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  clearError: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null,

  fetchProducts: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const responseData = await response.json();
      set({ products: responseData.data || [], isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch products",
        isLoading: false,
      });
    }
  },

  addProduct: async (product, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      const responseData = await response.json();
      set((state) => ({
        products: [...state.products, responseData.data],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to add product",
        isLoading: false,
      });
    }
  },

  updateProduct: async (
    id: string,
    product: Partial<Product>,
    token: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      const responseData = await response.json();
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? responseData.data : p)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update product",
        isLoading: false,
      });
    }
  },

  deleteProduct: async (id: string, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete product",
        isLoading: false,
      });
    }
  },

  setSelectedProduct: (product: Product | null) => {
    set({ selectedProduct: product });
  },

  clearError: () => {
    set({ error: null });
  },
}));
