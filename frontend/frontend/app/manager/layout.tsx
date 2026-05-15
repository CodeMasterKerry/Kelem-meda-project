"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ManagerSidebar } from "@/components/manager-sidebar";
import { useAuthStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user && user.role !== "MANAGER") {
        router.push(user.role === "SALES_OFFICER" ? "/sales-officer/dashboard" : "/login");
      }
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated || (user && user.role !== "MANAGER")) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50/50">
        <ManagerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-20">
            <SidebarTrigger className="mr-4 md:hidden text-gray-600" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Manager Portal
              </h2>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
