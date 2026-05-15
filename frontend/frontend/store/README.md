# Zustand Store Usage Guide

This project uses Zustand for state management. Below are examples of how to use each store.

## Auth Store

```tsx
import { useAuthStore } from "@/store";

function LoginComponent() {
  const { login, logout, user, isAuthenticated, isLoading, error } =
    useAuthStore();

  const handleLogin = async () => {
    await login("user@example.com", "password");
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Product Store

```tsx
import { useProductStore } from "@/store";
import { useAuthStore } from "@/store";
import { useEffect } from "react";

function ProductList() {
  const { products, fetchProducts, addProduct, isLoading, error } =
    useProductStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchProducts(token);
    }
  }, [token]);

  const handleAddProduct = async () => {
    if (token) {
      await addProduct(
        {
          name: "New Product",
          price: 99.99,
          stock: 100,
          description: "Product description",
        },
        token,
      );
    }
  };

  return (
    <div>
      <button onClick={handleAddProduct}>Add Product</button>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} - ${product.price}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Sales Store

```tsx
import { useSalesStore } from "@/store";
import { useAuthStore } from "@/store";
import { useEffect } from "react";

function SalesList() {
  const { sales, fetchSales, updateSaleStatus, isLoading, error } =
    useSalesStore();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchSales(token);
    }
  }, [token]);

  const handleApprove = async (saleId: string) => {
    if (token) {
      await updateSaleStatus(saleId, "APPROVED", token);
    }
  };

  return (
    <div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {sales.map((sale) => (
            <li key={sale.id}>
              Sale #{sale.id} - ${sale.totalAmount} - {sale.status}
              {user?.role === "MANAGER" && sale.status === "PENDING" && (
                <button onClick={() => handleApprove(sale.id)}>Approve</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Store Features

### Auth Store

- Persists to localStorage automatically
- Stores user info, token, and authentication state
- Actions: `login`, `logout`, `setUser`, `setToken`, `clearError`

### Product Store

- Manages product CRUD operations
- Actions: `fetchProducts`, `addProduct`, `updateProduct`, `deleteProduct`, `setSelectedProduct`, `clearError`

### Sales Store

- Manages sales and approval workflow
- Actions: `fetchSales`, `createSale`, `updateSaleStatus`, `setSelectedSale`, `clearError`

## Best Practices

1. **Always check for token before API calls**

   ```tsx
   const { token } = useAuthStore();
   if (token) {
     await fetchProducts(token);
   }
   ```

2. **Handle errors gracefully**

   ```tsx
   const { error, clearError } = useProductStore();

   useEffect(() => {
     if (error) {
       // Show toast or notification
       clearError();
     }
   }, [error]);
   ```

3. **Use loading states for better UX**

   ```tsx
   const { isLoading } = useProductStore();

   if (isLoading) return <Spinner />;
   ```

4. **Selective subscriptions for performance**
   ```tsx
   // Only subscribe to what you need
   const products = useProductStore((state) => state.products);
   const addProduct = useProductStore((state) => state.addProduct);
   ```
