import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { portalApi, type AttendanceLog } from "../lib/api";

export default function Dashboard() {
  const [data, setData] = useState({
    punchToday: 0,
    onlineDevices: 0,
    totalDevices: 0,
    totalEmployees: 0,
    recentPunches: [] as AttendanceLog[],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setError(null);
        const result = await portalApi.dashboard();
        setData(result);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        </div>
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">আজকের অ্যাটেনডেন্স ও ডিভাইস</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="আজকের পাঞ্চ" value={data.punchToday} />
        <Card title="অনলাইন ডিভাইস" value={data.onlineDevices} subtitle={`মোট ${data.totalDevices}`} />
        <Card title="ডিভাইস" value={data.totalDevices} />
        <Card title="কর্মচারী (ID)" value={data.totalEmployees} />
      </div>
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">সাম্প্রতিক পাঞ্চ</h3>
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-4 text-slate-500">লোড হচ্ছে...</td></tr>
              ) : data.recentPunches.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-slate-500">কোনো পাঞ্চ নেই</td></tr>
              ) : (
                data.recentPunches.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="p-3 font-mono">{p.userPin}</td>
                    <td className="p-3">{new Date(p.punchedAt).toLocaleString("bn-BD")}</td>
                    <td className="p-3 font-mono text-xs">{p.deviceSn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
