import { FormEvent, useEffect, useState } from "react";
import { portalApi, type Device } from "../lib/api";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [serial, setSerial] = useState("");
  const [name, setName] = useState("");

  const load = () => portalApi.devices().then(setDevices);

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    await portalApi.addDevice(serial.trim(), name || undefined);
    setSerial("");
    setName("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Devices</h2>
        <p className="text-slate-400 text-sm">ডিভাইস আগে থেকে রেজিস্টার করুন (Serial Number)</p>
      </div>

      <form onSubmit={onAdd} className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <input required placeholder="Serial Number (SN)" value={serial} onChange={(e) => setSerial(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono" />
        <input placeholder="Label (optional)" value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-sm">Add device</button>
      </form>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Serial</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">IP</th>
              <th className="text-left p-3">Last seen</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-slate-800">
                <td className="p-3 font-mono">{d.serialNumber}</td>
                <td className="p-3">{d.name ?? "—"}</td>
                <td className="p-3">{d.lastIp ?? "—"}</td>
                <td className="p-3">{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("bn-BD") : "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${d.online ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                    {d.online ? "Online" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
