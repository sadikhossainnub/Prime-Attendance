import { useEffect, useState } from "react";
import { portalApi, type AttendanceLog } from "../lib/api";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [pin, setPin] = useState("");
  const [items, setItems] = useState<AttendanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (from) params.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }
    if (pin) params.set("pin", pin);
    portalApi.attendance(params).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    load();
  }, [page]);

  const exportCsv = () => {
    const header = "pin,time,device,in_out\n";
    const body = items.map((r) => `${r.userPin},${r.punchedAt},${r.deviceSn},${r.inOutMode ?? ""}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${todayIso()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="text-slate-400 text-sm">মোট {total}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Sync retry শুরু করবেন?")) {
                portalApi.syncRetry().then((r) => alert(r.message));
              }
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm"
          >
            Sync ERPNext
          </button>
          <button type="button" onClick={exportCsv} disabled={!items.length} className="px-4 py-2 rounded-lg bg-slate-800 text-sm disabled:opacity-40">CSV</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        <input placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm w-24" />
        <button type="button" onClick={() => { setPage(1); load(); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm">Filter</button>
      </div>
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">PIN</th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Device</th>
              <th className="text-left p-3">In/Out</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3 font-mono">{r.userPin}</td>
                <td className="p-3">{new Date(r.punchedAt).toLocaleString("bn-BD")}</td>
                <td className="p-3 font-mono text-xs">{r.deviceSn}</td>
                <td className="p-3">{r.inOutMode === 1 ? "OUT" : r.inOutMode === 0 ? "IN" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
