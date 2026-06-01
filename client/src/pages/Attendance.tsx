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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (pageNum: number = 1) => {
    try {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams({ page: String(pageNum), limit: "50" });
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      if (pin) params.set("pin", pin);
      const r = await portalApi.attendance(params);
      setItems(r.items);
      setTotal(r.total);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load attendance:", err);
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    load(1);
  };

  const exportCsv = () => {
    const header = "pin,time,device,in_out\n";
    const body = items.map((r) => `${r.userPin},${r.punchedAt},${r.deviceSn},${r.inOutMode ?? ""}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${todayIso()}.csv`;
    a.click();
  };

  const handleSyncRetry = async () => {
    if (!confirm("Sync retry শুরু করবেন?")) return;
    try {
      setError(null);
      const r = await portalApi.syncRetry();
      alert(r.message);
    } catch (err) {
      console.error("Sync retry failed:", err);
      setError(err instanceof Error ? err.message : "Sync retry failed");
    }
  };

  const totalPages = Math.ceil(total / 50);

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
            onClick={handleSyncRetry}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm"
          >
            Sync ERPNext
          </button>
          <button type="button" onClick={exportCsv} disabled={!items.length} className="px-4 py-2 rounded-lg bg-slate-800 text-sm disabled:opacity-40">CSV</button>
        </div>
      </div>
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-end">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        <input placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm w-24" />
        <button type="button" onClick={handleFilter} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50">
          {loading ? "Loading..." : "Filter"}
        </button>
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
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">লোড হচ্ছে...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">কোনো রেকর্ড নেই</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="p-3 font-mono">{r.userPin}</td>
                  <td className="p-3">{new Date(r.punchedAt).toLocaleString("bn-BD")}</td>
                  <td className="p-3 font-mono text-xs">{r.deviceSn}</td>
                  <td className="p-3">{r.inOutMode === 1 ? "OUT" : r.inOutMode === 0 ? "IN" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-slate-800 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-slate-800 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
