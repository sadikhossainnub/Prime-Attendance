import { useEffect, useState } from "react";
import { portalApi, type EmployeeMapping } from "../lib/api";

export const Employees = () => {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [userPin, setUserPin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [erpnextEmployeeId, setErpnextEmployeeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const clearForm = () => {
    setUserPin("");
    setEmployeeName("");
    setErpnextEmployeeId("");
    setEditingId(null);
  };

  const onEdit = (employee: EmployeeMapping) => {
    setUserPin(employee.userPin);
    setEmployeeName(employee.employeeName);
    setErpnextEmployeeId(employee.erpnextEmployeeId || "");
    setEditingId(employee.userPin);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      setSuccess(null);

      await portalApi.saveMapping({
        userPin,
        employeeName,
        erpnextEmployeeId: erpnextEmployeeId || null,
      });

      setSuccess(`✅ ${editingId ? "Updated" : "Added"} employee successfully!`);
      clearForm();
      await load();
    } catch (err) {
      console.error("Failed to save employee:", err);
      setError(err instanceof Error ? err.message : "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (pin: string) => {
    if (!confirm("Delete this employee?")) return;
    try {
      setError(null);
      setSuccess(null);
      await portalApi.deleteMapping(pin);
      setSuccess("✅ Employee deleted successfully!");
      await load();
    } catch (err) {
      console.error("Failed to delete mapping:", err);
      setError(err instanceof Error ? err.message : "Failed to delete employee");
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");

      if (lines.length < 2) {
        throw new Error("CSV must have at least header and one row");
      }

      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const idIndex = header.indexOf("id");
      const nameIndex = header.indexOf("name");
      const erpnextIndex = header.indexOf("erpnext");

      if (idIndex === -1 || nameIndex === -1) {
        throw new Error("CSV must have 'ID' and 'Name' columns");
      }

      let imported = 0;
      for (const line of lines.slice(1).filter(l => l.trim())) {
        try {
          const values = line.split(",").map(v => v.trim());
          if (values[idIndex] && values[nameIndex]) {
            await portalApi.saveMapping({
              userPin: values[idIndex],
              employeeName: values[nameIndex],
              erpnextEmployeeId: erpnextIndex !== -1 ? values[erpnextIndex] : null,
            });
            imported++;
          }
        } catch {
          // Skip failed rows
        }
      }

      setSuccess(`✅ Imported ${imported} employees!`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "ID,Name,ERPNext\n101,Ahmed Ali,EMP-001\n102,Fatima Begum,EMP-002\n";
    const blob = new Blob([template], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "employees-template.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employees</h2>
        <p className="text-slate-400 text-sm">Manage employee records & device mapping</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm flex gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-800 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Employee Form */}
      <form onSubmit={onSubmit} className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
        <h3 className="font-semibold text-white">
          {editingId ? `📝 Edit Employee - ID: ${editingId}` : "➕ Add New Employee"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Employee ID *</label>
            <input
              required
              placeholder="101"
              value={userPin}
              onChange={(e) => setUserPin(e.target.value)}
              disabled={editingId !== null}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Employee Name *</label>
            <input
              required
              placeholder="Ahmed Ali"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">ERPNext ID</label>
            <input
              placeholder="EMP-001"
              value={erpnextEmployeeId}
              onChange={(e) => setErpnextEmployeeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
          >
            {loading ? "Saving..." : editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={clearForm}
              className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* CSV Import */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
        <h3 className="font-semibold text-white">📊 Bulk Import</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm cursor-pointer font-medium">
            📁 CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              disabled={loading}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium"
          >
            📥 Template
          </button>
          <p className="text-xs text-slate-400">Format: ID, Name, ERPNext (optional)</p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-4">Employee ID</th>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">ERPNext ID</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">
                  📭 No employees. Add one to get started!
                </td>
              </tr>
            ) : (
              mappings.map((m) => (
                <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/20">
                  <td className="p-4 font-mono text-indigo-400 text-sm">{m.userPin}</td>
                  <td className="p-4 text-slate-300">{m.employeeName}</td>
                  <td className="p-4 text-xs text-slate-400">{m.erpnextEmployeeId || "—"}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => onEdit(m)}
                      className="px-3 py-1 rounded bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 text-xs font-medium border border-indigo-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => onDelete(m.userPin)}
                      className="px-3 py-1 rounded bg-red-900/50 hover:bg-red-900 text-red-300 text-xs font-medium border border-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
