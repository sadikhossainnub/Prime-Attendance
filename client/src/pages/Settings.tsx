import { useEffect, useState } from "react";
import { portalApi, type TenantSettings } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const serverHost = window.location.hostname;
  const port = window.location.port || "7788";

  useEffect(() => {
    portalApi.settings().then(setSettings);
  }, []);

  if (!settings) return <p className="text-slate-400">Loading...</p>;

  const deviceUrl = `http://${serverHost}:${port}/iclock/cdata?tenant=${settings.slug}&key=${settings.deviceProvisionKey}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm">ডিভাইস ও অ্যাকাউন্ট সেটআপ</p>
      </div>

      <div className="p-4 rounded-xl border border-slate-800 space-y-3 text-sm">
        <p><span className="text-slate-500">Company:</span> <span className="text-white">{settings.name}</span></p>
        <p><span className="text-slate-500">Slug:</span> <code className="text-indigo-300">{settings.slug}</code></p>
        <p><span className="text-slate-500">Plan:</span> {settings.plan} · {settings.status}</p>
        <p><span className="text-slate-500">Logged in:</span> {user?.email}</p>
      </div>

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
    </div>
  );
}
