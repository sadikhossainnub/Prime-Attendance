import { useEffect, useState } from "react";
import { api, type AttendanceLog } from "../lib/api";

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function exportCsv(rows: AttendanceLog[]) {
  const header = "device_sn,user_pin,punched_at,status,in_out_mode,sync_status\n";
  const body = rows
    .map(
      (r) =>
        `${r.deviceSn},${r.userPin},${r.punchedAt},${r.status ?? ""},${r.inOutMode ?? ""},${r.syncStatus}`
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${todayIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Attendance() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [pin, setPin] = useState("");
  const [deviceSn, setDeviceSn] = useState("");
  const [items, setItems] = useState<AttendanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
    });
    if (from) params.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }
    if (pin) params.set("pin", pin);
    if (deviceSn) params.set("deviceSn", deviceSn);

    api
      .attendance(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="text-slate-400 text-sm mt-1">মোট {total} রেকর্ড</p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(items)}
          disabled={items.length === 0}
          className="px-4 py-2 rounded-lg bg-slate-800 text-sm hover:bg-slate-700 disabled:opacity-40"
        >
          CSV Export
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">PIN</span>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="101"
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 w-24"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">Device SN</span>
          <input
            type="text"
            value={deviceSn}
            onChange={(e) => setDeviceSn(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 w-36"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            load();
          }}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium hover:bg-indigo-500"
        >
          Filter
        </button>
      </div>

      {error && (
        <p className="text-amber-400 text-sm">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">PIN</th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Device</th>
              <th className="text-left p-3">In/Out</th>
              <th className="text-left p-3">Sync</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-slate-500">
                  কোনো রেকর্ড নেই
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="p-3 font-mono">{row.userPin}</td>
                  <td className="p-3">
                    {new Date(row.punchedAt).toLocaleString("bn-BD")}
                  </td>
                  <td className="p-3 font-mono text-xs">{row.deviceSn}</td>
                  <td className="p-3">
                    {row.inOutMode === 1 ? "OUT" : row.inOutMode === 0 ? "IN" : "—"}
                  </td>
                  <td className="p-3 text-xs text-slate-400">{row.syncStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 rounded bg-slate-800 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm text-slate-400 self-center">Page {page}</span>
        <button
          type="button"
          disabled={items.length < 50}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded bg-slate-800 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
