// Export all stores from a single entry point
export { useAuthStore } from "./authStore";
export { useCategoryStore } from "./categoryStore";
export { useInventoryStore } from "./inventoryStore";
export { useProductStore } from "./productStore";
export type { Product } from "./productStore";
export { useSalesStore } from "./salesStore";
export type { Sale, SaleItem } from "./salesStore";
