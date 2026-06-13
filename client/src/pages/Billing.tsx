import { useEffect, useState } from "react";
import { billingApi, type Subscription, type Invoice, type PricingInfo } from "../lib/api";
import { Card } from "../components/Card";

export function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"STARTER" | "BUSINESS" | "ENTERPRISE" | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [upgrading, setUpgrading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [sub, invs, prices] = await Promise.all([
        billingApi.getSubscription().catch(() => null),
        billingApi.getInvoices(50).catch(() => []),
        billingApi.getPricing().catch(() => null),
      ]);
      setSubscription(sub);
      setInvoices(invs || []);
      setPricing(prices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgradePlan() {
    if (!selectedPlan) return;
    try {
      setUpgrading(true);
      const result = await billingApi.upgradePlan(selectedPlan);
      setSubscription(result.subscription);
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      alert(`✅ Plan upgraded successfully! Prorated amount: ${result.proratedAmount.toFixed(2)} BDT`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upgrade plan");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      setCancelling(true);
      await billingApi.cancelSubscription(cancelReason || undefined);
      setSubscription(null);
      setShowCancelModal(false);
      setCancelReason("");
      alert("✅ Subscription cancelled successfully");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">বিলিং তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">বিলিং & সাবস্ক্রিপশন</h2>
        <p className="text-slate-400 text-sm mt-1">আপনার প্ল্যান এবং ইনভয়েস ম্যানেজ করুন</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Current Subscription */}
      {subscription ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Subscription Info */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                📋 বর্তমান সাবস্ক্রিপশন
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Plan & Status Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">প্ল্যান</p>
                  <p className="text-2xl font-bold text-indigo-400">{subscription.plan}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">স্ট্যাটাস</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      subscription.status === "ACTIVE" ? "bg-emerald-500" :
                      subscription.status === "PAUSED" ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}></span>
                    <p className="font-semibold text-slate-300">{subscription.status}</p>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">বিলিং চক্র</p>
                  <p className="text-lg font-semibold text-slate-300">{subscription.billingCycle === "MONTHLY" ? "মাসিক" : "বার্ষিক"}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">মূল্য</p>
                  <p className="text-lg font-semibold text-slate-300">{subscription.amount.toFixed(0)} ৳</p>
                </div>
              </div>

              {/* Date Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">শুরুর তারিখ</p>
                  <p className="text-sm font-semibold text-slate-300">{new Date(subscription.startDate).toLocaleDateString("bn-BD")}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700">
                  <p className="text-slate-400 text-xs font-medium mb-1">পরবর্তী বিলিং</p>
                  <p className="text-sm font-semibold text-slate-300">{new Date(subscription.nextBillingDate).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>

              {/* Auto Renewal */}
              <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-800">
                <p className="text-slate-400 text-xs font-medium mb-1">স্বয়ংক্রিয় নবায়ন</p>
                <p className="text-sm font-semibold text-indigo-300">
                  {subscription.autoRenew ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSelectedPlan(subscription.plan as "STARTER" | "BUSINESS" | "ENTERPRISE");
                    setShowUpgradeModal(true);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition text-sm"
                >
                  🔄 প্ল্যান পরিবর্তন করুন
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-900/50 hover:bg-red-900/70 text-red-300 font-semibold transition text-sm border border-red-800"
                >
                  ❌ বাতিল করুন
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h4 className="text-lg font-semibold text-white">💰 মূল্য সারসংক্ষেপ</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-indigo-900/30 border border-indigo-700">
                <p className="text-slate-400 text-xs font-medium mb-1">মাসিক</p>
                <p className="text-2xl font-bold text-indigo-300">
                  {pricing?.[subscription.plan]?.monthly.toFixed(0)} ৳
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-700">
                <p className="text-slate-400 text-xs font-medium mb-1">বার্ষিক</p>
                <p className="text-2xl font-bold text-emerald-300">
                  {pricing?.[subscription.plan]?.yearly.toFixed(0)} ৳
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-indigo-800 bg-indigo-900/20 p-8 text-center">
          <p className="text-slate-300 mb-4 text-lg">📌 কোনো সক্রিয় সাবস্ক্রিপশন নেই</p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
          >
            সাবস্ক্রিপশন তৈরি করুন
          </button>
        </div>
      )}

      {/* Pricing Plans Section */}
      {pricing && !subscription && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">🎯 আপনার প্ল্যান নির্বাচন করুন</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(["STARTER", "BUSINESS", "ENTERPRISE"] as const).map((plan) => (
              <div
                key={plan}
                className={`rounded-xl border overflow-hidden transition ${
                  plan === "BUSINESS"
                    ? "border-indigo-600 bg-indigo-900/30 ring-2 ring-indigo-600/50"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div className="p-6">
                  <div className="mb-4">
                    {plan === "BUSINESS" && (
                      <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold mb-3">⭐ জনপ্রিয়</span>
                    )}
                    <h4 className="text-xl font-bold text-white mb-1">{plan}</h4>
                  </div>

                  <div className="mb-6">
                    <p className="text-3xl font-bold text-indigo-400">
                      {pricing[plan].monthly.toFixed(0)}
                    </p>
                    <p className="text-slate-400 text-sm">৳ প্রতি মাস</p>
                  </div>

                  <div className="mb-6 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-slate-300 text-sm">
                      <span className="text-slate-400">বার্ষিক: </span>
                      <span className="font-semibold">{pricing[plan].yearly.toFixed(0)} ৳</span>
                      <span className="text-emerald-400 text-xs ml-2">(17% সাশ্রয়)</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowUpgradeModal(true);
                    }}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                      plan === "BUSINESS"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    নির্বাচন করুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            📄 ইনভয়েস
          </h3>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            কোনো ইনভয়েস নেই
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="text-left p-4">ইনভয়েস #</th>
                  <th className="text-left p-4">পিরিয়ড</th>
                  <th className="text-left p-4">পরিমাণ</th>
                  <th className="text-left p-4">ডিউ ডেট</th>
                  <th className="text-left p-4">স্ট্যাটাস</th>
                  <th className="text-left p-4">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-indigo-400">{invoice.invoiceNumber}</td>
                    <td className="p-4 text-slate-300 text-xs">
                      {new Date(invoice.billingPeriodStart).toLocaleDateString("bn-BD")} -<br />
                      {new Date(invoice.billingPeriodEnd).toLocaleDateString("bn-BD")}
                    </td>
                    <td className="p-4 font-semibold text-white">{invoice.amount.toFixed(0)} ৳</td>
                    <td className="p-4 text-slate-300">{new Date(invoice.dueDate).toLocaleDateString("bn-BD")}</td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === "PAID"
                          ? "bg-emerald-900/50 text-emerald-300"
                          : invoice.status === "PENDING"
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-red-900/50 text-red-300"
                      }`}>
                        {invoice.status === "PAID" ? "✅ প্রদান করা" : invoice.status === "PENDING" ? "⏳ অপেক্ষমাণ" : "❌ বকেয়া"}
                      </span>
                    </td>
                    <td className="p-4">
                      {invoice.status === "PENDING" && (
                        <button className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm">
                          পেমেন্ট করুন
                        </button>
                      )}
                      {invoice.status === "PAID" && (
                        <button className="text-slate-400 hover:text-slate-300 font-semibold text-sm">
                          ডাউনলোড
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {subscription ? "প্ল্যান পরিবর্তন করুন" : "সাবস্ক্রিপশন তৈরি করুন"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Plan Selection */}
              <div className="space-y-3">
                {(["STARTER", "BUSINESS", "ENTERPRISE"] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-lg border-2 transition text-left ${
                      selectedPlan === plan
                        ? "border-indigo-600 bg-indigo-900/30"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">{plan}</span>
                      <span className="text-indigo-400 font-bold">
                        {pricing?.[plan]?.monthly.toFixed(0)} ৳/মাস
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Billing Cycle */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">বিলিং চক্র</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as "MONTHLY" | "YEARLY")}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="MONTHLY">📅 মাসিক</option>
                  <option value="YEARLY">📆 বার্ষিক (17% সাশ্রয়)</option>
                </select>
              </div>

              {/* Price Preview */}
              {selectedPlan && pricing && (
                <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-800">
                  <p className="text-slate-400 text-sm mb-1">মোট মূল্য</p>
                  <p className="text-2xl font-bold text-indigo-300">
                    {billingCycle === "MONTHLY"
                      ? pricing[selectedPlan].monthly.toFixed(0)
                      : pricing[selectedPlan].yearly.toFixed(0)
                    } ৳
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlan(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-slate-700"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleUpgradePlan}
                  disabled={!selectedPlan || upgrading}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition"
                >
                  {upgrading ? "প্রসেস করা হচ্ছে..." : "নিশ্চিত করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-red-900">
              <h3 className="text-lg font-bold text-red-300">সাবস্ক্রিপশন বাতিল করুন</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                ⚠️ আপনি কি নিশ্চিত যে আপনার সাবস্ক্রিপশন বাতিল করতে চান? এই অ্যাকশন পূর্ববর্তী করা যাবে না।
              </p>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">কারণ (ঐচ্ছিক)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="আমাদের বলুন কেন আপনি বাতিল করছেন..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-600 text-sm"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-slate-700"
                >
                  চালু রাখুন
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-300 font-semibold transition"
                >
                  {cancelling ? "বাতিল করা হচ্ছে..." : "বাতিল করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
