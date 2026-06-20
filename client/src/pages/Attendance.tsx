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
  const [success, setSuccess] = useState<string | null>(null);
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
    if (!Array.isArray(items) || items.length === 0) return;
    const header = "ID,Name,Time,Device,In/Out\n";
    const body = items.map((r) => `${r.userPin},"${r.employeeName || ""}",${new Date(r.punchedAt).toLocaleString("bn-BD")},${r.deviceSn},${r.inOutMode === 1 ? "OUT" : r.inOutMode === 0 ? "IN" : ""}`).join("\n");
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
      setSuccess(null);
      const r = await portalApi.syncRetry();
      setSuccess(`🔄 Sync retry triggered for ${r.count} logs`);
      alert(r.message);
    } catch (err) {
      console.error("Sync retry failed:", err);
      setError(err instanceof Error ? err.message : "Sync retry failed");
    }
  };

  const totalPages = Math.ceil(total / 50);

  // Helper to get punch type display
  const getPunchDisplay = (inOutMode: number | null) => {
    if (inOutMode === 0) return { label: "IN", emoji: "🔓", color: "bg-emerald-900/50 text-emerald-300" };
    if (inOutMode === 1) return { label: "OUT", emoji: "🚪", color: "bg-red-900/50 text-red-300" };
    return { label: "—", emoji: "", color: "bg-slate-800 text-slate-400" };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="text-slate-400 text-sm">মোট {total} রেকর্ড</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSyncRetry}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            🔄 Sync ERPNext
          </button>
          <button type="button" onClick={exportCsv} disabled={!items.length} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium disabled:opacity-40">📥 CSV</button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-900/20 border border-green-800 text-green-300 text-sm flex items-start gap-2">
          <span>✅</span>
          <div>{success}</div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end p-4 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-semibold">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-semibold">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-semibold">Employee ID</label>
          <input placeholder="Search by ID" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white placeholder-slate-600 w-40" />
        </div>
        <button type="button" onClick={handleFilter} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition">
          {loading ? "⏳ Loading..." : "🔍 Filter"}
        </button>
      </div>

      {/* Info Box about Punch Filtering */}
      <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-800 text-indigo-300 text-sm">
        <p className="font-medium mb-1">📌 Punch Type Filtering Active</p>
        <p className="text-xs text-indigo-400">Only punches matching each device's configured punch type (IN_ONLY/OUT_ONLY/BOTH) are displayed here.</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-4">Employee ID</th>
              <th className="text-left p-4">Employee Name</th>
              <th className="text-left p-4">Punch Time</th>
              <th className="text-left p-4">Device</th>
              <th className="text-left p-4">Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">⏳ লোড হচ্ছে...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">📭 কোনো রেকর্ড নেই</td></tr>
            ) : (
              items.map((r) => {
                const punchInfo = getPunchDisplay(r.inOutMode);
                return (
                  <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="p-4 font-mono text-indigo-400 text-xs">{r.userPin}</td>
                    <td className="p-4 text-slate-300">{r.employeeName ?? "—"}</td>
                    <td className="p-4 text-slate-300 text-xs">{new Date(r.punchedAt).toLocaleString("bn-BD")}</td>
                    <td className="p-4 font-mono text-slate-400 text-xs">{r.deviceSn}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${punchInfo.color}`}>
                        {punchInfo.emoji} {punchInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium transition"
          >
            ← Previous
          </button>
          <div className="px-4 py-2 rounded-lg bg-slate-900 text-slate-300 text-sm font-semibold border border-slate-800">
            Page {page} of {totalPages}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
