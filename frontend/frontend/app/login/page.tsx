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
import { Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    await login(username, password);

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
            Qelem Meda
          </h1>
          <p className="text-muted-foreground mt-2">
            Smart Inventory and Sales Management System
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
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#1E5BA8] to-[#1E5BA8] hover:from-[#164a8f] hover:to-[#164a8f] text-white font-medium shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
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
