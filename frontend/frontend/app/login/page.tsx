"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {};

    // Username validation
    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (username.trim().length > 50) {
      errors.username = "Username must not exceed 50 characters";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      errors.username =
        "Username can only contain letters, numbers, dots, hyphens, and underscores";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (password.length > 100) {
      errors.password = "Password must not exceed 100 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Trim username before sending
    await login(username.trim(), password);

    // Check if login was successful
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === "MANAGER") {
        router.push("/manager/dashboard");
      } else {
        router.push("/sales-officer/dashboard");
      }
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // Clear validation error when user starts typing
    if (validationErrors.username) {
      setValidationErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear validation error when user starts typing
    if (validationErrors.password) {
      setValidationErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24 bg-white rounded-2xl shadow-brand p-3">
              <Image
                src="/logo.png"
                alt="Qelem Meda Technologies"
                fill
                className="object-contain p-2"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1E5BA8] to-[#F5A623] bg-clip-text text-transparent">
            Qelem Meda POS
          </h1>
          <p className="text-muted-foreground mt-2">
            Smart Point of Sale System
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-brand-lg border-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="animate-in fade-in slide-in-from-top-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={isLoading}
                  className={`h-11 ${validationErrors.username ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  autoComplete="username"
                  maxLength={50}
                />
                {validationErrors.username && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className={`h-11 pr-10 ${validationErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    autoComplete="current-password"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#1E5BA8] to-[#1E5BA8] hover:from-[#164a8f] hover:to-[#164a8f] text-white font-medium shadow-md hover:shadow-lg transition-all"
                disabled={isLoading || !username.trim() || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8 animate-in fade-in duration-500 delay-300">
          © 2026 Qelem Meda Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
