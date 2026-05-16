import { getToken, clearSession, type AuthUser } from "./auth";

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
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
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
  me: () => apiFetch<AuthUser & { tenant?: AuthUser["tenant"] & { deviceProvisionKey?: string } }>("/api/auth/me"),
};

export const adminApi = {
  stats: () => apiFetch<{
    tenantCount: number;
    deviceCount: number;
    punchToday: number;
    userCount: number;
    recentTenants: unknown[];
  }>("/api/admin/stats"),
  tenants: () => apiFetch<TenantRow[]>("/api/admin/tenants"),
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
};

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
  users: { id: string; email: string; name: string; role: string }[];
  devices: Device[];
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
  online?: boolean;
}

export interface AttendanceLog {
  id: string;
  deviceSn: string;
  userPin: string;
  punchedAt: string;
  inOutMode: number | null;
  syncStatus: string;
}

export interface AttendanceResponse {
  items: AttendanceLog[];
  total: number;
  page: number;
  limit: number;
}

export interface EmployeeMapping {
  id: string;
  userPin: string;
  employeeName: string;
  erpnextEmployeeId: string | null;
}

export interface PortalDashboard {
  punchToday: number;
  onlineDevices: number;
  totalDevices: number;
  totalEmployees: number;
  recentPunches: AttendanceLog[];
}

export interface TenantSettings {
  slug: string;
  name: string;
  deviceProvisionKey: string;
  plan: string;
  status: string;
}
