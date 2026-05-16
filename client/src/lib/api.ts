const API_KEY_STORAGE = "prime_attendance_api_key";

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getApiKey();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Device {
  id: string;
  serialNumber: string;
  name: string | null;
  lastSeenAt: string | null;
  lastIp: string | null;
  firmware: string | null;
  online: boolean;
}

export interface AttendanceLog {
  id: string;
  deviceSn: string;
  userPin: string;
  punchedAt: string;
  status: number | null;
  verifyType: number | null;
  inOutMode: number | null;
  workCode: number | null;
  syncStatus: string;
  erpnextCheckinId: string | null;
}

export interface EmployeeMapping {
  id: string;
  userPin: string;
  employeeName: string;
  erpnextEmployeeId: string | null;
}

export interface AttendanceResponse {
  items: AttendanceLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const api = {
  health: () =>
    apiFetch<{ status: string; erpnextEnabled: boolean }>("/api/health"),
  todayStats: () =>
    apiFetch<{ punchCount: number; onlineDevices: number }>(
      "/api/attendance/stats/today"
    ),
  devices: () => apiFetch<Device[]>("/api/devices"),
  attendance: (params: URLSearchParams) =>
    apiFetch<AttendanceResponse>(`/api/attendance?${params}`),
  mappings: () => apiFetch<EmployeeMapping[]>("/api/employees/mapping"),
  saveMapping: (data: {
    userPin: string;
    employeeName: string;
    erpnextEmployeeId?: string | null;
  }) =>
    apiFetch<EmployeeMapping>("/api/employees/mapping", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteMapping: (userPin: string) =>
    apiFetch<void>(`/api/employees/mapping/${encodeURIComponent(userPin)}`, {
      method: "DELETE",
    }),
};
