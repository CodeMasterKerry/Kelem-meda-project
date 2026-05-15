"use client";

import * as React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  History,
  BarChart3,
  LogOut,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/sales-officer/dashboard",
  },
  {
    title: "New Sale",
    icon: PlusCircle,
    href: "/sales-officer/new-sale",
  },
  {
    title: "View Products",
    icon: Package,
    href: "/sales-officer/products",
  },
  {
    title: "My Sales",
    icon: History,
    href: "/sales-officer/my-sales",
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/sales-officer/reports",
  },
];

export function SalesOfficerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
        <Link href="/sales-officer/dashboard" className="flex items-center space-x-3">
          <div className="relative w-8 h-8 bg-gradient-to-br from-[#1E5BA8] to-[#F5A623] rounded-lg p-0.5">
            <div className="w-full h-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">
            Qelem Meda
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className={`w-full justify-start gap-3 px-4 py-6 text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-[#1E5BA8] text-white hover:bg-[#1E5BA8]/90"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Link href={item.href}>
                  <item.icon className={`w-5 h-5 ${pathname === item.href ? "text-white" : "text-gray-400"}`} />
                  {item.title}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E5BA8] to-[#F5A623] flex items-center justify-center text-white font-semibold shadow-sm">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
