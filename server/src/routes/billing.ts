import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireTenantUser,
  type AuthRequest,
} from "../middleware/auth.js";
import {
  createSubscription,
  generateInvoice,
  markInvoiceAsPaid,
  getSubscription,
  getTenantInvoices,
  cancelSubscription,
  getPlanPrice,
} from "../services/billing.js";

export const billingRouter = Router();
billingRouter.use(requireAuth, requireTenantUser);

function tenantId(req: AuthRequest): string {
  const tid = req.user?.tenantId;
  if (!tid) {
    throw new Error("Tenant ID not found in request");
  }
  return tid;
}

/**
 * Get current subscription
 */
billingRouter.get("/subscription", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const subscription = await getSubscription(tid);

    if (!subscription) {
      res.status(404).json({ error: "No active subscription" });
      return;
    }

    res.json(subscription);
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

/**
 * Create subscription
 */
billingRouter.post("/subscription", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { plan, billingCycle } = req.body as {
      plan?: string;
      billingCycle?: string;
    };

    if (!plan || !billingCycle) {
      res.status(400).json({ error: "Plan and billing cycle required" });
      return;
    }

    if (!["STARTER", "BUSINESS", "ENTERPRISE"].includes(plan)) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
      res.status(400).json({ error: "Invalid billing cycle" });
      return;
    }

    const subscription = await createSubscription(tid, plan as any, billingCycle as any);

    // Generate first invoice
    const invoice = await generateInvoice(
      tid,
      subscription.id,
      subscription.startDate,
      subscription.endDate!
    );

    console.log(`[billing] New subscription: tenant=${tid}, plan=${plan}, cycle=${billingCycle}`);

    res.status(201).json({
      subscription,
      invoice,
    });
  } catch (err) {
    console.error("Create subscription error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

/**
 * Get invoices
 */
billingRouter.get("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "20"), 10) || 20);

    const invoices = await getTenantInvoices(tid, limit);

    res.json(invoices);
  } catch (err) {
    console.error("Get invoices error:", err);
    res.status(500).json({ error: "Failed to get invoices" });
  }
});

/**
 * Get invoice details
 */
billingRouter.get("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: tid,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    res.json(invoice);
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ error: "Failed to get invoice" });
  }
});

/**
 * Mark invoice as paid
 */
billingRouter.post("/invoices/:id/pay", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    const { paymentId } = req.body as { paymentId?: string };

    if (!paymentId) {
      res.status(400).json({ error: "Payment ID required" });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId: tid,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const paidInvoice = await markInvoiceAsPaid(id, paymentId);

    console.log(`[billing] Invoice marked as paid: invoice=${invoice.invoiceNumber}, payment=${paymentId}`);

    res.json(paidInvoice);
  } catch (err) {
    console.error("Mark invoice paid error:", err);
    res.status(500).json({ error: "Failed to mark invoice as paid" });
  }
});

/**
 * Cancel subscription
 */
billingRouter.post("/subscription/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { reason } = req.body as { reason?: string };

    const subscription = await getSubscription(tid);

    if (!subscription) {
      res.status(404).json({ error: "No active subscription" });
      return;
    }

    const cancelled = await cancelSubscription(subscription.id, reason || "User requested");

    res.json(cancelled);
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

/**
 * Get plan pricing
 */
billingRouter.get("/pricing", async (_req: AuthRequest, res: Response) => {
  try {
    const pricing = {
      STARTER: { monthly: 2999, yearly: 29990 },
      BUSINESS: { monthly: 9999, yearly: 99990 },
      ENTERPRISE: { monthly: 29999, yearly: 299990 },
    };

    res.json(pricing);
  } catch (err) {
    console.error("Get pricing error:", err);
    res.status(500).json({ error: "Failed to get pricing" });
  }
});

/**
 * Upgrade/downgrade plan
 */
billingRouter.post("/subscription/upgrade", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { newPlan } = req.body as { newPlan?: string };

    if (!newPlan || !["STARTER", "BUSINESS", "ENTERPRISE"].includes(newPlan)) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    const subscription = await getSubscription(tid);

    if (!subscription) {
      res.status(404).json({ error: "No active subscription" });
      return;
    }

    // Calculate prorated amount
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalDays = Math.ceil(
      (subscription.endDate!.getTime() - subscription.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const oldPrice = subscription.amount;
    const newPrice = getPlanPrice(newPlan as any, subscription.billingCycle);
    const proratedAmount = (newPrice - oldPrice) * (daysRemaining / totalDays);

    // Update subscription
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: newPlan as any,
        amount: newPrice,
      },
    });

    // Update tenant
    await prisma.tenant.update({
      where: { id: tid },
      data: { plan: newPlan as any },
    });

    console.log(`[billing] Plan upgraded: tenant=${tid}, from=${subscription.plan}, to=${newPlan}, prorated=${proratedAmount}`);

    res.json({
      subscription: updated,
      proratedAmount,
      message: `Plan upgraded. Prorated amount: ${proratedAmount.toFixed(2)} BDT`,
    });
  } catch (err) {
    console.error("Upgrade plan error:", err);
    res.status(500).json({ error: "Failed to upgrade plan" });
  }
});
