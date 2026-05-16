import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, type TenantDetail } from "../../lib/api";

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);

  useEffect(() => {
    if (id) adminApi.tenant(id).then(setTenant);
  }, [id]);

  if (!tenant) return <p className="text-slate-400">Loading...</p>;

  const suspend = async () => {
    await adminApi.updateTenant(tenant.id, {
      status: tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
    } as Partial<TenantDetail>);
    adminApi.tenant(tenant.id).then(setTenant);
  };

  const rotateKey = async () => {
    await adminApi.rotateKey(tenant.id);
    adminApi.tenant(tenant.id).then(setTenant);
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/tenants" className="text-sm text-violet-400 hover:underline">← Clients</Link>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{tenant.name}</h2>
          <p className="text-slate-400 font-mono text-sm">{tenant.slug}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={suspend} className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm">
            {tenant.status === "SUSPENDED" ? "Activate" : "Suspend"}
          </button>
          <button type="button" onClick={rotateKey} className="px-3 py-1.5 rounded-lg bg-violet-600 text-sm">
            Rotate provision key
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        <div className="p-4 rounded-xl border border-slate-800">
          <p className="text-slate-500">Plan</p>
          <p className="text-white font-medium">{tenant.plan}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800">
          <p className="text-slate-500">Devices</p>
          <p className="text-white font-medium">{tenant.devices.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-800">
          <p className="text-slate-500">Total punches</p>
          <p className="text-white font-medium">{tenant._count.attendanceLogs}</p>
        </div>
      </div>

      <section>
        <h3 className="font-semibold text-white mb-2">Provision key (device setup)</h3>
        <code className="block p-3 rounded-lg bg-slate-900 text-amber-300 text-xs break-all">
          {tenant.deviceProvisionKey}
        </code>
        <p className="text-slate-500 text-xs mt-2">
          Device URL query: ?tenant={tenant.slug}&key=KEY
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-white mb-2">Users</h3>
        <ul className="text-sm space-y-1">
          {tenant.users.map((u) => (
            <li key={u.id} className="text-slate-300">
              {u.name} — {u.email} <span className="text-slate-500">({u.role})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
