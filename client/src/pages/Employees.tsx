import { FormEvent, useEffect, useState } from "react";
import { portalApi, type EmployeeMapping } from "../lib/api";

export default function Employees() {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [userPin, setUserPin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [erpId, setErpId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

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

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header and one data row");
      }

      // Parse header
      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const idIndex = header.indexOf("id");
      const nameIndex = header.indexOf("name");
      const erpnextIndex = header.indexOf("erpnext") || header.indexOf("erpnext_id");

      if (idIndex === -1 || nameIndex === -1) {
        throw new Error("CSV must have 'ID' and 'Name' columns");
      }

      // Parse data rows
      const rows = lines.slice(1).filter(line => line.trim());
      let imported = 0;
      let failed = 0;

      for (const line of rows) {
        try {
          const values = line.split(",").map(v => v.trim());
          const id = values[idIndex];
          const name = values[nameIndex];
          const erpnext = erpnextIndex !== -1 ? values[erpnextIndex] : null;

          if (!id || !name) {
            failed++;
            continue;
          }

          await portalApi.saveMapping({
            userPin: id,
            employeeName: name,
            erpnextEmployeeId: erpnext || null,
          });
          imported++;
        } catch {
          failed++;
        }
      }

      setImportSuccess(`Imported ${imported} employees${failed > 0 ? `, ${failed} failed` : ""}`);
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setLoading(false);
      // Reset file input
      if (e.target) e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "ID,Name,ERPNext\n101,আহমেদ আলী,EMP-001\n102,ফাতিমা বেগম,EMP-002\n";
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
        <p className="text-slate-400 text-sm">ডিভাইস ID ↔ কর্মচারীর নাম</p>
      </div>
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}
      {importError && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="p-4 rounded-lg bg-green-900/20 border border-green-800 text-green-300">
          {importSuccess}
        </div>
      )}

      {/* Manual Entry Form */}
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-800">
        <input required placeholder="ID" value={userPin} onChange={(e) => setUserPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm w-24" />
        <input required placeholder="Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm flex-1 min-w-[140px]" />
        <input placeholder="ERPNext ID" value={erpId} onChange={(e) => setErpId(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50">
          {loading ? "Saving..." : "Save"}
        </button>
      </form>

      {/* CSV Import Section */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <h3 className="font-semibold text-white mb-3">Bulk Import (CSV)</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="px-4 py-2 rounded-lg bg-slate-800 text-sm cursor-pointer hover:bg-slate-700">
            Choose CSV File
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
            className="px-4 py-2 rounded-lg bg-slate-700 text-sm hover:bg-slate-600"
          >
            Download Template
          </button>
          <p className="text-xs text-slate-400">CSV format: ID, Name, ERPNext (optional)</p>
        </div>
      </div>

      {/* Employees Table */}
      <table className="w-full text-sm rounded-xl border border-slate-800 overflow-hidden">
        <thead className="bg-slate-900 text-slate-400">
          <tr><th className="text-left p-3">ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">ERPNext</th><th className="text-left p-3">Action</th></tr>
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
