import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { portalApi } from "../lib/api";

interface Device {
  serialNumber: string;
  name: string;
  online: boolean;
}

interface DeviceUser {
  id: string;
  userPin: string;
  userName: string | null;
  privilege: number | null;
  enabled: boolean;
  lastSyncedAt: string;
}

interface DeviceGroup {
  device: Device;
  users: DeviceUser[];
  count: number;
}

export default function DeviceUsers() {
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedDeviceSn, setSelectedDeviceSn] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userPin: "",
    userName: "",
    privilege: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadDeviceUsers();
  }, []);

  const loadDeviceUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await portalApi.deviceUsers();
      setDeviceGroups(data.devices);
      setTotalUsers(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load device users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserClick = (deviceSn: string) => {
    setSelectedDeviceSn(deviceSn);
    setFormData({ userPin: "", userName: "", privilege: 0 });
    setFormError(null);
    setShowAddUserModal(true);
  };

  const handleAddUser = async () => {
    if (!selectedDeviceSn) return;

    // Validate
    if (!formData.userPin.trim()) {
      setFormError("User ID (PIN) is required");
      return;
    }
    if (!/^\d+$/.test(formData.userPin)) {
      setFormError("User ID must be numeric");
      return;
    }
    if (!formData.userName.trim()) {
      setFormError("User name is required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await portalApi.createDeviceUser(selectedDeviceSn, {
        userPin: formData.userPin,
        userName: formData.userName,
        privilege: formData.privilege,
      });

      // Reload device users
      await loadDeviceUsers();
      setShowAddUserModal(false);
      setFormData({ userPin: "", userName: "", privilege: 0 });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const getPrivilegeLabel = (privilege: number | null): string => {
    if (privilege === null) return "Unknown";
    if (privilege === 0) return "User";
    if (privilege === 1) return "Manager";
    if (privilege === 2) return "Admin";
    return `Level ${privilege}`;
  };

  const getPrivilegeColor = (privilege: number | null): string => {
    if (privilege === 0) return "bg-blue-900/40 text-blue-300";
    if (privilege === 1) return "bg-yellow-900/40 text-yellow-300";
    if (privilege === 2) return "bg-red-900/40 text-red-300";
    return "bg-slate-800 text-slate-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading device users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Device Users</h1>
          <p className="text-slate-400 text-sm">Users registered on your biometric devices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadDeviceUsers}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Devices" value={deviceGroups.length} />
        <Card title="Total Users" value={totalUsers} />
        <Card
          title="Online Devices"
          value={deviceGroups.filter(g => g.device.online).length}
        />
      </div>

      {/* Device Groups */}
      {deviceGroups.length === 0 ? (
        <Card className="bg-slate-800/50">
          <div className="p-8 text-center text-slate-400">
            No devices with users found
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {deviceGroups.map((group) => (
            <Card key={group.device.serialNumber} className="border border-slate-700">
              <div className="p-6">
                {/* Device Header */}
                <button
                  onClick={() =>
                    setExpandedDevice(
                      expandedDevice === group.device.serialNumber
                        ? null
                        : group.device.serialNumber
                    )
                  }
                  className="w-full flex justify-between items-center hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {group.device.name || group.device.serialNumber}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">{group.device.serialNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        group.device.online
                          ? "bg-green-900/40 text-green-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {group.device.online ? "Online" : "Offline"}
                    </span>
                    <span className="px-3 py-1 rounded text-xs font-semibold bg-indigo-900/40 text-indigo-300">
                      {group.count} users
                    </span>
                    <span className="text-slate-400">
                      {expandedDevice === group.device.serialNumber ? "▼" : "▶"}
                    </span>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedDevice === group.device.serialNumber && (
                  <div className="mt-6 border-t border-slate-700 pt-6 space-y-4">
                    {/* Add User Button */}
                    <button
                      onClick={() => handleAddUserClick(group.device.serialNumber)}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold text-white transition"
                    >
                      + Add User
                    </button>

                    {group.users.length === 0 ? (
                      <p className="text-slate-400 text-sm">No users registered on this device</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left py-3 px-2 text-slate-400 font-semibold">ID</th>
                              <th className="text-left py-3 px-2 text-slate-400 font-semibold">Name</th>
                              <th className="text-left py-3 px-2 text-slate-400 font-semibold">Role</th>
                              <th className="text-left py-3 px-2 text-slate-400 font-semibold">Status</th>
                              <th className="text-left py-3 px-2 text-slate-400 font-semibold">Last Synced</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.users.map((user) => (
                              <tr
                                key={user.id}
                                className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                              >
                                <td className="py-3 px-2 font-mono text-xs text-indigo-300">
                                  {user.userPin}
                                </td>
                                <td className="py-3 px-2 text-slate-300">
                                  {user.userName || "—"}
                                </td>
                                <td className="py-3 px-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${getPrivilegeColor(
                                      user.privilege
                                    )}`}
                                  >
                                    {getPrivilegeLabel(user.privilege)}
                                  </span>
                                </td>
                                <td className="py-3 px-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                      user.enabled
                                        ? "bg-green-900/40 text-green-300"
                                        : "bg-red-900/40 text-red-300"
                                    }`}
                                  >
                                    {user.enabled ? "Enabled" : "Disabled"}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-xs text-slate-400">
                                  {new Date(user.lastSyncedAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add User to Device</h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    User ID (PIN)
                  </label>
                  <input
                    type="text"
                    value={formData.userPin}
                    onChange={(e) => setFormData({ ...formData, userPin: e.target.value })}
                    placeholder="e.g., 10001"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Numeric ID for the user</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="e.g., John Doe"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role/Privilege
                  </label>
                  <select
                    value={formData.privilege}
                    onChange={(e) => setFormData({ ...formData, privilege: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>User (Standard)</option>
                    <option value={1}>Manager</option>
                    <option value={2}>Admin</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">User's privilege level on the device</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
