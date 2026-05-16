import { FormEvent, useState } from "react";
import { getApiKey, setApiKey, api } from "../lib/api";

export default function Settings() {
  const [key, setKey] = useState(getApiKey());
  const [status, setStatus] = useState<string | null>(null);
  const [erpnext, setErpnext] = useState(false);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setApiKey(key);
    setStatus(null);
    try {
      const health = await api.health();
      setErpnext(health.erpnextEnabled);
      setStatus("API key saved and verified.");
    } catch {
      setStatus("Key saved but server rejected it. Check API_KEY in .env");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">
          সার্ভারের <code className="text-indigo-300">API_KEY</code> এখানে দিন
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <label className="block text-sm">
          <span className="text-slate-400">X-API-Key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2"
            placeholder="change-me"
          />
        </label>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium hover:bg-indigo-500"
        >
          Save & Test
        </button>
      </form>

      {status && (
        <p
          className={`text-sm ${
            status.includes("rejected") ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {status}
        </p>
      )}

      <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400 space-y-2">
        <p>
          <strong className="text-slate-300">ERPNext:</strong>{" "}
          {erpnext ? "Enabled on server" : "Disabled (default)"}
        </p>
        <p>
          ডিভাইস endpoint: <code className="text-indigo-300">/iclock/cdata</code>{" "}
          — অথেন্টিকেশন লাগে না।
        </p>
      </div>
    </div>
  );
}
