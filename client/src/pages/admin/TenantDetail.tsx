import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, type TenantDetail } from "../../lib/api";
import { Card } from "../../components/Card";

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "devices" | "settings">("overview");
  const [showAddUser, setShowAddUser] = useState(false);
  const [syncingEmployees, setSyncingEmployees] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number; errors: string[] } | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });

  const loadTenant = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.tenant(id);
      setTenant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [id]);

  const handleSuspend = async () => {
    if (!tenant) return;
    try {
      await adminApi.updateTenant(tenant.id, {
        status: tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
      } as Parameters<typeof adminApi.updateTenant>[1]);
      await loadTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleRotateKey = async () => {
    if (!tenant) return;
    try {
      await adminApi.rotateKey(tenant.id);
      await loadTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate key");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !newUser.name || !newUser.email || !newUser.password) return;
    try {
      await adminApi.addUser(tenant.id, newUser);
      setNewUser({ name: "", email: "", password: "" });
      setShowAddUser(false);
      await loadTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    }
  };

  const handleAccessAsClient = async () => {
    if (!tenant) return;
    try {
      const result = await adminApi.getAccessToken(tenant.id);
      // Store token and redirect to portal
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      window.location.href = "/portal";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get access token");
    }
  };

  const handleSyncEmployees = async () => {
    if (!tenant) return;
    try {
      setSyncingEmployees(true);
      setError(null);
      const result = await adminApi.syncEmployees(tenant.id);
      setSyncResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync employees");
    } finally {
      setSyncingEmployees(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading tenant details...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Link to="/admin/tenants" className="text-sm text-indigo-400 hover:underline">← Back to Clients</Link>
        <div className="p-6 bg-red-900/20 border border-red-800 rounded-lg text-red-300">Tenant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <Link to="/admin/tenants" className="text-sm text-indigo-400 hover:underline mb-2 block">← Back to Clients</Link>
          <h1 className="text-3xl font-bold text-white">{tenant.name}</h1>
          <p className="text-slate-400 font-mono text-sm mt-1">{tenant.slug}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleAccessAsClient}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold text-white transition"
          >
            Access as Client
          </button>
          <button
            onClick={handleSuspend}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tenant.status === "SUSPENDED"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            {tenant.status === "SUSPENDED" ? "Activate" : "Suspend"}
          </button>
          <button
            onClick={handleRotateKey}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition"
          >
            Rotate Key
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Status" value={tenant.status} />
        <Card title="Plan" value={tenant.plan} />
        <Card title="Devices" value={tenant.devices.length} />
        <Card title="Users" value={tenant.users.length} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        {(["overview", "users", "devices", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold text-sm transition capitalize ${
              activeTab === tab
                ? "text-white border-b-2 border-indigo-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Provision Key */}
          <Card className="border border-slate-700">
            <div className="p-6">
              <h3 className="font-semibold text-white mb-3">Provision Key (Device Setup)</h3>
              <code className="block p-3 rounded-lg bg-slate-900 text-amber-300 text-xs break-all mb-3 font-mono">
                {tenant.deviceProvisionKey}
              </code>
              <p className="text-slate-400 text-xs mb-2">Device URL query:</p>
              <code className="block p-2 rounded-lg bg-slate-900 text-slate-300 text-xs break-all font-mono">
                ?tenant={tenant.slug}&key={tenant.deviceProvisionKey}
              </code>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/50">
              <div className="p-4">
                <p className="text-slate-400 text-sm">Total Attendance Logs</p>
                <p className="text-2xl font-bold text-white mt-2">{tenant._count.attendanceLogs}</p>
              </div>
            </Card>
            <Card className="bg-slate-800/50">
              <div className="p-4">
                <p className="text-slate-400 text-sm">Contact Email</p>
                <p className="text-white mt-2 break-all">{tenant.contactEmail || "Not set"}</p>
              </div>
            </Card>
            <Card className="bg-slate-800/50">
              <div className="p-4">
                <p className="text-slate-400 text-sm">Contact Phone</p>
                <p className="text-white mt-2">{tenant.contactPhone || "Not set"}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Users</h3>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition"
            >
              {showAddUser ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {showAddUser && (
            <Card className="border-indigo-500">
              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
                >
                  Create User
                </button>
              </form>
            </Card>
          )}

          {tenant.users.length === 0 ? (
            <Card className="bg-slate-800/50">
              <div className="p-6 text-center text-slate-400">No users yet</div>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left p-3 text-slate-400">Name</th>
                    <th className="text-left p-3 text-slate-400">Email</th>
                    <th className="text-left p-3 text-slate-400">Role</th>
                    <th className="text-left p-3 text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                      <td className="p-3 text-white">{user.name}</td>
                      <td className="p-3 text-slate-300 font-mono text-xs break-all">{user.email}</td>
                      <td className="p-3 text-slate-300">
                        <span className="px-2 py-1 rounded text-xs bg-slate-800">
                          {user.role === "TENANT_ADMIN" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${user.isActive ? "bg-green-900/40 text-green-300" : "bg-slate-800 text-slate-400"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === "devices" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Devices ({tenant.devices.length})</h3>
          {tenant.devices.length === 0 ? (
            <Card className="bg-slate-800/50">
              <div className="p-6 text-center text-slate-400">No devices connected yet</div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenant.devices.map((device) => (
                <Card key={device.id} className="border border-slate-700">
                  <div className="p-4">
                    <h4 className="font-semibold text-white mb-2">{device.name || device.serialNumber}</h4>
                    <div className="space-y-1 text-sm text-slate-400">
                      <p><span className="text-slate-500">Serial:</span> {device.serialNumber}</p>
                      <p><span className="text-slate-500">Last Seen:</span> {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}</p>
                      <p><span className="text-slate-500">IP:</span> {device.lastIp || "Unknown"}</p>
                      <p><span className="text-slate-500">Firmware:</span> {device.firmware || "Unknown"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* ERPNext Integration */}
          <Card className="border border-slate-700">
            <div className="p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span>ERPNext Integration</span>
                {tenant.erpnextEnabled && <span className="text-xs bg-green-900/40 text-green-300 px-2 py-1 rounded">Enabled</span>}
              </h3>
              {tenant.erpnextEnabled ? (
                <div className="space-y-3 text-sm mb-4">
                  <div>
                    <p className="text-slate-400">URL</p>
                    <p className="text-white font-mono break-all">{tenant.erpnextUrl}</p>
                  </div>
                  <button
                    onClick={handleSyncEmployees}
                    disabled={syncingEmployees}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-semibold text-sm transition"
                  >
                    {syncingEmployees ? "Syncing..." : "Sync Employees from ERPNext"}
                  </button>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">ERPNext is not enabled for this tenant. Configure it in the tenant portal settings.</p>
              )}

              {syncResult && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg space-y-2">
                  <p className="text-green-300 text-sm">✓ Synced: {syncResult.synced} employees</p>
                  <p className="text-slate-300 text-sm">⊙ Skipped: {syncResult.skipped} employees</p>
                  {syncResult.errors.length > 0 && (
                    <div className="text-red-300 text-sm">
                      <p>✗ Errors: {syncResult.errors.length}</p>
                      <ul className="mt-2 space-y-1">
                        {syncResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i} className="text-xs text-red-400">{err}</li>
                        ))}
                        {syncResult.errors.length > 5 && <li className="text-xs text-red-400">... and {syncResult.errors.length - 5} more</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Plan Information */}
          <Card className="border border-slate-700">
            <div className="p-6">
              <h3 className="font-semibold text-white mb-4">Plan Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-400">Current Plan</p>
                  <p className="text-white font-semibold text-lg">{tenant.plan}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded text-slate-300 text-xs">
                  <p>Device Provision Key: This key is used by devices to authenticate with your tenant.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
