import { prisma } from "../lib/prisma.js";
import type { TenantPlan, BillingCycle } from "@prisma/client";

/**
 * Billing and subscription management service
 */

// Plan pricing (in BDT)
const PLAN_PRICING = {
  STARTER: { monthly: 2999, yearly: 29990 },
  BUSINESS: { monthly: 9999, yearly: 99990 },
  ENTERPRISE: { monthly: 29999, yearly: 299990 },
};

/**
 * Get plan pricing
 */
export function getPlanPrice(plan: TenantPlan, cycle: BillingCycle): number {
  const pricing = PLAN_PRICING[plan];
  return cycle === "MONTHLY" ? pricing.monthly : pricing.yearly;
}

/**
 * Create subscription for tenant
 */
export async function createSubscription(
  tenantId: string,
  plan: TenantPlan,
  billingCycle: BillingCycle
) {
  const amount = getPlanPrice(plan, billingCycle);
  const startDate = new Date();
  const endDate = new Date(startDate);

  if (billingCycle === "MONTHLY") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const subscription = await prisma.subscription.create({
    data: {
      tenantId,
      plan,
      billingCycle,
      status: "ACTIVE",
      amount,
      currency: "BDT",
      startDate,
      endDate,
      nextBillingDate: endDate,
      autoRenew: true,
    },
  });

  // Update tenant subscription info
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      billingCycle,
      subscriptionStatus: "ACTIVE",
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      nextBillingDate: endDate,
      monthlyPrice: PLAN_PRICING[plan].monthly,
      yearlyPrice: PLAN_PRICING[plan].yearly,
    },
  });

  console.log(`[billing] Subscription created: tenant=${tenantId}, plan=${plan}, cycle=${billingCycle}`);

  return subscription;
}

/**
 * Generate invoice for subscription
 */
export async function generateInvoice(
  tenantId: string,
  subscriptionId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Generate invoice number (YYYY-MM-XXXXX format)
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  const invoiceNumber = `${year}-${month}-${random}`;

  const dueDate = new Date(billingPeriodEnd);
  dueDate.setDate(dueDate.getDate() + 15); // Due 15 days after billing period end

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNumber,
      amount: subscription.amount,
      currency: "BDT",
      status: "PENDING",
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      description: `${subscription.plan} Plan - ${subscription.billingCycle} Billing`,
    },
  });

  console.log(`[billing] Invoice generated: tenant=${tenantId}, invoice=${invoiceNumber}, amount=${subscription.amount}`);

  return invoice;
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string, paymentId: string) {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  console.log(`[billing] Invoice paid: invoice=${invoice.invoiceNumber}, payment=${paymentId}`);

  return invoice;
}

/**
 * Get upcoming invoices (due within 7 days)
 */
export async function getUpcomingInvoices() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return prisma.invoice.findMany({
    where: {
      status: "PENDING",
      dueDate: {
        lte: sevenDaysFromNow,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

/**
 * Get overdue invoices
 */
export async function getOverdueInvoices() {
  const now = new Date();

  return prisma.invoice.findMany({
    where: {
      status: "PENDING",
      dueDate: {
        lt: now,
      },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

/**
 * Renew subscription (called when subscription ends)
 */
export async function renewSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (!subscription.autoRenew) {
    // Mark as expired
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "EXPIRED" },
    });

    await prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { subscriptionStatus: "EXPIRED" },
    });

    console.log(`[billing] Subscription expired: subscription=${subscriptionId}`);
    return null;
  }

  // Create new subscription
  const newStartDate = subscription.endDate || new Date();
  const newEndDate = new Date(newStartDate);

  if (subscription.billingCycle === "MONTHLY") {
    newEndDate.setMonth(newEndDate.getMonth() + 1);
  } else {
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  }

  const newSubscription = await prisma.subscription.create({
    data: {
      tenantId: subscription.tenantId,
      plan: subscription.plan,
      billingCycle: subscription.billingCycle,
      status: "ACTIVE",
      amount: subscription.amount,
      currency: subscription.currency,
      startDate: newStartDate,
      endDate: newEndDate,
      nextBillingDate: newEndDate,
      autoRenew: subscription.autoRenew,
    },
  });

  // Update tenant
  await prisma.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionStartDate: newStartDate,
      subscriptionEndDate: newEndDate,
      nextBillingDate: newEndDate,
    },
  });

  // Generate invoice for new subscription
  await generateInvoice(subscription.tenantId, newSubscription.id, newStartDate, newEndDate);

  console.log(`[billing] Subscription renewed: old=${subscriptionId}, new=${newSubscription.id}`);

  return newSubscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string, reason: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  await prisma.tenant.update({
    where: { id: subscription.tenantId },
    data: { subscriptionStatus: "CANCELLED" },
  });

  console.log(`[billing] Subscription cancelled: subscription=${subscriptionId}, reason=${reason}`);

  return subscription;
}

/**
 * Get subscription details
 */
export async function getSubscription(tenantId: string) {
  return prisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get tenant invoices
 */
export async function getTenantInvoices(tenantId: string, limit = 20) {
  return prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
