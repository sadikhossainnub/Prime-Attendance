import { useEffect, useState } from "react";
import { api, type Device } from "../lib/api";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .devices()
      .then(setDevices)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) return <p className="text-amber-400">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Devices</h2>
        <p className="text-slate-400 text-sm mt-1">
          ZKTeco ডিভাইস স্বয়ংক্রিয়ভাবে এখানে রেজিস্টার হয়
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Serial Number</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">IP</th>
              <th className="text-left p-3">Firmware</th>
              <th className="text-left p-3">Last seen</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">
                  কোনো ডিভাইস নেই
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id} className="border-t border-slate-800">
                  <td className="p-3 font-mono">{d.serialNumber}</td>
                  <td className="p-3">{d.name ?? "—"}</td>
                  <td className="p-3">{d.lastIp ?? "—"}</td>
                  <td className="p-3">{d.firmware ?? "—"}</td>
                  <td className="p-3">
                    {d.lastSeenAt
                      ? new Date(d.lastSeenAt).toLocaleString("bn-BD")
                      : "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs ${
                        d.online
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {d.online ? "Online" : "Offline"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
