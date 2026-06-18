import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { portalApi } from "../lib/api";

interface Device {
  serialNumber: string;
  name: string | null;
  online?: boolean;
}

interface EmployeeMapping {
  id: string;
  userPin: string;
  employeeName: string;
  erpnextEmployeeId?: string | null;
}

interface DevicePinMapping {
  id: string;
  deviceSn: string;
  userPin: string;
  userName: string | null;
  privilege: number | null;
  enabled: boolean;
  lastSyncedAt: string;
  employee?: EmployeeMapping | null;
}

export default function DevicePinMapping() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [mappings, setMappings] = useState<DevicePinMapping[]>([]);
  const [employees, setEmployees] = useState<EmployeeMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add mapping modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userPin: "",
    employeeName: "",
    selectedEmployeePin: "",
    privilege: 0,
    createEmployeeMapping: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search & filter
  const [searchPin, setSearchPin] = useState("");
  const [searchDevice, setSearchDevice] = useState("");
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [devicesRes, mappingsRes, employeesRes] = await Promise.all([
        portalApi.devices(),
        portalApi.deviceMappings(),
        portalApi.mappings(), // Load existing employees
      ]);

      setDevices(Array.isArray(devicesRes) ? devicesRes : []);
      setMappings(Array.isArray(mappingsRes) ? mappingsRes : []);
      setEmployees(Array.isArray(employeesRes) ? employeesRes : []);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (deviceSn: string) => {
    setSelectedDevice(deviceSn);
    setFormData({
      userPin: "",
      employeeName: "",
      selectedEmployeePin: "",
      privilege: 0,
      createEmployeeMapping: true,
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEmployeeSelect = (employeePin: string) => {
    const employee = employees.find(e => e.userPin === employeePin);
    if (employee) {
      setFormData({
        ...formData,
        selectedEmployeePin: employeePin,
        userPin: employee.userPin,
        employeeName: employee.employeeName,
        createEmployeeMapping: false, // Already exists
      });
    }
  };

  const handleAddMapping = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedDevice) {
      setFormError("No device selected");
      return;
    }

    if (!formData.userPin.trim()) {
      setFormError("PIN is required");
      return;
    }

    if (!/^\d+$/.test(formData.userPin)) {
      setFormError("PIN must be numeric");
      return;
    }

    if (!formData.employeeName.trim()) {
      setFormError("Employee name is required");
      return;
    }

    setSubmitting(true);
    try {
      setFormError(null);
      
      await portalApi.createDeviceMapping({
        deviceSn: selectedDevice,
        userPin: formData.userPin,
        privilege: formData.privilege,
        createEmployeeMapping: formData.createEmployeeMapping,
        employeeName: formData.employeeName,
      });

      setShowAddModal(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create mapping:", err);
      setFormError(err instanceof Error ? err.message : "Failed to create mapping");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMapping = async (deviceSn: string, userPin: string) => {
    if (!confirm(`Delete mapping for PIN ${userPin} from ${deviceSn}?`)) return;

    try {
      setError(null);
      await portalApi.deleteDeviceMapping(deviceSn, userPin);
      await loadData();
    } catch (err) {
      console.error("Failed to delete mapping:", err);
      setError(err instanceof Error ? err.message : "Failed to delete mapping");
    }
  };

  const getPrivilegeLabel = (level: number | null) => {
    switch (level) {
      case 0: return "User";
      case 1: return "Manager";
      case 2: return "Admin";
      default: return "Unknown";
    }
  };

  const filteredMappings = mappings.filter(m => {
    const pinMatch = !searchPin || m.userPin.includes(searchPin);
    const deviceMatch = !searchDevice || m.deviceSn.includes(searchDevice);
    return pinMatch && deviceMatch;
  });

  const groupedByDevice = new Map<string, DevicePinMapping[]>();
  for (const mapping of filteredMappings) {
    if (!groupedByDevice.has(mapping.deviceSn)) {
      groupedByDevice.set(mapping.deviceSn, []);
    }
    groupedByDevice.get(mapping.deviceSn)?.push(mapping);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Employee Device PIN Mapping</h2>
        <p className="text-slate-400 text-sm">Assign employees to devices with PIN numbers</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by PIN..."
            value={searchPin}
            onChange={(e) => setSearchPin(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by device..."
            value={searchDevice}
            onChange={(e) => setSearchDevice(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-3xl font-bold text-indigo-400">{devices.length}</div>
          <div className="text-sm text-slate-400">Total Devices</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-green-400">{mappings.length}</div>
          <div className="text-sm text-slate-400">Total Mappings</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-blue-400">
            {devices.filter(d => d.online).length}
          </div>
          <div className="text-sm text-slate-400">Online Devices</div>
        </Card>
      </div>

      {/* Devices & Mappings */}
      <div className="space-y-4">
        {devices.map((device) => {
          const deviceMappings = groupedByDevice.get(device.serialNumber) || [];
          const isExpanded = expandedDevice === device.serialNumber;

          return (
            <div
              key={device.serialNumber}
              className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            >
              {/* Device Header */}
              <button
                onClick={() =>
                  setExpandedDevice(isExpanded ? null : device.serialNumber)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          device.online ? "bg-green-500" : "bg-slate-600"
                        }`}
                      />
                      <span className="font-semibold text-white">{device.name || device.serialNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      SN: {device.serialNumber} • {deviceMappings.length} mappings
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddModal(device.serialNumber);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm hover:bg-indigo-700 whitespace-nowrap"
                >
                  Add Mapping
                </button>

                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {/* Device Mappings List */}
              {isExpanded && (
                <div className="border-t border-slate-800 divide-y divide-slate-800">
                  {deviceMappings.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      No mappings for this device
                    </div>
                  ) : (
                    deviceMappings.map((mapping) => (
                      <div
                        key={`${mapping.deviceSn}-${mapping.userPin}`}
                        className="p-4 hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          <div>
                            <div className="font-mono text-sm font-semibold text-white">
                              {mapping.userPin}
                            </div>
                            <p className="text-xs text-slate-500">PIN</p>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-sm text-white">
                              {mapping.employee?.employeeName || mapping.userName || "—"}
                            </div>
                            <p className="text-xs text-slate-500">
                              {mapping.employee?.erpnextEmployeeId
                                ? `ERPNext: ${mapping.employee.erpnextEmployeeId}`
                                : "No ERPNext mapping"}
                            </p>
                          </div>

                          <div>
                            <span className="inline-block px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                              {getPrivilegeLabel(mapping.privilege)}
                            </span>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                handleDeleteMapping(mapping.deviceSn, mapping.userPin)
                              }
                              className="px-3 py-1 rounded bg-red-900/30 text-red-400 text-xs hover:bg-red-900/50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {devices.length === 0 && (
          <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center">
            <p className="text-slate-400">No devices found. Add devices first.</p>
          </div>
        )}
      </div>

      {/* Add Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Device PIN Mapping</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMapping} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Device Serial Number
                </label>
                <div className="text-sm font-mono text-white bg-slate-950 border border-slate-700 rounded px-3 py-2">
                  {selectedDevice}
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Select Existing Employee (Optional)
                </label>
                <select
                  value={formData.selectedEmployeePin}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="">-- Select Employee or Enter New --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.userPin}>
                      {emp.employeeName} (PIN: {emp.userPin})
                      {emp.erpnextEmployeeId && ` - ${emp.erpnextEmployeeId}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  অথবা নিচে নতুন employee তথ্য দিন
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  PIN (Numeric) *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 101"
                  value={formData.userPin}
                  onChange={(e) =>
                    setFormData({ ...formData, userPin: e.target.value, selectedEmployeePin: "" })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Employee Name *
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={formData.employeeName}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeName: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Privilege Level
                </label>
                <select
                  value={formData.privilege}
                  onChange={(e) =>
                    setFormData({ ...formData, privilege: parseInt(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value={0}>User (Default)</option>
                  <option value={1}>Manager</option>
                  <option value={2}>Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createEmployeeMapping}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      createEmployeeMapping: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm text-slate-400">
                  Create employee mapping
                </span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50 hover:bg-indigo-700"
                >
                  {submitting ? "Creating..." : "Create Mapping"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-sm hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
