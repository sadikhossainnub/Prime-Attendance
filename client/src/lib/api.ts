import { getToken, clearSession, type AuthUser } from "./auth";

/**
 * Enhanced API fetch with proper error handling and type safety
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const err = await res.json();
      errorMessage = (err as { error?: string }).error ?? res.statusText;
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (data: {
    companyName: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
    contactEmail?: string;
  }) =>
    apiFetch<{ token: string; user: AuthUser }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<AuthUser & { tenant?: AuthUser["tenant"] & { deviceProvisionKey?: string } }>("/api/auth/me"),
};

export const adminApi = {
  stats: () => apiFetch<{
    tenantCount: number;
    deviceCount: number;
    punchToday: number;
    userCount: number;
    recentTenants: TenantRow[];
  }>("/api/admin/stats"),
  tenants: (page?: number, limit?: number) => apiFetch<{
    items: TenantRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/api/admin/tenants?page=${page ?? 1}&limit=${limit ?? 20}`),
  tenant: (id: string) => apiFetch<TenantDetail>(`/api/admin/tenants/${id}`),
  createTenant: (data: CreateTenantInput) =>
    apiFetch<TenantDetail>("/api/admin/tenants", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTenant: (id: string, data: Partial<TenantRow>) =>
    apiFetch<TenantRow>(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  rotateKey: (id: string) =>
    apiFetch<{ deviceProvisionKey: string }>(
      `/api/admin/tenants/${id}/rotate-provision-key`,
      { method: "POST" }
    ),
  addUser: (tenantId: string, data: { email: string; password: string; name: string }) =>
    apiFetch(`/api/admin/tenants/${tenantId}/users`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  syncEmployees: (tenantId: string) =>
    apiFetch<{ message: string; synced: number; skipped: number; errors: string[] }>(
      `/api/admin/tenants/${tenantId}/sync-employees`,
      { method: "POST" }
    ),
  getAccessToken: (tenantId: string, userId?: string) =>
    apiFetch<{ token: string; user: { id: string; email: string; name: string; role: string }; tenant: { id: string; slug: string }; message: string }>(
      `/api/admin/tenants/${tenantId}/access-token`,
      { method: "POST", body: JSON.stringify({ userId }) }
    ),
};

export const portalApi = {
  dashboard: () => apiFetch<PortalDashboard>("/api/portal/dashboard"),
  devices: () => apiFetch<Device[]>("/api/portal/devices"),
  addDevice: (serialNumber: string, name?: string) =>
    apiFetch<Device>("/api/portal/devices", {
      method: "POST",
      body: JSON.stringify({ serialNumber, name }),
    }),
  deleteDevice: (sn: string) =>
    apiFetch<void>(`/api/portal/devices/${encodeURIComponent(sn)}`, {
      method: "DELETE",
    }),
  attendance: (params: URLSearchParams) =>
    apiFetch<AttendanceResponse>(`/api/portal/attendance?${params}`),
  syncRetry: () => apiFetch<{ message: string; count: number }>("/api/portal/sync-retry", { method: "POST" }),
  rawEvents: (limit?: number) => apiFetch<DeviceRawEvent[]>(`/api/portal/raw-events?limit=${limit ?? 50}`),
  mappings: () => apiFetch<EmployeeMapping[]>("/api/portal/employees/mapping"),
  saveMapping: (data: {
    userPin: string;
    employeeName: string;
    erpnextEmployeeId?: string | null;
  }) =>
    apiFetch<EmployeeMapping>("/api/portal/employees/mapping", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteMapping: (pin: string) =>
    apiFetch<void>(`/api/portal/employees/mapping/${encodeURIComponent(pin)}`, {
      method: "DELETE",
    }),
  settings: () => apiFetch<TenantSettings>("/api/portal/settings"),
  updateErpnextConfig: (config: {
    enabled: boolean;
    url: string;
    apiKey: string;
    apiSecret: string;
  }) =>
    apiFetch<TenantSettings>("/api/portal/settings/erpnext", {
      method: "PATCH",
      body: JSON.stringify(config),
    }),
  // bKash Payment
  initiateBkashPayment: (amount: number, invoiceId: string) =>
    apiFetch<{ paymentURL: string; paymentID: string }>("/api/portal/payment/bkash/initiate", {
      method: "POST",
      body: JSON.stringify({ amount, invoiceId }),
    }),
  executeBkashPayment: (paymentID: string, trxID: string) =>
    apiFetch<{ transactionStatus: string; trxID: string }>("/api/portal/payment/bkash/execute", {
      method: "POST",
      body: JSON.stringify({ paymentID, trxID }),
    }),
  queryBkashPayment: (paymentID: string) =>
    apiFetch<{ transactionStatus: string; amount: number; trxID: string }>("/api/portal/payment/bkash/query", {
      method: "POST",
      body: JSON.stringify({ paymentID }),
    }),
};

// Type definitions
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  contactEmail: string | null;
  createdAt: string;
  _count: { devices: number; users: number; attendanceLogs: number };
}

export interface TenantDetail extends TenantRow {
  deviceProvisionKey: string;
  users: { id: string; email: string; name: string; role: string; isActive?: boolean }[];
  devices: Device[];
  contactPhone?: string | null;
  erpnextEnabled?: boolean;
  erpnextUrl?: string | null;
  erpnextApiKey?: string | null;
  erpnextApiSecret?: string | null;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: string;
  contactEmail?: string;
}

export interface Device {
  id: string;
  serialNumber: string;
  name: string | null;
  lastSeenAt: string | null;
  lastIp: string | null;
  firmware?: string | null;
  online?: boolean;
}

export interface AttendanceLog {
  id: string;
  deviceSn: string;
  userPin: string;
  punchedAt: string;
  inOutMode: number | null;
  syncStatus: string;
  employeeName?: string | null;
}

export interface AttendanceResponse {
  items: AttendanceLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmployeeMapping {
  id: string;
  userPin: string;
  employeeName: string;
  erpnextEmployeeId: string | null;
}

export interface DeviceRawEvent {
  id: string;
  tenantId?: string;
  deviceSn?: string;
  method: string;
  path: string;
  query?: string;
  bodyPreview?: string;
  createdAt: string;
}

export interface PortalDashboard {
  punchToday: number;
  onlineDevices: number;
  totalDevices: number;
  totalEmployees: number;
  recentPunches: AttendanceLog[];
  erpnextEnabled: boolean;
}

export interface TenantSettings {
  id: string;
  slug: string;
  name: string;
  deviceProvisionKey: string;
  plan: string;
  status: string;
  contactEmail: string | null;
  // ERPNext fields
  erpnextEnabled?: boolean;
  erpnextUrl?: string | null;
  erpnextApiKey?: string | null;
  erpnextApiSecret?: string | null;
}

export interface BkashPaymentInitiate {
  paymentURL: string;
  paymentID: string;
}

export interface BkashPaymentExecute {
  transactionStatus: string;
  trxID: string;
}

export interface BkashPaymentQuery {
  transactionStatus: string;
  amount: number;
  trxID: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: "STARTER" | "BUSINESS" | "ENTERPRISE";
  billingCycle: "MONTHLY" | "YEARLY";
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  amount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string;
  autoRenew: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricingTier {
  monthly: number;
  yearly: number;
}

export interface PricingInfo {
  STARTER: PricingTier;
  BUSINESS: PricingTier;
  ENTERPRISE: PricingTier;
}

export const billingApi = {
  getSubscription: () =>
    apiFetch<Subscription>("/api/billing/subscription"),
  createSubscription: (plan: "STARTER" | "BUSINESS" | "ENTERPRISE", billingCycle: "MONTHLY" | "YEARLY") =>
    apiFetch<{ subscription: Subscription; invoice: Invoice }>("/api/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ plan, billingCycle }),
    }),
  getInvoices: (limit?: number) =>
    apiFetch<Invoice[]>(`/api/billing/invoices?limit=${limit ?? 20}`),
  getInvoice: (id: string) =>
    apiFetch<Invoice>(`/api/billing/invoices/${id}`),
  markInvoiceAsPaid: (id: string, paymentId: string) =>
    apiFetch<Invoice>(`/api/billing/invoices/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentId }),
    }),
  cancelSubscription: (reason?: string) =>
    apiFetch<Subscription>("/api/billing/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  getPricing: () =>
    apiFetch<PricingInfo>("/api/billing/pricing"),
  upgradePlan: (newPlan: "STARTER" | "BUSINESS" | "ENTERPRISE") =>
    apiFetch<{ subscription: Subscription; proratedAmount: number; message: string }>("/api/billing/subscription/upgrade", {
      method: "POST",
      body: JSON.stringify({ newPlan }),
    }),
};
