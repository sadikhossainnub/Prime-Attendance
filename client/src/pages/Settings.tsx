import { FormEvent, useEffect, useState } from "react";
import { portalApi, type TenantSettings } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [erpnextConfig, setErpnextConfig] = useState({
    enabled: false,
    url: "",
    apiKey: "",
    apiSecret: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const serverHost = window.location.hostname;
  const port = window.location.port || "7788";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await portalApi.settings();
        setSettings(data);
        setErpnextConfig({
          enabled: data.erpnextEnabled || false,
          url: data.erpnextUrl || "",
          apiKey: data.erpnextApiKey || "",
          apiSecret: data.erpnextApiSecret || "",
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError(err instanceof Error ? err.message : "Failed to load settings");
      }
    };
    loadSettings();
  }, []);

  const handleErpnextSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await portalApi.updateErpnextConfig(erpnextConfig);
      setSuccess("ERPNext configuration saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save ERPNext config:", err);
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return <p className="text-slate-400">Loading...</p>;

  const deviceUrl = `http://${serverHost}:${port}/iclock/cdata?tenant=${settings.slug}&key=${settings.deviceProvisionKey}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm">ডিভাইস, অ্যাকাউন্ট ও ERPNext সেটআপ</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-900/20 border border-green-800 text-green-300">
          {success}
        </div>
      )}

      {/* Company Info */}
      <div className="p-4 rounded-xl border border-slate-800 space-y-3 text-sm">
        <p><span className="text-slate-500">Company:</span> <span className="text-white">{settings.name}</span></p>
        <p><span className="text-slate-500">Slug:</span> <code className="text-indigo-300">{settings.slug}</code></p>
        <p><span className="text-slate-500">Plan:</span> {settings.plan} · {settings.status}</p>
        <p><span className="text-slate-500">Logged in:</span> {user?.email}</p>
      </div>

      {/* Device Setup */}
      <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 space-y-3">
        <h3 className="font-semibold text-amber-200">ZKTeco Device Setup</h3>
        <ol className="list-decimal list-inside text-slate-300 space-y-2 text-sm">
          <li>ডিভাইসে <strong>Comm → Cloud Server</strong> চালু করুন</li>
          <li><strong>Server IP:</strong> <code className="text-white">{serverHost}</code></li>
          <li><strong>Port:</strong> <code className="text-white">{port}</code></li>
          <li>Devices পেজে আগে থেকে <strong>Serial Number</strong> যোগ করুন</li>
          <li>অথবা প্রথম কানেকশনে provision key ব্যবহার করুন (নিচে)</li>
        </ol>
      </div>

      {/* Provision Key */}
      <div className="p-4 rounded-xl border border-slate-800">
        <p className="text-slate-400 text-xs mb-2">Provision Key (গোপন রাখুন)</p>
        <code className="block p-3 bg-slate-900 rounded text-amber-300 text-xs break-all select-all">
          {settings.deviceProvisionKey}
        </code>
        <p className="text-slate-500 text-xs mt-3">
          কিছু ডিভাইসে custom URL সাপোর্ট থাকলে:
        </p>
        <code className="block mt-1 p-2 bg-slate-900 rounded text-xs text-slate-400 break-all">
          {deviceUrl}
        </code>
      </div>

      {/* ERPNext Configuration */}
      <div className="p-4 rounded-xl border border-slate-800 space-y-4">
        <h3 className="font-semibold text-white">ERPNext Integration</h3>
        <p className="text-slate-400 text-sm">
          Attendance data automatically sync হবে ERPNext-এ। Optional - না চাইলে disable রাখুন।
        </p>

        <form onSubmit={handleErpnextSave} className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="erpnext-enabled"
              checked={erpnextConfig.enabled}
              onChange={(e) =>
                setErpnextConfig({ ...erpnextConfig, enabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-600 bg-slate-900"
            />
            <label htmlFor="erpnext-enabled" className="text-sm text-slate-300">
              Enable ERPNext Integration
            </label>
          </div>

          {/* ERPNext URL */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">ERPNext URL</label>
            <input
              type="url"
              placeholder="https://erp.yourdomain.com"
              value={erpnextConfig.url}
              onChange={(e) =>
                setErpnextConfig({ ...erpnextConfig, url: e.target.value })
              }
              disabled={!erpnextConfig.enabled}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">HTTPS URL required</p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">API Key</label>
            <input
              type="password"
              placeholder="Your ERPNext API Key"
              value={erpnextConfig.apiKey}
              onChange={(e) =>
                setErpnextConfig({ ...erpnextConfig, apiKey: e.target.value })
              }
              disabled={!erpnextConfig.enabled}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Get from ERPNext: User Settings → API Access
            </p>
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">API Secret</label>
            <input
              type="password"
              placeholder="Your ERPNext API Secret"
              value={erpnextConfig.apiSecret}
              onChange={(e) =>
                setErpnextConfig({ ...erpnextConfig, apiSecret: e.target.value })
              }
              disabled={!erpnextConfig.enabled}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Get from ERPNext: User Settings → API Access
            </p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save ERPNext Configuration"}
          </button>
        </form>

        {/* Info Box */}
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 text-xs text-slate-400 space-y-1">
          <p><strong>কীভাবে কাজ করে:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>প্রতিটি পাঞ্চ ERPNext-এ Employee Checkin হিসেবে sync হয়</li>
            <li>Employee mapping-এ ERPNext Employee ID দিতে হবে</li>
            <li>Failed sync retry করা যায় Attendance পেজ থেকে</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
