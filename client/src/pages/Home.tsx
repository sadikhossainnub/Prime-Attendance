import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">PA</span>
            </div>
            <span className="text-xl font-bold text-white">Prime Attendance</span>
          </div>
          <div className="flex gap-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate("/portal")}
                  className="px-4 py-2 text-slate-300 hover:text-white transition"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/portal/billing")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Billing
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 text-slate-300 hover:text-white transition"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
            Smart Attendance Management
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">
              for Modern Businesses
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Track employee attendance in real-time with biometric devices. Sync seamlessly with ERPNext and manage your workforce efficiently.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-105"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-semibold rounded-lg transition"
            >
              View Pricing
            </button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 blur-3xl rounded-full"></div>
          <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <div className="text-3xl font-bold text-indigo-400">10K+</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
              <div className="p-4 border-l border-r border-slate-700">
                <div className="text-3xl font-bold text-blue-400">500+</div>
                <div className="text-sm text-slate-400">Companies</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-purple-400">99.9%</div>
                <div className="text-sm text-slate-400">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">Powerful Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: "📱",
              title: "Real-Time Tracking",
              description: "Track attendance in real-time with biometric devices. Get instant notifications for punch-ins and punch-outs.",
            },
            {
              icon: "🔄",
              title: "ERPNext Integration",
              description: "Seamlessly sync attendance data with ERPNext. Automate your HR workflows and eliminate manual data entry.",
            },
            {
              icon: "📊",
              title: "Advanced Analytics",
              description: "Get detailed insights into attendance patterns, employee productivity, and workforce trends.",
            },
            {
              icon: "🔐",
              title: "Enterprise Security",
              description: "Bank-level security with encrypted data transmission and multi-tenant isolation for complete data protection.",
            },
            {
              icon: "⚡",
              title: "Lightning Fast",
              description: "Optimized performance with sub-second response times. Handle thousands of concurrent users effortlessly.",
            },
            {
              icon: "🌍",
              title: "Multi-Device Support",
              description: "Support for multiple biometric devices. Manage unlimited devices across multiple locations.",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 transition group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
          Choose the perfect plan for your business. All plans include 30-day free trial.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "STARTER",
              monthly: 2999,
              yearly: 29990,
              description: "Perfect for small teams",
              features: [
                "Up to 50 employees",
                "1 biometric device",
                "Basic analytics",
                "Email support",
                "30-day data retention",
              ],
            },
            {
              name: "BUSINESS",
              monthly: 9999,
              yearly: 99990,
              description: "For growing companies",
              features: [
                "Up to 500 employees",
                "10 biometric devices",
                "Advanced analytics",
                "Priority support",
                "1-year data retention",
                "ERPNext integration",
              ],
              popular: true,
            },
            {
              name: "ENTERPRISE",
              monthly: 29999,
              yearly: 299990,
              description: "For large organizations",
              features: [
                "Unlimited employees",
                "Unlimited devices",
                "Custom analytics",
                "24/7 dedicated support",
                "Unlimited data retention",
                "ERPNext integration",
                "Custom integrations",
                "SLA guarantee",
              ],
            },
          ].map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl border transition transform hover:scale-105 ${
                plan.popular
                  ? "bg-gradient-to-br from-indigo-600/20 to-blue-600/20 border-indigo-500/50 ring-2 ring-indigo-500/20 md:scale-105"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="p-8">
                {plan.popular && (
                  <div className="mb-4 inline-block px-3 py-1 bg-indigo-600/20 border border-indigo-500/50 rounded-full text-sm font-semibold text-indigo-300">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.monthly}</span>
                    <span className="text-slate-400">BDT</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">per month, billed monthly</p>
                  <p className="text-sm text-slate-500 mt-2">or {plan.yearly} BDT yearly (save 17%)</p>
                </div>

                <button
                  onClick={() => navigate("/signup")}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition mb-6 ${
                    plan.popular
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400"
                  }`}
                >
                  Get Started
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-center gap-3">
                      <span className="text-indigo-400">✓</span>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              step: "1",
              title: "Sign Up",
              description: "Create your account and set up your organization in minutes.",
            },
            {
              step: "2",
              title: "Add Devices",
              description: "Connect your biometric devices to the platform.",
            },
            {
              step: "3",
              title: "Import Employees",
              description: "Add your employees and map them to device IDs.",
            },
            {
              step: "4",
              title: "Track & Analyze",
              description: "Start tracking attendance and get real-time insights.",
            },
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.description}</p>
              </div>
              {idx < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "What devices are supported?",
              a: "We support all major biometric devices including fingerprint, face recognition, and RFID card readers. Check our device compatibility list for specific models.",
            },
            {
              q: "Can I integrate with ERPNext?",
              a: "Yes! All plans except STARTER include ERPNext integration. Attendance data syncs automatically to your ERPNext instance.",
            },
            {
              q: "Is there a free trial?",
              a: "Yes, all plans include a 30-day free trial with full access to all features. No credit card required.",
            },
            {
              q: "How is my data secured?",
              a: "We use bank-level encryption, multi-tenant isolation, and comply with international data protection standards. Your data is backed up daily.",
            },
            {
              q: "What support do you offer?",
              a: "We offer email support for STARTER, priority support for BUSINESS, and 24/7 dedicated support for ENTERPRISE plans.",
            },
            {
              q: "Can I upgrade or downgrade my plan?",
              a: "Yes, you can change your plan anytime. We'll prorate the charges based on your billing cycle.",
            },
          ].map((item, idx) => (
            <details
              key={idx}
              className="group bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-indigo-500/50 transition cursor-pointer"
            >
              <summary className="flex justify-between items-center font-semibold text-white">
                {item.q}
                <span className="text-indigo-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-slate-400 mt-4">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border border-indigo-500/50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Attendance Management?</h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            Join thousands of companies using Prime Attendance to streamline their workforce management.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-105"
          >
            Start Your Free Trial Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PA</span>
                </div>
                <span className="font-bold text-white">Prime Attendance</span>
              </div>
              <p className="text-slate-400 text-sm">Smart attendance management for modern businesses.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 Prime Attendance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
