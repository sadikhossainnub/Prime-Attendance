import { useEffect, useState } from "react";
import { portalApi } from "../lib/api";

interface SyncStatusData {
  totalLogs: number;
  synced: number;
  pending: number;
  failed: number;
  skipped: number;
  permanentlyFailed: number;
  recentLogs: Array<{
    id: string;
    userPin: string;
    employeeName: string | null;
    punchedAt: string;
    deviceSn: string;
    inOutMode: number | null;
    syncStatus: string;
    syncRetryCount: number;
    erpnextCheckinId: string | null;
    syncError: string | null;
    syncedAt: string | null;
  }>;
}

interface LastSyncInfo {
  lastSyncedAt: string | null;
  lastPunchedAt: string | null;
  lastCheckinId: string | null;
  stats: {
    total: number;
    synced: number;
    unsynced: number;
  };
}

export function SyncStatus() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [lastSync, setLastSync] = useState<LastSyncInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Bulk sync form state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [bulkLimit, setBulkLimit] = useState(1000);
  const [batchSize, setBatchSize] = useState(20);
  const [bulkSyncing, setBulkSyncing] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [syncResult, lastSyncResult] = await Promise.all([
        portalApi.syncStatus(),
        portalApi.getLastSyncTimestamp(),
      ]);
      setData(syncResult);
      setLastSync(lastSyncResult);
    } catch (err) {
      console.error("Failed to load sync status:", err);
      setError(err instanceof Error ? err.message : "Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleRetryFailed = async () => {
    if (!confirm("Retry all failed syncs?")) return;
    try {
      const result = await portalApi.syncRetry();
      alert(result.message);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to retry sync");
    }
  };

  const handleBulkSync = async () => {
    if (!fromDate && !toDate) {
      if (!confirm("শুরু এবং শেষ তারিখ উল্লেখ করা হয়নি। সমস্ত unsynced ডাটা sync করবেন?")) return;
    } else {
      if (!confirm(`তারিখ রেঞ্জ ${fromDate || "শুরু"} থেকে ${toDate || "এখন"} পর্যন্ত bulk sync শুরু করবেন?`)) return;
    }

    setBulkSyncing(true);
    try {
      const result = await portalApi.syncBulk({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        limit: bulkLimit,
        batchSize: batchSize,
      });
      alert(`✅ ${result.message}\n\nQueued: ${result.queued}\nBatch Size: ${result.batchSize || batchSize} parallel\nDate Range: ${result.dateRange.from} to ${result.dateRange.to}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start bulk sync");
    } finally {
      setBulkSyncing(false);
    }
  };

  const getSyncStatusBadge = (status: string) => {
    const badges = {
      SYNCED: { label: "✅ Synced", color: "bg-emerald-900/50 text-emerald-300 border-emerald-700" },
      PENDING: { label: "⏳ Pending", color: "bg-yellow-900/50 text-yellow-300 border-yellow-700" },
      FAILED: { label: "❌ Failed", color: "bg-red-900/50 text-red-300 border-red-700" },
      PERMANENTLY_FAILED: { label: "🚫 Permanent Fail", color: "bg-gray-900 text-gray-400 border-gray-700" },
      SKIPPED: { label: "⊘ Skipped", color: "bg-slate-800 text-slate-400 border-slate-700" },
    };
    return badges[status as keyof typeof badges] || { label: status, color: "bg-slate-800 text-slate-400 border-slate-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading sync status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">ERPNext Sync Status</h2>
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const syncRate = data.totalLogs > 0 ? ((data.synced / data.totalLogs) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">ERPNext Sync Status</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time ERPNext checkin sync monitoring</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              autoRefresh 
                ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700" 
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {autoRefresh ? "🔄 Auto-refresh ON" : "⏸️ Auto-refresh OFF"}
          </button>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <p className="text-slate-400 text-xs font-medium mb-1">Total Logs</p>
          <p className="text-2xl font-bold text-white">{data.totalLogs}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-800 bg-emerald-900/20">
          <p className="text-emerald-400 text-xs font-medium mb-1">✅ Synced</p>
          <p className="text-2xl font-bold text-emerald-300">{data.synced}</p>
          <p className="text-xs text-emerald-400 mt-1">{syncRate}% success</p>
        </div>
        <div className="p-4 rounded-xl border border-yellow-800 bg-yellow-900/20">
          <p className="text-yellow-400 text-xs font-medium mb-1">⏳ Pending</p>
          <p className="text-2xl font-bold text-yellow-300">{data.pending}</p>
        </div>
        <div className="p-4 rounded-xl border border-red-800 bg-red-900/20">
          <p className="text-red-400 text-xs font-medium mb-1">❌ Failed</p>
          <p className="text-2xl font-bold text-red-300">{data.failed}</p>
          {data.failed > 0 && (
            <button
              onClick={handleRetryFailed}
              className="mt-2 text-xs px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-red-200"
            >
              Retry All
            </button>
          )}
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900/40">
          <p className="text-gray-400 text-xs font-medium mb-1">🚫 Permanent Fail</p>
          <p className="text-2xl font-bold text-gray-300">{data.permanentlyFailed}</p>
          <p className="text-xs text-gray-500 mt-1">Max retries (3×)</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
          <p className="text-slate-400 text-xs font-medium mb-1">⊘ Skipped</p>
          <p className="text-2xl font-bold text-slate-300">{data.skipped}</p>
        </div>
      </div>

      {/* Last Sync Info */}
      {lastSync && (
        <div className="p-4 rounded-xl border border-indigo-800 bg-indigo-900/20">
          <h3 className="text-lg font-semibold text-indigo-300 mb-3">🕒 সর্বশেষ Sync তথ্য</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-1">সর্বশেষ Sync সময়:</p>
              <p className="text-white font-mono">
                {lastSync.lastSyncedAt ? new Date(lastSync.lastSyncedAt).toLocaleString("bn-BD") : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">সর্বশেষ Punch সময়:</p>
              <p className="text-white font-mono">
                {lastSync.lastPunchedAt ? new Date(lastSync.lastPunchedAt).toLocaleString("bn-BD") : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">সর্বশেষ ERPNext Checkin ID:</p>
              <p className="text-emerald-400 font-mono text-xs">
                {lastSync.lastCheckinId || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Sync Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60">
          <h3 className="text-lg font-semibold text-white">📦 Bulk Historical Sync</h3>
          <p className="text-slate-400 text-sm mt-1">
            সমস্ত historical data একবারে ERPNext-এ push করুন। প্রথমবার bulk sync চালান, তারপর daily automatic sync হবে।
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                📅 শুরুর তারিখ (From Date)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-slate-500 mt-1">খালি থাকলে সব পুরাতন data</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                📅 শেষ তারিখ (To Date)
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-slate-500 mt-1">খালি থাকলে আজ পর্যন্ত</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                🔢 সর্বোচ্চ সংখ্যা (Limit)
              </label>
              <input
                type="number"
                value={bulkLimit}
                onChange={(e) => setBulkLimit(Math.max(1, parseInt(e.target.value) || 1000))}
                min={1}
                max={10000}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">একবারে সর্বোচ্চ কতটি log</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                ⚡ Batch Size (Parallel)
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 20)))}
                min={1}
                max={50}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">একসাথে কতটি sync (দ্রুত)</p>
            </div>
          </div>

          {/* Sync Button and Stats */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-400">
              {lastSync && (
                <>
                  <p>মোট Logs: <span className="text-white font-semibold">{lastSync.stats.total}</span></p>
                  <p>Synced: <span className="text-emerald-400 font-semibold">{lastSync.stats.synced}</span></p>
                  <p>Unsynced: <span className="text-yellow-400 font-semibold">{lastSync.stats.unsynced}</span></p>
                </>
              )}
            </div>
            
            <button
              onClick={handleBulkSync}
              disabled={bulkSyncing}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                bulkSyncing
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {bulkSyncing ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Syncing...
                </>
              ) : (
                <>🚀 Bulk Sync শুরু করুন</>
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-800 text-blue-300 text-sm">
            <p className="font-semibold mb-2">ℹ️ কিভাবে কাজ করে:</p>
            <ul className="space-y-1 ml-4 text-xs text-blue-400 list-disc">
              <li>প্রথমবার: সমস্ত historical unsynced data ERPNext-এ push করুন (তারিখ রেঞ্জ উল্লেখ করুন বা খালি রাখুন)</li>
              <li><strong>⚡ Batch Processing:</strong> {batchSize}টি log একসাথে parallel-এ sync হবে - অনেক দ্রুত!</li>
              <li>উদাহরণ: 1000 logs, batch size 20 = ~50 batches = অনেক দ্রুত সম্পন্ন হবে</li>
              <li>নিয়মিত: প্রতিদিন auto-sync হবে নতুন punches এর জন্য (manual sync করার দরকার নেই)</li>
              <li>Failed logs "Retry All" বাটন দিয়ে পুনরায় sync করতে পারবেন</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">📝 Recent Sync Logs (Last 50)</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-4">Employee</th>
                <th className="text-left p-4">Time</th>
                <th className="text-left p-4">Device</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Retries</th>
                <th className="text-left p-4">ERPNext ID</th>
                <th className="text-left p-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    📭 No attendance logs found
                  </td>
                </tr>
              ) : (
                data.recentLogs.map((log) => {
                  const statusBadge = getSyncStatusBadge(log.syncStatus);
                  const punchType = log.inOutMode === 0 ? { label: "IN", emoji: "🔓", color: "text-emerald-400" } : 
                                   log.inOutMode === 1 ? { label: "OUT", emoji: "🚪", color: "text-red-400" } : 
                                   { label: "—", emoji: "", color: "text-slate-500" };
                  
                  return (
                    <tr key={log.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="p-4">
                        <div className="font-mono text-indigo-400 text-xs">{log.userPin}</div>
                        {log.employeeName && (
                          <div className="text-slate-400 text-xs">{log.employeeName}</div>
                        )}
                      </td>
                      <td className="p-4 text-slate-300 text-xs">
                        {new Date(log.punchedAt).toLocaleString("bn-BD")}
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-xs">{log.deviceSn}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${punchType.color}`}>
                          {punchType.emoji} {punchType.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {log.syncedAt && (
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(log.syncedAt).toLocaleString("bn-BD")}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {log.syncRetryCount > 0 ? (
                          <span className={`text-xs font-semibold ${log.syncStatus === 'PERMANENTLY_FAILED' ? 'text-gray-400' : 'text-orange-400'}`}>
                            {log.syncRetryCount}/3
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.erpnextCheckinId ? (
                          <code className="text-xs text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">
                            {log.erpnextCheckinId}
                          </code>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.syncError ? (
                          <div className="text-xs text-red-400 max-w-xs truncate" title={log.syncError}>
                            {log.syncError}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Section */}
      <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-800 text-indigo-300 text-sm space-y-2">
        <p className="font-semibold">💡 Status Guide:</p>
        <ul className="space-y-1 ml-4 text-xs text-indigo-400">
          <li>✅ <strong>Synced:</strong> Successfully pushed to ERPNext Employee Checkin</li>
          <li>⏳ <strong>Pending:</strong> Waiting to be synced (will retry automatically)</li>
          <li>❌ <strong>Failed:</strong> Sync error occurred - will auto-retry up to 3 times</li>
          <li>🚫 <strong>Permanent Fail:</strong> Failed 3 times - will NOT retry automatically (fix error manually)</li>
          <li>⊘ <strong>Skipped:</strong> ERPNext disabled or no employee mapping found</li>
        </ul>
        <p className="font-semibold mt-4">🔄 Retry Logic:</p>
        <ul className="space-y-1 ml-4 text-xs text-indigo-400">
          <li>Automatic retry: Maximum <strong>3 attempts</strong> per log</li>
          <li>After 3 failed attempts → status changes to <strong>PERMANENTLY_FAILED</strong></li>
          <li>"Retry All" button: শুধুমাত্র FAILED logs retry করবে (permanently failed না)</li>
          <li>Fix করার জন্য: employee mapping check করুন, ERPNext config verify করুন</li>
        </ul>
      </div>
    </div>
  );
}
