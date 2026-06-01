import { useEffect, useState } from "react";
import { portalApi, type DeviceRawEvent } from "../lib/api";

export default function RawEvents() {
  const [events, setEvents] = useState<DeviceRawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const r = await portalApi.rawEvents(100);
      setEvents(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error("Failed to load raw events:", err);
      setError(err instanceof Error ? err.message : "Failed to load raw events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white">Device Raw Events</h2>
          <p className="text-slate-400 text-sm">Latest 100 device requests</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-slate-800 text-sm disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Device SN</th>
                <th className="p-4">Method/Path</th>
                <th className="p-4">Body Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-300">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-indigo-400">{ev.deviceSn || "N/A"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${ev.method === "POST" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>
                        {ev.method}
                      </span>
                      <code className="text-slate-400 text-xs">{ev.path}</code>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-500 max-w-md truncate">
                      {ev.bodyPreview || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
