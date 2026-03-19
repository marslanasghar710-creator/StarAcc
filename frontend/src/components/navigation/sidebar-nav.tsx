"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenText, Building2, ChartColumnBig, CreditCard, FileText, HandCoins, Landmark, LayoutGrid, Receipt, Settings, ShieldCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const navigation: Array<NavItem & { icon: ComponentType<{ className?: string }> }> = [
  { title: "Dashboard", href: "/dashboard", description: "Workspace overview", icon: LayoutGrid },
  { title: "Accounts", href: "/accounts", description: "Chart of accounts", icon: Landmark },
  { title: "Journals", href: "/journals", description: "Manual journals", icon: BookOpenText },
  { title: "Customers", href: "/customers", description: "Receivables contacts", icon: Users },
  { title: "Invoices", href: "/invoices", description: "Sales documents", icon: FileText },
  { title: "Customer Payments", href: "/customer-payments", description: "Incoming receipts", icon: HandCoins },
  { title: "Suppliers", href: "/suppliers", description: "Payables contacts", icon: Building2 },
  { title: "Bills", href: "/bills", description: "Purchase documents", icon: Receipt },
  { title: "Supplier Payments", href: "/supplier-payments", description: "Outgoing payments", icon: CreditCard },
  { title: "Banking", href: "/banking", description: "Bank feed hub", icon: Landmark },
  { title: "Reports", href: "/reports", description: "Financial reporting", icon: ChartColumnBig },
  { title: "Tax", href: "/tax", description: "Sales tax center", icon: ShieldCheck },
  { title: "Settings", href: "/settings", description: "Operational controls", icon: Settings },
  { title: "Notifications", href: "/notifications", description: "Inbox and alerts", icon: Bell },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {navigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
            <span className="space-y-0.5">
              <span className="block font-medium">{item.title}</span>
              <span className={cn("block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
