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
      alert(`Plan upgraded successfully! Prorated amount: ${result.proratedAmount.toFixed(2)} BDT`);
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
      alert("Subscription cancelled successfully");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Current Subscription */}
        {subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-lg text-blue-600">{subscription.plan}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">Billing Cycle</span>
                    <span className="font-semibold">{subscription.billingCycle}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      subscription.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : subscription.status === "PAUSED"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-semibold text-lg">{subscription.amount.toFixed(2)} BDT</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">Start Date</span>
                    <span>{new Date(subscription.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-gray-600">End Date</span>
                    <span>{subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Next Billing Date</span>
                    <span className="font-semibold">{new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Change Plan
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Summary</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Monthly Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {pricing?.[subscription.plan]?.monthly.toFixed(0)} BDT
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Yearly Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {pricing?.[subscription.plan]?.yearly.toFixed(0)} BDT
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Auto Renewal</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {subscription.autoRenew ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="mb-8">
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No active subscription</p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                Create Subscription
              </button>
            </div>
          </Card>
        )}

        {/* Pricing Plans */}
        {pricing && !subscription && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["STARTER", "BUSINESS", "ENTERPRISE"] as const).map((plan) => (
                <Card key={plan} className={plan === "BUSINESS" ? "ring-2 ring-blue-500" : ""}>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan}</h3>
                    <div className="mb-6">
                      <p className="text-3xl font-bold text-blue-600 mb-1">
                        {pricing[plan].monthly.toFixed(0)} BDT
                      </p>
                      <p className="text-sm text-gray-600">per month</p>
                    </div>
                    <div className="mb-6 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Yearly: {pricing[plan].yearly.toFixed(0)} BDT</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowUpgradeModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      Select Plan
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No invoices yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Invoice #</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Period</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Due Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(invoice.billingPeriodStart).toLocaleDateString()} -{" "}
                          {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold">{invoice.amount.toFixed(2)} BDT</td>
                        <td className="py-3 px-4 text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {invoice.status === "PENDING" && (
                            <button
                              onClick={() => alert("Payment integration coming soon")}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                            >
                              Pay Now
                            </button>
                          )}
                          {invoice.status === "PAID" && (
                            <button
                              onClick={() => alert("Download feature coming soon")}
                              className="text-gray-600 hover:text-gray-800 font-semibold text-sm"
                            >
                              Download
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
        </Card>
      </div>

      {/* Upgrade/Create Subscription Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {subscription ? "Change Plan" : "Create Subscription"}
              </h3>
              <div className="space-y-3 mb-6">
                {(["STARTER", "BUSINESS", "ENTERPRISE"] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-lg border-2 transition text-left ${
                      selectedPlan === plan
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">{plan}</span>
                      <span className="text-blue-600 font-bold">
                        {pricing?.[plan]?.monthly.toFixed(0)} BDT/mo
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Billing Cycle</label>
                <select
                  defaultValue="MONTHLY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly (Save 17%)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlan(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpgradePlan}
                  disabled={!selectedPlan || upgrading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                >
                  {upgrading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your subscription? This action cannot be undone.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you're cancelling..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                >
                  {cancelling ? "Cancelling..." : "Cancel Subscription"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
