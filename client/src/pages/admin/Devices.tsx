import React, { useState, useEffect } from "react";
import {
  DevicePunchTypeSelector,
  DevicePunchTypeBadge,
} from "../../components/DevicePunchTypeSelector";

interface Device {
  id: string;
  serialNumber: string;
  name: string;
  punchType: "BOTH" | "IN_ONLY" | "OUT_ONLY";
  punchTypeLabel: string;
  lastSeenAt: string | null;
  isOnline: boolean;
}

export function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editingPunchType, setEditingPunchType] = useState<
    "BOTH" | "IN_ONLY" | "OUT_ONLY"
  >("BOTH");
  const [filterType, setFilterType] = useState<
    "ALL" | "BOTH" | "IN_ONLY" | "OUT_ONLY"
  >("ALL");

  // Fetch devices
  useEffect(() => {
    fetchDevices();
  }, [filterType]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const query = filterType !== "ALL" ? `?punchType=${filterType}` : "";
      const response = await fetch(`/api/admin/devices${query}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setDevices(data.data || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePunchType = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/admin/devices/${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ punchType: editingPunchType }),
      });

      if (response.ok) {
        setEditingDevice(null);
        fetchDevices();
      }
    } catch (error) {
      console.error("Failed to update device:", error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading devices...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Devices Management</h1>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Punch Type:
        </label>
        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(
              e.target.value as "ALL" | "BOTH" | "IN_ONLY" | "OUT_ONLY"
            )
          }
          className="p-2 border rounded"
        >
          <option value="ALL">All Devices</option>
          <option value="BOTH">Both IN & OUT</option>
          <option value="IN_ONLY">IN Only</option>
          <option value="OUT_ONLY">OUT Only</option>
        </select>
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Serial Number</th>
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Punch Type</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Last Seen</th>
              <th className="border p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="border p-2">{device.serialNumber}</td>
                <td className="border p-2">{device.name || "-"}</td>
                <td className="border p-2">
                  {editingDevice === device.id ? (
                    <DevicePunchTypeSelector
                      value={editingPunchType}
                      onChange={setEditingPunchType}
                    />
                  ) : (
                    <DevicePunchTypeBadge type={device.punchType} />
                  )}
                </td>
                <td className="border p-2">
                  {device.isOnline ? (
                    <span className="text-green-600">🟢 Online</span>
                  ) : (
                    <span className="text-red-600">🔴 Offline</span>
                  )}
                </td>
                <td className="border p-2">
                  {device.lastSeenAt
                    ? new Date(device.lastSeenAt).toLocaleString()
                    : "Never"}
                </td>
                <td className="border p-2">
                  {editingDevice === device.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdatePunchType(device.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDevice(null)}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingDevice(device.id);
                        setEditingPunchType(device.punchType);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No devices found
        </div>
      )}

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.punchType === "BOTH").length}
          </div>
          <div className="text-sm text-gray-600">Both IN & OUT</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.punchType === "IN_ONLY").length}
          </div>
          <div className="text-sm text-gray-600">IN Only</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.punchType === "OUT_ONLY").length}
          </div>
          <div className="text-sm text-gray-600">OUT Only</div>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.isOnline).length}/{devices.length}
          </div>
          <div className="text-sm text-gray-600">Online</div>
        </div>
      </div>
    </div>
  );
}
