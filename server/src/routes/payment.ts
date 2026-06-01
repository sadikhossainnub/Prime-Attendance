import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireTenantUser,
  type AuthRequest,
} from "../middleware/auth.js";
import {
  initiateBkashPayment,
  executeBkashPayment,
  queryBkashPayment,
  isBkashConfigured,
} from "../services/bkash.js";

export const paymentRouter = Router();
paymentRouter.use(requireAuth, requireTenantUser);

function tenantId(req: AuthRequest): string {
  const tid = req.user?.tenantId;
  if (!tid) {
    throw new Error("Tenant ID not found in request");
  }
  return tid;
}

/**
 * Initiate bKash payment
 */
paymentRouter.post("/bkash/initiate", async (req: AuthRequest, res: Response) => {
  try {
    if (!isBkashConfigured()) {
      res.status(503).json({ error: "bKash payment not configured" });
      return;
    }

    const tid = tenantId(req);
    const { amount, invoiceId } = req.body as {
      amount?: number;
      invoiceId?: string;
    };

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    if (!invoiceId) {
      res.status(400).json({ error: "Invoice ID required" });
      return;
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tid },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        tenantId: tid,
        invoiceId,
        amount,
        currency: "BDT",
        method: "BKASH",
        status: "INITIATED",
      },
    });

    // Get callback URL
    const callbackUrl = `${process.env.APP_URL || "http://localhost:7788"}/api/payment/bkash/callback`;

    // Initiate bKash payment
    const bkashResult = await initiateBkashPayment(amount, invoiceId, callbackUrl);

    // Update payment with bKash payment ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { bkashPaymentId: bkashResult.paymentID },
    });

    console.log(`[payment] bKash initiated: tenant=${tenant.slug}, amount=${amount}, paymentID=${bkashResult.paymentID}`);

    res.json({
      paymentURL: bkashResult.paymentURL,
      paymentID: bkashResult.paymentID,
    });
  } catch (err) {
    console.error("bKash initiate error:", err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

/**
 * Execute bKash payment (after user authorization)
 */
paymentRouter.post("/bkash/execute", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { paymentID, trxID } = req.body as {
      paymentID?: string;
      trxID?: string;
    };

    if (!paymentID || !trxID) {
      res.status(400).json({ error: "Payment ID and Transaction ID required" });
      return;
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        tenantId: tid,
        bkashPaymentId: paymentID,
      },
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    // Execute bKash payment
    const bkashResult = await executeBkashPayment(paymentID);

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: bkashResult.transactionStatus === "Completed" ? "COMPLETED" : "FAILED",
        bkashTransactionId: bkashResult.trxID,
        completedAt: bkashResult.transactionStatus === "Completed" ? new Date() : null,
      },
    });

    console.log(`[payment] bKash executed: tenant=${tid}, paymentID=${paymentID}, status=${bkashResult.transactionStatus}`);

    res.json({
      transactionStatus: bkashResult.transactionStatus,
      trxID: bkashResult.trxID,
    });
  } catch (err) {
    console.error("bKash execute error:", err);
    res.status(500).json({ error: "Failed to execute payment" });
  }
});

/**
 * Query bKash payment status
 */
paymentRouter.post("/bkash/query", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { paymentID } = req.body as {
      paymentID?: string;
    };

    if (!paymentID) {
      res.status(400).json({ error: "Payment ID required" });
      return;
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        tenantId: tid,
        bkashPaymentId: paymentID,
      },
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    // Query bKash payment status
    const bkashResult = await queryBkashPayment(paymentID);

    // Update payment record if status changed
    if (bkashResult.transactionStatus === "Completed" && payment.status !== "COMPLETED") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          bkashTransactionId: bkashResult.trxID,
          completedAt: new Date(),
        },
      });
    }

    res.json({
      transactionStatus: bkashResult.transactionStatus,
      amount: bkashResult.amount,
      trxID: bkashResult.trxID,
    });
  } catch (err) {
    console.error("bKash query error:", err);
    res.status(500).json({ error: "Failed to query payment" });
  }
});

/**
 * Get payment history
 */
paymentRouter.get("/history", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "20"), 10) || 20);

    const payments = await prisma.payment.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(payments);
  } catch (err) {
    console.error("Payment history error:", err);
    res.status(500).json({ error: "Failed to load payment history" });
  }
});
