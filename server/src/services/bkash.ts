import { config } from "../lib/config.js";

/**
 * bKash Payment Integration Service
 * Bangladeshi payment gateway for subscription payments
 */

interface BkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  baseUrl: string;
}

interface BkashTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token: string;
  expires_in: number;
}

interface BkashInitiateResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  paymentURL: string;
  bkashURL: string;
  callbackURL: string;
  validationID: string;
  transactionStatus: string;
  transactionID: string;
}

interface BkashExecuteResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: number;
  currency: string;
  merchantInvoiceNumber: string;
  transactionDate: string;
}

interface BkashQueryResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: number;
  currency: string;
  merchantInvoiceNumber: string;
  transactionDate: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

const bkashConfig: BkashConfig = {
  appKey: process.env.BKASH_APP_KEY || "",
  appSecret: process.env.BKASH_APP_SECRET || "",
  username: process.env.BKASH_USERNAME || "",
  password: process.env.BKASH_PASSWORD || "",
  baseUrl: process.env.BKASH_BASE_URL || "https://checkout.sandbox.bkash.com",
};

/**
 * Get bKash OAuth token
 */
async function getBkashToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch(`${bkashConfig.baseUrl}/api/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`bKash token error: ${response.statusText}`);
  }

  const data = (await response.json()) as BkashTokenResponse;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash token failed: ${data.statusMessage}`);
  }

  // Cache token
  cachedToken = {
    token: data.id_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Refresh 60s before expiry
  };

  return data.id_token;
}

/**
 * Initiate bKash payment
 */
export async function initiateBkashPayment(
  amount: number,
  invoiceId: string,
  callbackUrl: string
): Promise<{ paymentURL: string; paymentID: string }> {
  const token = await getBkashToken();

  const response = await fetch(`${bkashConfig.baseUrl}/api/checkout/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-APP-Key": bkashConfig.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: invoiceId,
      callbackURL: callbackUrl,
      amount: Math.round(amount * 100) / 100, // Ensure 2 decimal places
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoiceId,
    }),
  });

  if (!response.ok) {
    throw new Error(`bKash initiate error: ${response.statusText}`);
  }

  const data = (await response.json()) as BkashInitiateResponse;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash initiate failed: ${data.statusMessage}`);
  }

  console.log(`[bkash] Payment initiated: paymentID=${data.paymentID}, amount=${amount}, invoice=${invoiceId}`);

  return {
    paymentURL: data.paymentURL,
    paymentID: data.paymentID,
  };
}

/**
 * Execute bKash payment (after user authorization)
 */
export async function executeBkashPayment(paymentID: string): Promise<{ transactionStatus: string; trxID: string }> {
  const token = await getBkashToken();

  const response = await fetch(`${bkashConfig.baseUrl}/api/checkout/payment/execute/${paymentID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-APP-Key": bkashConfig.appKey,
    },
  });

  if (!response.ok) {
    throw new Error(`bKash execute error: ${response.statusText}`);
  }

  const data = (await response.json()) as BkashExecuteResponse;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash execute failed: ${data.statusMessage}`);
  }

  console.log(`[bkash] Payment executed: paymentID=${paymentID}, trxID=${data.trxID}, status=${data.transactionStatus}`);

  return {
    transactionStatus: data.transactionStatus,
    trxID: data.trxID,
  };
}

/**
 * Query bKash payment status
 */
export async function queryBkashPayment(paymentID: string): Promise<{
  transactionStatus: string;
  amount: number;
  trxID: string;
}> {
  const token = await getBkashToken();

  const response = await fetch(`${bkashConfig.baseUrl}/api/checkout/payment/query/${paymentID}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-APP-Key": bkashConfig.appKey,
    },
  });

  if (!response.ok) {
    throw new Error(`bKash query error: ${response.statusText}`);
  }

  const data = (await response.json()) as BkashQueryResponse;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash query failed: ${data.statusMessage}`);
  }

  return {
    transactionStatus: data.transactionStatus,
    amount: data.amount,
    trxID: data.trxID,
  };
}

/**
 * Refund bKash payment
 */
export async function refundBkashPayment(
  paymentID: string,
  trxID: string,
  amount: number,
  reason: string
): Promise<{ refundStatus: string; refundTrxID: string }> {
  const token = await getBkashToken();

  const response = await fetch(`${bkashConfig.baseUrl}/api/checkout/payment/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-APP-Key": bkashConfig.appKey,
    },
    body: JSON.stringify({
      paymentID,
      trxID,
      amount: Math.round(amount * 100) / 100,
      reason,
      sku: "refund",
    }),
  });

  if (!response.ok) {
    throw new Error(`bKash refund error: ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  if (data.statusCode !== "0000") {
    throw new Error(`bKash refund failed: ${data.statusMessage}`);
  }

  console.log(`[bkash] Refund processed: paymentID=${paymentID}, refundTrxID=${data.refundTrxID}`);

  return {
    refundStatus: data.refundStatus,
    refundTrxID: data.refundTrxID,
  };
}

export function isBkashConfigured(): boolean {
  return !!(bkashConfig.appKey && bkashConfig.appSecret && bkashConfig.username && bkashConfig.password);
}
