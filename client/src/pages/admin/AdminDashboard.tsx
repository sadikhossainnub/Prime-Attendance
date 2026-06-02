import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import { adminApi, type TenantRow } from "../../lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    tenantCount: 0,
    deviceCount: 0,
    punchToday: 0,
    userCount: 0,
    recentTenants: [] as TenantRow[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats().then((s) => {
      setStats({
        ...s,
        recentTenants: s.recentTenants as TenantRow[],
      });
      setLoading(false);
    });
  }, []);

  const activeClients = stats.recentTenants.filter((t) => t.status === "ACTIVE").length;
  const suspendedClients = stats.recentTenants.filter((t) => t.status === "SUSPENDED").length;
  const avgDevicesPerTenant = stats.tenantCount > 0 ? (stats.deviceCount / stats.tenantCount).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of all clients and system statistics</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Clients" value={stats.tenantCount} />
        <Card title="Devices" value={stats.deviceCount} />
        <Card title="Today's Punches" value={stats.punchToday} />
        <Card title="Users" value={stats.userCount} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <p className="text-slate-400 text-sm">Active Clients</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{activeClients}</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <p className="text-slate-400 text-sm">Suspended Clients</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{suspendedClients}</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <p className="text-slate-400 text-sm">Avg Devices per Client</p>
          <p className="text-3xl font-bold text-indigo-400 mt-2">{avgDevicesPerTenant}</p>
        </div>
      </div>

      {/* Recent Clients Table */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Recent Clients</h2>
          <Link to="/admin/tenants" className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold">
            View All →
          </Link>
        </div>

        {loading ? (
          <Card className="bg-slate-800/50">
            <div className="p-8 text-center text-slate-400">Loading...</div>
          </Card>
        ) : stats.recentTenants.length === 0 ? (
          <Card className="bg-slate-800/50">
            <div className="p-8 text-center text-slate-400">No clients yet</div>
          </Card>
        ) : (
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left p-3 text-slate-400">Name</th>
                    <th className="text-left p-3 text-slate-400">Slug</th>
                    <th className="text-left p-3 text-slate-400">Plan</th>
                    <th className="text-left p-3 text-slate-400">Status</th>
                    <th className="text-left p-3 text-slate-400">Devices</th>
                    <th className="text-left p-3 text-slate-400">Users</th>
                    <th className="text-left p-3 text-slate-400">Logs</th>
                    <th className="text-left p-3 text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTenants.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-900/50 transition">
                      <td className="p-3">
                        <Link to={`/admin/tenants/${t.id}`} className="text-indigo-300 font-medium hover:underline">
                          {t.name}
                        </Link>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-400">{t.slug}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">{t.plan}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            t.status === "ACTIVE"
                              ? "bg-green-900/40 text-green-300"
                              : t.status === "TRIAL"
                              ? "bg-blue-900/40 text-blue-300"
                              : "bg-red-900/40 text-red-300"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{t._count?.devices ?? 0}</td>
                      <td className="p-3 text-slate-300">{t._count?.users ?? 0}</td>
                      <td className="p-3 text-slate-300">{t._count?.attendanceLogs ?? 0}</td>
                      <td className="p-3">
                        <Link
                          to={`/admin/tenants/${t.id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/tenants"
            className="p-6 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-slate-900/60 transition cursor-pointer"
          >
            <h3 className="text-white font-semibold mb-2">Manage Clients</h3>
            <p className="text-slate-400 text-sm">Create, edit, or suspend client accounts</p>
          </Link>
          <Link
            to="/admin/tenants"
            className="p-6 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-slate-900/60 transition cursor-pointer"
          >
            <h3 className="text-white font-semibold mb-2">Monitor Activity</h3>
            <p className="text-slate-400 text-sm">View real-time system activity and analytics</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
