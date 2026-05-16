import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { api, type Device } from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({ punchCount: 0, onlineDevices: 0 });
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.todayStats(), api.devices()])
      .then(([s, d]) => {
        setStats(s);
        setDevices(d.slice(0, 5));
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-400">Loading...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-amber-200">
        <p>{error}</p>
        <p className="text-sm mt-2">
          <Link to="/settings" className="underline">
            Settings
          </Link>{" "}
          এ API Key সেট করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">আজকের অ্যাটেনডেন্স ও ডিভাইস স্ট্যাটাস</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="আজকের পাঞ্চ" value={stats.punchCount} />
        <Card
          title="অনলাইন ডিভাইস"
          value={stats.onlineDevices}
          subtitle="শেষ ৫ মিনিটে কানেক্ট"
        />
      </div>

      <section>
        <h3 className="text-lg font-semibold text-white mb-3">সাম্প্রতিক ডিভাইস</h3>
        {devices.length === 0 ? (
          <p className="text-slate-500 text-sm">
            এখনো কোনো ডিভাইস কানেক্ট হয়নি। ZKTeco-তে Cloud Server সেট করুন।
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="text-left p-3">Serial</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">Last seen</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800">
                    <td className="p-3 font-mono">{d.serialNumber}</td>
                    <td className="p-3">{d.lastIp ?? "—"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
