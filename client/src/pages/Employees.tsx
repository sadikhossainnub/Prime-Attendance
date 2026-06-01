import { FormEvent, useEffect, useState } from "react";
import { portalApi, type EmployeeMapping } from "../lib/api";

export default function Employees() {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [userPin, setUserPin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [erpId, setErpId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const result = await portalApi.mappings();
      setMappings(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to load mappings:", err);
      setError(err instanceof Error ? err.message : "Failed to load mappings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      await portalApi.saveMapping({ userPin, employeeName, erpnextEmployeeId: erpId || null });
      setUserPin("");
      setEmployeeName("");
      setErpId("");
      await load();
    } catch (err) {
      console.error("Failed to save mapping:", err);
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (pin: string) => {
    if (!confirm("Delete this mapping?")) return;
    try {
      setError(null);
      await portalApi.deleteMapping(pin);
      await load();
    } catch (err) {
      console.error("Failed to delete mapping:", err);
      setError(err instanceof Error ? err.message : "Failed to delete mapping");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employees</h2>
        <p className="text-slate-400 text-sm">ডিভাইস PIN ↔ কর্মচারীর নাম</p>
      </div>
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-800">
        <input required placeholder="PIN" value={userPin} onChange={(e) => setUserPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm w-24" />
        <input required placeholder="Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm flex-1 min-w-[140px]" />
        <input placeholder="ERPNext ID" value={erpId} onChange={(e) => setErpId(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50">
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
      <table className="w-full text-sm rounded-xl border border-slate-800 overflow-hidden">
        <thead className="bg-slate-900 text-slate-400">
          <tr><th className="text-left p-3">PIN</th><th className="text-left p-3">Name</th><th className="text-left p-3">ERPNext</th><th className="text-left p-3">Action</th></tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t border-slate-800">
              <td className="p-3 font-mono">{m.userPin}</td>
              <td className="p-3">{m.employeeName}</td>
              <td className="p-3 text-xs">{m.erpnextEmployeeId ?? "—"}</td>
              <td className="p-3">
                <button
                  onClick={() => onDelete(m.userPin)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
