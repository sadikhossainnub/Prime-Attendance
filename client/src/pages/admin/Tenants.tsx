import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type TenantRow } from "../../lib/api";
import { Card } from "../../components/Card";

export default function Tenants() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "TRIAL">("ALL");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    contactEmail: "",
    plan: "STARTER" as "STARTER" | "BUSINESS" | "ENTERPRISE",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.tenants();
      setTenants(Array.isArray(res.items) ? res.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.adminName || !form.adminEmail || !form.adminPassword) {
      setError("All fields are required");
      return;
    }
    try {
      setError(null);
      await adminApi.createTenant(form);
      setForm({
        name: "",
        slug: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        contactEmail: "",
        plan: "STARTER",
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = (
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === "ACTIVE").length,
    suspended: tenants.filter((t) => t.status === "SUSPENDED").length,
    trial: tenants.filter((t) => t.status === "TRIAL").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 text-sm mt-1">Manage all client accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
        >
          {showForm ? "Cancel" : "+ New Client"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Total Clients" value={stats.total} />
        <Card title="Active" value={stats.active} />
        <Card title="Trial" value={stats.trial} />
        <Card title="Suspended" value={stats.suspended} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="border-2 border-indigo-500">
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                placeholder="Company Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                required
                placeholder="Slug (e.g., acme-corp)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                required
                placeholder="Admin Name"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                required
                type="email"
                placeholder="Admin Email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                required
                type="password"
                placeholder="Admin Password (min 8 chars)"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                minLength={8}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                placeholder="Contact Email (optional)"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as "STARTER" | "BUSINESS" | "ENTERPRISE" })}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="STARTER">STARTER</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
            >
              Create Client
            </button>
          </form>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Loading tenants...</div>
        </div>
      )}

      {/* Tenants Table */}
      {!loading && (
        <>
          {filteredTenants.length === 0 ? (
            <Card className="bg-slate-800/50">
              <div className="p-12 text-center text-slate-400">
                {tenants.length === 0 ? "No clients yet" : "No clients match your search"}
              </div>
            </Card>
          ) : (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="text-left p-3">Company</th>
                      <th className="text-left p-3">Slug</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Devices</th>
                      <th className="text-left p-3">Logs</th>
                      <th className="text-left p-3">Users</th>
                      <th className="text-left p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((t) => (
                      <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-900/50 transition">
                        <td className="p-3">
                          <Link to={`/admin/tenants/${t.id}`} className="text-indigo-300 font-medium hover:underline">
                            {t.name}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-400">{t.slug}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">
                            {t.plan}
                          </span>
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
                        <td className="p-3 text-slate-300">{t._count.devices}</td>
                        <td className="p-3 text-slate-300">{t._count.attendanceLogs}</td>
                        <td className="p-3 text-slate-300">{t._count.users}</td>
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
        </>
      )}
    </div>
  );
}
