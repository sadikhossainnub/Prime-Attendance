const TOKEN_KEY = "prime_attendance_token";
const USER_KEY = "prime_attendance_user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "TENANT_USER";
  tenantId: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  } | null;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isSuperAdmin(user: AuthUser | null) {
  return user?.role === "SUPER_ADMIN";
}

export function isTenantUser(user: AuthUser | null) {
  return user?.role === "TENANT_ADMIN" || user?.role === "TENANT_USER";
}
