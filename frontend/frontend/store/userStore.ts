import { create } from "zustand";

interface User {
  id: string;
  username: string;
  name: string;
  role: "MANAGER" | "SALES_OFFICER";
  createdAt: string;
  _count?: {
    preparedSales: number;
    approvedSales: number;
    approvals: number;
  };
}

interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: (token: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  fetchUsers: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        set({ users: data.data, isLoading: false });
      } else {
        set({ error: data.message, isLoading: false });
      }
    } catch {
      set({ error: "Failed to fetch users", isLoading: false });
    }
  },
}));
