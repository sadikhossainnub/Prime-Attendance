import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type TenantRow } from "../../lib/api";

export default function Tenants() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    contactEmail: "",
  });
  const [error, setError] = useState<string | null>(null);

  const load = () => adminApi.tenants().then((res) => setTenants(Array.isArray(res.items) ? res.items : []));

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createTenant(form);
      setShowForm(false);
      setForm({ name: "", slug: "", adminName: "", adminEmail: "", adminPassword: "", contactEmail: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Clients</h2>
          <p className="text-slate-400 text-sm">আপনার SaaS ক্লায়েন্ট (tenants)</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-violet-600 text-sm font-medium hover:bg-violet-500"
        >
          {showForm ? "Cancel" : "+ New client"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          <input required placeholder="Slug (acme-corp)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          <input required placeholder="Admin name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          <input required type="email" placeholder="Admin email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          <input required type="password" placeholder="Admin password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          <input placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
          {error && <p className="text-red-400 text-sm sm:col-span-2">{error}</p>}
          <button type="submit" className="sm:col-span-2 py-2 rounded-lg bg-violet-600 text-sm font-medium">Create client</button>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Devices</th>
              <th className="text-left p-3">Punches</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-900/50">
                <td className="p-3">
                  <Link to={`/admin/tenants/${t.id}`} className="text-violet-300 font-medium hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs">{t.slug}</td>
                <td className="p-3">{t.plan}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${t.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3">{t._count.devices}</td>
                <td className="p-3">{t._count.attendanceLogs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
