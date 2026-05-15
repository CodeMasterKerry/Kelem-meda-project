"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Plus,
  List,
  Warehouse,
  FileText,
  CheckSquare,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const salesOfficerMenuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/sales-officer/dashboard",
    },
    {
      icon: ShoppingCart,
      label: "New Sale",
      path: "/sales-officer/new-sale",
    },
    {
      icon: FileText,
      label: "My Sales",
      path: "/sales-officer/my-sales",
    },
    {
      icon: Plus,
      label: "Add Product",
      path: "/sales-officer/add-product",
    },
    {
      icon: List,
      label: "Manage Products",
      path: "/sales-officer/manage-products",
    },
    {
      icon: Package,
      label: "Products",
      path: "/sales-officer/products",
    },
    {
      icon: Warehouse,
      label: "Inventory",
      path: "/sales-officer/inventory",
    },
  ];

  const managerMenuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/manager/dashboard",
    },
    {
      icon: CheckSquare,
      label: "Approvals",
      path: "/manager/approval",
    },
    {
      icon: BarChart3,
      label: "Reports",
      path: "/manager/reports",
    },
    {
      icon: Package,
      label: "Products",
      path: "/manager/products",
    },
    {
      icon: Warehouse,
      label: "Inventory",
      path: "/manager/inventory",
    },
  ];

  const menuItems =
    user?.role === "MANAGER" ? managerMenuItems : salesOfficerMenuItems;

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-base font-bold text-gray-900">Qelem Meda</h1>
                <p className="text-[10px] text-gray-500">POS System</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-orange-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E5BA8] to-[#F5A623] flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      isActive(item.path)
                        ? "bg-gradient-to-r from-[#1E5BA8] to-[#164a8f] text-white hover:from-[#164a8f] hover:to-[#1E5BA8] hover:text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => {
                      router.push(item.path);
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
