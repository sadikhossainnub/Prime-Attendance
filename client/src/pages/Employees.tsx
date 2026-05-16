import { FormEvent, useEffect, useState } from "react";
import { api, type EmployeeMapping } from "../lib/api";

export default function Employees() {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [userPin, setUserPin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [erpnextEmployeeId, setErpnextEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .mappings()
      .then(setMappings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.saveMapping({
        userPin,
        employeeName,
        erpnextEmployeeId: erpnextEmployeeId || null,
      });
      setUserPin("");
      setEmployeeName("");
      setErpnextEmployeeId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onDelete = async (pin: string) => {
    if (!confirm(`Delete mapping for PIN ${pin}?`)) return;
    try {
      await api.deleteMapping(pin);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employee Mapping</h2>
        <p className="text-slate-400 text-sm mt-1">
          ডিভাইস PIN কে কর্মচারীর নাম ও ERPNext ID-এর সাথে মিলান
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/40"
      >
        <input
          required
          placeholder="PIN (e.g. 101)"
          value={userPin}
          onChange={(e) => setUserPin(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Employee name"
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm flex-1 min-w-[160px]"
        />
        <input
          placeholder="ERPNext Employee ID (optional)"
          value={erpnextEmployeeId}
          onChange={(e) => setErpnextEmployeeId(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium hover:bg-indigo-500"
        >
          Save
        </button>
      </form>

      {error && <p className="text-amber-400 text-sm">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-3">PIN</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">ERPNext ID</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-t border-slate-800">
                  <td className="p-3 font-mono">{m.userPin}</td>
                  <td className="p-3">{m.employeeName}</td>
                  <td className="p-3 font-mono text-xs">
                    {m.erpnextEmployeeId ?? "—"}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
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
      )}
    </div>
  );
}
