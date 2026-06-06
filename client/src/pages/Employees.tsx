import { useEffect, useState } from "react";
import { portalApi, type EmployeeMapping } from "../lib/api";

interface EmployeeFormData {
  // Device ID
  userPin: string;
  attendanceDeviceId: string; // Biometric/RF tag ID
  
  // Basic Info
  firstName: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  gender: string;
  dateOfBirth: string;
  dateOfJoining: string;
  
  // Employment
  status: string;
  company: string;
  department: string;
  designation: string;
  employmentType: string;
  
  // Contact
  cellNumber: string;
  personalEmail: string;
  companyEmail: string;
  
  // Address
  currentAddress: string;
  permanentAddress: string;
  
  // ERPNext
  erpnextEmployeeId: string;
}

const initialFormData: EmployeeFormData = {
  userPin: "",
  attendanceDeviceId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  employeeName: "",
  gender: "",
  dateOfBirth: "",
  dateOfJoining: "",
  status: "Active",
  company: "",
  department: "",
  designation: "",
  employmentType: "",
  cellNumber: "",
  personalEmail: "",
  companyEmail: "",
  currentAddress: "",
  permanentAddress: "",
  erpnextEmployeeId: "",
};

export default function Employees() {
  const [mappings, setMappings] = useState<EmployeeMapping[]>([]);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showFullForm, setShowFullForm] = useState(false);
  const [erpnextEmployees, setErpnextEmployees] = useState<any[]>([]);
  const [loadingErpnext, setLoadingErpnext] = useState(false);
  const [showErpnextModal, setShowErpnextModal] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const result = await portalApi.mappings();
      setMappings(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to load mappings:", err);
      setError(err instanceof Error ? err.message : "Failed to load mappings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-fill employee name from first, middle, last names
  useEffect(() => {
    const nameParts = [formData.firstName, formData.middleName, formData.lastName]
      .filter(Boolean)
      .join(" ");
    if (nameParts && nameParts !== formData.employeeName) {
      setFormData(prev => ({ ...prev, employeeName: nameParts }));
    }
  }, [formData.firstName, formData.middleName, formData.lastName]);

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      
      // For now, we're still using the basic API
      // TODO: Update backend to accept full employee data
      await portalApi.saveMapping({ 
        userPin: formData.userPin, 
        employeeName: formData.employeeName, 
        erpnextEmployeeId: formData.erpnextEmployeeId || null 
      });
      
      setFormData(initialFormData);
      await load();
    } catch (err) {
      console.error("Failed to save employee:", err);
      setError(err instanceof Error ? err.message : "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (pin: string) => {
    if (!confirm("Delete this mapping?")) return;
    try {
      setError(null);
      await portalApi.deleteMapping(pin);
      await load();
    } catch (err) {
      console.error("Failed to delete mapping:", err);
      setError(err instanceof Error ? err.message : "Failed to delete mapping");
    }
  };

  const loadErpnextEmployees = async () => {
    setLoadingErpnext(true);
    setImportError(null);
    try {
      const result = await portalApi.fetchErpnextEmployees();
      setErpnextEmployees(result.employees);
      setShowErpnextModal(true);
    } catch (err) {
      console.error("Failed to load ERPNext employees:", err);
      setImportError(err instanceof Error ? err.message : "Failed to load ERPNext employees");
    } finally {
      setLoadingErpnext(false);
    }
  };

  const importFromErpnext = (employee: any) => {
    setFormData({
      userPin: employee.attendance_device_id || "",
      attendanceDeviceId: employee.attendance_device_id || "",
      firstName: employee.first_name || "",
      middleName: employee.middle_name || "",
      lastName: employee.last_name || "",
      employeeName: employee.employee_name || "",
      gender: employee.gender || "",
      dateOfBirth: employee.date_of_birth || "",
      dateOfJoining: employee.date_of_joining || "",
      status: employee.status || "Active",
      company: employee.company || "",
      department: employee.department || "",
      designation: employee.designation || "",
      employmentType: employee.employment_type || "",
      cellNumber: employee.cell_number || "",
      personalEmail: employee.personal_email || "",
      companyEmail: employee.company_email || "",
      currentAddress: employee.current_address || "",
      permanentAddress: employee.permanent_address || "",
      erpnextEmployeeId: employee.name || "",
    });
    setShowErpnextModal(false);
    setShowFullForm(true);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header and one data row");
      }

      // Parse header
      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const idIndex = header.indexOf("id");
      const nameIndex = header.indexOf("name");
      const erpnextIndex = header.indexOf("erpnext") || header.indexOf("erpnext_id");

      if (idIndex === -1 || nameIndex === -1) {
        throw new Error("CSV must have 'ID' and 'Name' columns");
      }

      // Parse data rows
      const rows = lines.slice(1).filter(line => line.trim());
      let imported = 0;
      let failed = 0;

      for (const line of rows) {
        try {
          const values = line.split(",").map(v => v.trim());
          const id = values[idIndex];
          const name = values[nameIndex];
          const erpnext = erpnextIndex !== -1 ? values[erpnextIndex] : null;

          if (!id || !name) {
            failed++;
            continue;
          }

          await portalApi.saveMapping({
            userPin: id,
            employeeName: name,
            erpnextEmployeeId: erpnext || null,
          });
          imported++;
        } catch {
          failed++;
        }
      }

      setImportSuccess(`Imported ${imported} employees${failed > 0 ? `, ${failed} failed` : ""}`);
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import CSV");
    } finally {
      setLoading(false);
      // Reset file input
      if (e.target) e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "ID,Name,ERPNext\n101,আহমেদ আলী,EMP-001\n102,ফাতিমা বেগম,EMP-002\n";
    const blob = new Blob([template], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "employees-template.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employees</h2>
        <p className="text-slate-400 text-sm">Manage Employee Records & Device Mapping</p>
      </div>
      
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {error}
        </div>
      )}
      {importError && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="p-4 rounded-lg bg-green-900/20 border border-green-800 text-green-300">
          {importSuccess}
        </div>
      )}

      {/* Employee Form */}
      <form onSubmit={onSubmit} className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Add New Employee</h3>
          <button
            type="button"
            onClick={() => setShowFullForm(!showFullForm)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {showFullForm ? "Show Quick Form" : "Show All Fields"}
          </button>
        </div>

        {/* Quick Form */}
        {!showFullForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Device ID *</label>
              <input
                required
                placeholder="e.g., 101"
                value={formData.userPin}
                onChange={(e) => handleInputChange("userPin", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Employee Name *</label>
              <input
                required
                placeholder="Full Name"
                value={formData.employeeName}
                onChange={(e) => handleInputChange("employeeName", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">ERPNext ID</label>
              <input
                placeholder="EMP-001"
                value={formData.erpnextEmployeeId}
                onChange={(e) => handleInputChange("erpnextEmployeeId", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50 hover:bg-indigo-700"
              >
                {loading ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>
        )}

        {/* Full Form */}
        {showFullForm && (
          <div className="space-y-6">
            {/* Device & Identification */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                Device & Identification
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Device ID (PIN) *</label>
                  <input
                    required
                    placeholder="101"
                    value={formData.userPin}
                    onChange={(e) => handleInputChange("userPin", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">ID used on attendance device</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Biometric/RF Tag ID</label>
                  <input
                    placeholder="BIO-12345"
                    value={formData.attendanceDeviceId}
                    onChange={(e) => handleInputChange("attendanceDeviceId", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Biometric or RFID card number</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ERPNext Employee ID</label>
                  <input
                    placeholder="EMP-001"
                    value={formData.erpnextEmployeeId}
                    onChange={(e) => handleInputChange("erpnextEmployeeId", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Link to ERPNext employee</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">First Name *</label>
                  <input
                    required
                    placeholder="Ahmed"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Middle Name</label>
                  <input
                    placeholder="Ali"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange("middleName", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Last Name *</label>
                  <input
                    required
                    placeholder="Khan"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Full Name (Auto)</label>
                  <input
                    value={formData.employeeName}
                    onChange={(e) => handleInputChange("employeeName", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                    placeholder="Auto-filled"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => handleInputChange("dateOfJoining", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Left">Left</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                Employment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Company</label>
                  <input
                    placeholder="Prime Tech BD"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Department</label>
                  <input
                    placeholder="IT Department"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Designation</label>
                  <input
                    placeholder="Software Engineer"
                    value={formData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => handleInputChange("employmentType", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Probation">Probation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Cell Number</label>
                  <input
                    type="tel"
                    placeholder="+880 1712-345678"
                    value={formData.cellNumber}
                    onChange={(e) => handleInputChange("cellNumber", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Personal Email</label>
                  <input
                    type="email"
                    placeholder="personal@example.com"
                    value={formData.personalEmail}
                    onChange={(e) => handleInputChange("personalEmail", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Company Email</label>
                  <input
                    type="email"
                    placeholder="employee@company.com"
                    value={formData.companyEmail}
                    onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                Address Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Current Address</label>
                  <textarea
                    rows={3}
                    placeholder="Current residential address"
                    value={formData.currentAddress}
                    onChange={(e) => handleInputChange("currentAddress", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Permanent Address</label>
                  <textarea
                    rows={3}
                    placeholder="Permanent address"
                    value={formData.permanentAddress}
                    onChange={(e) => handleInputChange("permanentAddress", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-sm disabled:opacity-50 hover:bg-indigo-700"
              >
                {loading ? "Saving..." : "Save Employee"}
              </button>
              <button
                type="button"
                onClick={() => setFormData(initialFormData)}
                className="px-6 py-2 rounded-lg bg-slate-700 text-sm hover:bg-slate-600"
              >
                Clear Form
              </button>
            </div>
          </div>
        )}
      </form>

      {/* CSV Import Section */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <h3 className="font-semibold text-white mb-3">Bulk Import (CSV)</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="px-4 py-2 rounded-lg bg-slate-800 text-sm cursor-pointer hover:bg-slate-700">
            Choose CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              disabled={loading}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 rounded-lg bg-slate-700 text-sm hover:bg-slate-600"
          >
            Download Template
          </button>
          <p className="text-xs text-slate-400">CSV format: ID, Name, ERPNext (optional)</p>
        </div>
      </div>

      {/* ERPNext Import Section */}
      <div className="p-4 rounded-xl border border-green-800/30 bg-green-900/10">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Import from ERPNext
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={loadErpnextEmployees}
            disabled={loadingErpnext}
            className="px-4 py-2 rounded-lg bg-green-700 text-sm hover:bg-green-600 disabled:opacity-50"
          >
            {loadingErpnext ? "Loading..." : "Load Employees from ERPNext"}
          </button>
          <p className="text-xs text-slate-400">
            Fetch employee data directly from your ERPNext system
          </p>
        </div>
      </div>

      {/* ERPNext Employees Modal */}
      {showErpnextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-6xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">ERPNext Employees ({erpnextEmployees.length})</h3>
              <button
                onClick={() => setShowErpnextModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Department</th>
                    <th className="text-left p-3">Designation</th>
                    <th className="text-left p-3">Device ID</th>
                    <th className="text-left p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {erpnextEmployees.map((emp) => (
                    <tr key={emp.name} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-xs">{emp.name}</td>
                      <td className="p-3">{emp.employee_name}</td>
                      <td className="p-3 text-slate-400 text-xs">{emp.department || "—"}</td>
                      <td className="p-3 text-slate-400 text-xs">{emp.designation || "—"}</td>
                      <td className="p-3 font-mono text-xs">{emp.attendance_device_id || "—"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => importFromErpnext(emp)}
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-xs"
                        >
                          Import
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <table className="w-full text-sm rounded-xl border border-slate-800 overflow-hidden">
        <thead className="bg-slate-900 text-slate-400">
          <tr><th className="text-left p-3">ID</th><th className="text-left p-3">Name</th><th className="text-left p-3">ERPNext</th><th className="text-left p-3">Action</th></tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-t border-slate-800">
              <td className="p-3 font-mono">{m.userPin}</td>
              <td className="p-3">{m.employeeName}</td>
              <td className="p-3 text-xs">{m.erpnextEmployeeId ?? "—"}</td>
              <td className="p-3">
                <button
                  onClick={() => onDelete(m.userPin)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
