import { FormEvent, useEffect, useState } from "react";
import { portalApi, type EmployeeMapping } from "../lib/api";

export default function Employees() {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [userPin, setUserPin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [erpId, setErpId] = useState("");

  const load = () => portalApi.mappings().then(setMappings);
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await portalApi.saveMapping({ userPin, employeeName, erpnextEmployeeId: erpId || null });
    setUserPin(""); setEmployeeName(""); setErpId("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employees</h2>
        <p className="text-slate-400 text-sm">ডিভাইস PIN ↔ কর্মচারীর নাম</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-800">
        <input required placeholder="PIN" value={userPin} onChange={(e) => setUserPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm w-24" />
        <input required placeholder="Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm flex-1 min-w-[140px]" />
        <input placeholder="ERPNext ID" value={erpId} onChange={(e) => setErpId(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-sm">Save</button>
      </form>
      <table className="w-full text-sm rounded-xl border border-slate-800 overflow-hidden">
        <thead className="bg-slate-900 text-slate-400">
          <tr><th className="text-left p-3">PIN</th><th className="text-left p-3">Name</th><th className="text-left p-3">ERPNext</th></tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t border-slate-800">
              <td className="p-3 font-mono">{m.userPin}</td>
              <td className="p-3">{m.employeeName}</td>
              <td className="p-3 text-xs">{m.erpnextEmployeeId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
