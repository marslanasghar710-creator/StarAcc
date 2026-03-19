import { Bell, BookOpenText, Building2, ChartColumnBig, CreditCard, FileText, HandCoins, Landmark, LayoutGrid, Receipt, Settings, ShieldCheck, Users } from "lucide-react";

import type { NavItem } from "@/types";

export const navigationItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", description: "Workspace overview", group: "Overview", icon: LayoutGrid },
  { title: "Chart of Accounts", href: "/accounts", description: "General ledger structure", group: "Accounting", icon: Landmark, requiredPermissions: ["accounts.read"] },
  { title: "Journals", href: "/journals", description: "Manual journal entries", group: "Accounting", icon: BookOpenText, requiredPermissions: ["journals.read"] },
  { title: "Customers", href: "/customers", description: "Receivables contacts", group: "Sales", icon: Users, requiredPermissions: ["customers.read"] },
  { title: "Invoices", href: "/invoices", description: "Sales documents", group: "Sales", icon: FileText, requiredPermissions: ["invoices.read"] },
  { title: "Customer Payments", href: "/customer-payments", description: "Incoming receipts", group: "Sales", icon: HandCoins, requiredPermissions: ["customer_payments.read"] },
  { title: "Suppliers", href: "/suppliers", description: "Payables contacts", group: "Purchases", icon: Building2, requiredPermissions: ["suppliers.read"] },
  { title: "Bills", href: "/bills", description: "Purchase documents", group: "Purchases", icon: Receipt, requiredPermissions: ["bills.read"] },
  { title: "Supplier Payments", href: "/supplier-payments", description: "Outgoing payments", group: "Purchases", icon: CreditCard, requiredPermissions: ["supplier_payments.read"] },
  { title: "Banking", href: "/banking", description: "Cash and bank feeds", group: "Banking", icon: Landmark, requiredPermissions: ["bank_transactions.read", "bank_accounts.read"] },
  { title: "Reports", href: "/reports", description: "Financial reporting hub", group: "Insights", icon: ChartColumnBig, requiredPermissions: ["reports.profit_loss.read", "reports.balance_sheet.read", "reports.trial_balance.read"] },
  { title: "Tax", href: "/tax", description: "Tax center and filings", group: "Insights", icon: ShieldCheck, requiredPermissions: ["tax.settings.read", "tax_reports.read"] },
  { title: "Settings", href: "/settings", description: "Operational controls", group: "Administration", icon: Settings, requiredPermissions: ["settings.read", "branding.read", "numbering.read"] },
  { title: "Notifications", href: "/notifications", description: "Alerts and inbox", group: "Administration", icon: Bell, requiredPermissions: ["notifications.read"] },
];
