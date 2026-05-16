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

  useEffect(() => {
    adminApi.stats().then((s) =>
      setStats({
        ...s,
        recentTenants: s.recentTenants as TenantRow[],
      })
    );
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
        <p className="text-slate-400 text-sm">সব ক্লায়েন্টের ওভারভিউ</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Clients" value={stats.tenantCount} />
        <Card title="Devices" value={stats.deviceCount} />
        <Card title="Today's punches" value={stats.punchToday} />
        <Card title="Users" value={stats.userCount} />
      </div>
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-white">Recent clients</h3>
          <Link to="/admin/tenants" className="text-sm text-violet-400 hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Devices</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTenants.map((t) => (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="p-3">
                    <Link to={`/admin/tenants/${t.id}`} className="text-violet-300 hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.status}</td>
                  <td className="p-3">{t._count?.devices ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
