import { create } from "zustand";

interface Category {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

interface CategoryState {
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCategories: (token: string) => Promise<void>;
  setSelectedCategory: (category: Category | null) => void;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  fetchCategories: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const responseData = await response.json();
      set({ categories: responseData.data, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
        isLoading: false,
      });
    }
  },

  setSelectedCategory: (category: Category | null) => {
    set({ selectedCategory: category });
  },

  clearError: () => {
    set({ error: null });
  },
}));
