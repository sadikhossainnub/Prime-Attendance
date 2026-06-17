import { useEffect, useState } from "react";
import { portalApi } from "../lib/api";

interface SyncStatusData {
  totalLogs: number;
  synced: number;
  pending: number;
  failed: number;
  skipped: number;
  recentLogs: Array<{
    id: string;
    userPin: string;
    employeeName: string | null;
    punchedAt: string;
    deviceSn: string;
    inOutMode: number | null;
    syncStatus: string;
    erpnextCheckinId: string | null;
    syncError: string | null;
    syncedAt: string | null;
  }>;
}

export function SyncStatus() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    try {
      setError(null);
      const result = await portalApi.syncStatus();
      setData(result);
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

  const getSyncStatusBadge = (status: string) => {
    const badges = {
      SYNCED: { label: "✅ Synced", color: "bg-emerald-900/50 text-emerald-300 border-emerald-700" },
      PENDING: { label: "⏳ Pending", color: "bg-yellow-900/50 text-yellow-300 border-yellow-700" },
      FAILED: { label: "❌ Failed", color: "bg-red-900/50 text-red-300 border-red-700" },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
          <p className="text-slate-400 text-xs font-medium mb-1">⊘ Skipped</p>
          <p className="text-2xl font-bold text-slate-300">{data.skipped}</p>
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
                <th className="text-left p-4">ERPNext ID</th>
                <th className="text-left p-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
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
          <li>❌ <strong>Failed:</strong> Sync error occurred - check error message and employee mapping</li>
          <li>⊘ <strong>Skipped:</strong> ERPNext disabled or no employee mapping found</li>
        </ul>
      </div>
    </div>
  );
}
