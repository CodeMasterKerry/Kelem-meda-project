import { create } from "zustand";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
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

export const useProductStore = create<ProductState>((set, get) => ({
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

      const data = await response.json();
      set({ products: data, isLoading: false });
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

      const newProduct = await response.json();
      set((state) => ({
        products: [...state.products, newProduct],
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

      const updatedProduct = await response.json();
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
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
