import { FormEvent, useEffect, useState } from "react";
import { portalApi, type Device } from "../lib/api";
import { DevicePunchTypeSelector, DevicePunchTypeBadge } from "../components/DevicePunchTypeSelector";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [serial, setSerial] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingPunchType, setEditingPunchType] = useState<"BOTH" | "IN_ONLY" | "OUT_ONLY">("BOTH");
  const [savingPunchType, setSavingPunchType] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const result = await portalApi.devices();
      setDevices(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to load devices:", err);
      setError(err instanceof Error ? err.message : "Failed to load devices");
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 15 seconds to pick up online/offline changes
    const interval = setInterval(() => {
      portalApi.devices().then(result => {
        setDevices(Array.isArray(result) ? result : []);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      await portalApi.addDevice(serial.trim(), name || undefined);
      setSerial("");
      setName("");
      await load();
    } catch (err) {
      console.error("Failed to add device:", err);
      setError(err instanceof Error ? err.message : "Failed to add device");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (deviceSerial: string) => {
    if (!confirm("Delete this device?")) return;
    try {
      setError(null);
      await portalApi.deleteDevice(deviceSerial);
      await load();
    } catch (err) {
      console.error("Failed to delete device:", err);
      setError(err instanceof Error ? err.message : "Failed to delete device");
    }
  };

  const onEditPunchType = (deviceId: string, currentPunchType: "BOTH" | "IN_ONLY" | "OUT_ONLY" | undefined) => {
    setEditingDeviceId(deviceId);
    setEditingPunchType(currentPunchType || "BOTH");
  };

  const onSavePunchType = async (deviceId: string) => {
    setSavingPunchType(true);
    try {
      setError(null);
      await portalApi.updateDevicePunchType(deviceId, editingPunchType);
      await load();
      setEditingDeviceId(null);
    } catch (err) {
      console.error("Failed to update punch type:", err);
      setError(err instanceof Error ? err.message : "Failed to update punch type");
    } finally {
      setSavingPunchType(false);
    }
  };

  const onCancelEdit = () => {
    setEditingDeviceId(null);
    setEditingPunchType("BOTH");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">Devices</h2>
          <p className="text-slate-400 text-sm">ডিভাইস রেজিস্টার করুন এবং Punch Type সেট করুন</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition flex items-center gap-1.5"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={onAdd} className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <input required placeholder="Serial Number (SN)" value={serial} onChange={(e) => setSerial(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-white placeholder-slate-600" />
        <input placeholder="Label (optional)" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600" />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Adding..." : "Add device"}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="text-left p-4">Serial</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Punch Type</th>
                <th className="text-left p-4">IP</th>
                <th className="text-left p-4">Last seen</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোন ডিভাইস নেই। প্রথম ডিভাইস যোগ করুন।
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800 hover:bg-slate-800/20">
                    <td className="p-4 font-mono text-xs text-slate-300">{d.serialNumber}</td>
                    <td className="p-4 text-sm text-slate-300">{d.name ?? "—"}</td>
                    <td className="p-4">
                      {editingDeviceId === d.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={editingPunchType}
                            onChange={(e) => setEditingPunchType(e.target.value as "BOTH" | "IN_ONLY" | "OUT_ONLY")}
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="BOTH">↔️ Both IN & OUT</option>
                            <option value="IN_ONLY">🔓 IN Only</option>
                            <option value="OUT_ONLY">🚪 OUT Only</option>
                          </select>
                          <button
                            onClick={() => onSavePunchType(d.id)}
                            disabled={savingPunchType}
                            className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium"
                          >
                            {savingPunchType ? "..." : "Save"}
                          </button>
                          <button
                            onClick={onCancelEdit}
                            className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <DevicePunchTypeBadge type={d.punchType} />
                          <button
                            onClick={() => onEditPunchType(d.id, d.punchType)}
                            className="text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 ml-auto"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-400">{d.lastIp ?? "—"}</td>
                    <td className="p-4 text-sm text-slate-400">{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("bn-BD") : "—"}</td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${d.online ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                        {d.online ? "🟢 Online" : "🔴 Offline"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => onDelete(d.serialNumber)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700 text-slate-300 text-sm space-y-2">
        <p className="font-medium">📋 Punch Type Configuration:</p>
        <ul className="space-y-1 ml-4">
          <li>↔️ <strong>Both IN & OUT:</strong> ডিভাইস সব ধরনের punch গ্রহণ করবে</li>
          <li>🔓 <strong>IN Only:</strong> শুধুমাত্র office entry punches গ্রহণ করবে</li>
          <li>🚪 <strong>OUT Only:</strong> শুধুমাত্র office exit punches গ্রহণ করবে</li>
        </ul>
      </div>

      {/* F18 / ZKTeco Troubleshooting */}
      <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50 text-slate-300 text-sm space-y-3">
        <p className="font-semibold text-amber-200">🔧 ZKTeco F18 / ডিভাইস Online হচ্ছে না?</p>
        <p className="text-slate-400 text-xs">নিচের ধাপগুলো অনুসরণ করুন:</p>
        <ol className="list-decimal list-inside space-y-2 text-slate-300">
          <li>
            ডিভাইসে <strong>Menu → Comm → Cloud Server</strong> সেকশনে যান
          </li>
          <li>
            <strong>Enable Cloud Server:</strong> Yes/On করুন
          </li>
          <li>
            <strong>Server Address:</strong> আপনার সার্ভারের IP বা Domain দিন <br/>
            <code className="text-amber-300 text-xs bg-slate-900/50 px-1 rounded">{window.location.hostname}</code>
          </li>
          <li>
            <strong>Server Port:</strong> <code className="text-amber-300 text-xs bg-slate-900/50 px-1 rounded">{window.location.port || '7788'}</code>
          </li>
          <li>
            ⚠️ F18 ডিভাইসে <strong>"Cloud Server"</strong> না থাকলে <strong>ADMS / Push Server</strong> দেখুন:
            <ul className="ml-4 mt-1 space-y-1 text-xs text-slate-400 list-disc">
              <li>Enable ADMS: <strong>Yes</strong></li>
              <li>Server URL: <code className="text-amber-300 bg-slate-900/50 px-1 rounded">http://{window.location.hostname}:{window.location.port || '7788'}/iclock</code></li>
            </ul>
          </li>
          <li>
            Network: ডিভাইস ও সার্ভার <strong>একই নেটওয়ার্কে</strong> থাকতে হবে, অথবা Port Forward করতে হবে
          </li>
          <li>
            Firewall: সার্ভারের Port <code className="text-amber-300 text-xs bg-slate-900/50 px-1 rounded">{window.location.port || '7788'}</code> TCP open থাকতে হবে
          </li>
          <li>
            ডিভাইস Restart দিন এবং ১-২ মিনিট অপেক্ষা করুন। Status আপনা আপনি update হবে (প্রতি ১৫ সেকেন্ডে চেক হয়)।
          </li>
        </ol>
        <div className="mt-2 p-2 rounded bg-slate-900/50 text-xs text-slate-400">
          <strong>💡 মনে রাখুন:</strong> ডিভাইসের Serial Number (SN) উপরে Add করা SN-এর সাথে হুবহু মিলতে হবে।
          ভুল SN দিলে ডিভাইস register হবে না এবং Offline দেখাবে। SN ডিভাইসের <strong>Menu → System Info</strong> থেকে দেখুন।
        </div>
      </div>
    </div>
  );
}
