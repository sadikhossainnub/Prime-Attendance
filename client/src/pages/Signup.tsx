import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../lib/api";
import { setSession } from "../lib/auth";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    plan: "STARTER" as const,
    contactEmail: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (form.adminPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (form.adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (!form.slug.match(/^[a-z0-9-]+$/)) {
      setError("Slug must contain only lowercase letters, numbers, and hyphens");
      setLoading(false);
      return;
    }

    try {
      const result = await authApi.signup({
        companyName: form.companyName,
        slug: form.slug,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        plan: form.plan,
        contactEmail: form.contactEmail || undefined,
      });

      setSession(result.token, result.user);
      navigate("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Prime Attendance</h1>
          <p className="text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Company Info */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Company Name</label>
            <input
              required
              type="text"
              placeholder="ACME Corporation"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Slug (URL-friendly)</label>
            <input
              required
              type="text"
              placeholder="acme-corp"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">Lowercase letters, numbers, hyphens only</p>
          </div>

          {/* Admin Info */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Admin Name</label>
            <input
              required
              type="text"
              placeholder="John Doe"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Admin Email</label>
            <input
              required
              type="email"
              placeholder="admin@acme.com"
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Plan</label>
            <div className="space-y-2">
              {["STARTER", "BUSINESS", "ENTERPRISE"].map((plan) => (
                <label key={plan} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="plan"
                    value={plan}
                    checked={form.plan === plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">{plan}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Contact Email (optional)</label>
            <input
              type="email"
              placeholder="contact@acme.com"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 hover:bg-indigo-500"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:underline">
              Login
            </Link>
          </p>
        </form>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-2xl mb-1">📱</div>
            <p className="text-slate-400">Device Management</p>
          </div>
          <div>
            <div className="text-2xl mb-1">👥</div>
            <p className="text-slate-400">Employee Tracking</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📊</div>
            <p className="text-slate-400">Real-time Reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
