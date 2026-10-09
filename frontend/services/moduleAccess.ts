export const APP_MODULES = [
  { key: "dashboard", label: "Dashboard", description: "Overview and summary", href: "/dashboard" },
  { key: "customers", label: "Customer", description: "Add Customer and Customer List", href: "/customer-list" },
  { key: "transactions", label: "Transaction", description: "Transactions and passbooks", href: "/transaction" },
  { key: "collections", label: "Collection", description: "Today, Monthly and Overall Collections", href: "/today-collection" },
  { key: "settings", label: "Settings", description: "Profile and account settings", href: "/settings" },
] as const;

export type AppModuleKey = (typeof APP_MODULES)[number]["key"];

export const ALL_APP_MODULE_KEYS = APP_MODULES.map(({ key }) => key) as AppModuleKey[];

export function normalizeVisibleModules(value: unknown): AppModuleKey[] {
  if (!Array.isArray(value)) return [...ALL_APP_MODULE_KEYS];
  return APP_MODULES
    .filter(({ key }) => value.includes(key))
    .map(({ key }) => key);
}

export function getModuleLabel(key: string): string {
  return APP_MODULES.find((module) => module.key === key)?.label ?? key;
}
