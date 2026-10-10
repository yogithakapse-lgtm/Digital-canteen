const crypto = require("node:crypto");
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const Razorpay = require("razorpay");

const MENU = Object.freeze({
  "paneer-bowl": { name: "The paneer sunshine bowl", price: 189 },
  "avocado-toast": { name: "Avocado garden toast", price: 129 },
  "masala-wrap": { name: "The masala mood wrap", price: 149 },
  "berry-smoothie": { name: "Berry nice smoothie", price: 99 },
  "tomato-pasta": { name: "Sunday tomato pasta", price: 179 },
  "crispy-potatoes": { name: "Crispy little potatoes", price: 79 },
  "iced-matcha": { name: "Honey-iced matcha", price: 119 },
  brownie: { name: "The very happy brownie", price: 89 }
});
const ORDER_STATUSES = ["Placed", "Preparing", "Ready for Pickup"];
const PAYMENT_STATUSES = ["Successful", "Failed", "Pending", "Cancelled"];
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getFirebaseServices() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw httpError(503, "Server payments are not configured: Firebase service-account credentials are missing.");
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw httpError(503, "Server payments are not configured: Firebase service-account JSON is invalid.");
  }
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw httpError(503, "Server payments are not configured: Firebase service-account JSON is incomplete.");
  }
  const app = getApps().find((entry) => entry.name === "crave2bite-payments")
    || initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, "crave2bite-payments");
  return { db: getFirestore(app), auth: getAuth(app) };
}

function hasFirebaseServerConfiguration() {
  try {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "");
    return Boolean(credentials.project_id && credentials.client_email && credentials.private_key
      && process.env.FIREBASE_ADMIN_EMAIL);
  } catch {
    return false;
  }
}

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const mode = process.env.RAZORPAY_MODE || "test";
  if (mode !== "test" && mode !== "live") throw httpError(503, "RAZORPAY_MODE must be test or live.");
  if (!keyId || !keySecret) {
    const missing = [
      !keyId && "RAZORPAY_KEY_ID",
      !keySecret && "RAZORPAY_KEY_SECRET"
    ].filter(Boolean);
    throw httpError(503, `Online payments are not configured. Set ${missing.join(" and ")} in the Vercel server environment.`);
  }
  if (mode === "test" && !keyId.startsWith("rzp_test_")) {
    throw httpError(503, "Razorpay is in test mode but the configured key is not a test key.");
  }
  if (mode === "live" && !keyId.startsWith("rzp_live_")) {
    throw httpError(503, "Razorpay is in live mode but the configured key is not a live key.");
  }
  return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret, mode };
}

function getConfiguredGateway() {
  const gateway = getRazorpay();
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw httpError(503, "Configure the signed Razorpay webhook before enabling online payments.");
  }
  return gateway;
}

function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw httpError(403, "Cross-origin payment requests are not allowed.");
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedOrigin.hostname);
  const protocol = req.headers["x-forwarded-proto"] || (isLocal ? "http" : "https");
  if (!host || parsedOrigin.host !== host || parsedOrigin.protocol !== `${protocol}:`) {
    throw httpError(403, "Cross-origin payment requests are not allowed.");
  }
}

function validateSession(sessionSecret) {
  if (typeof sessionSecret !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(sessionSecret)) {
    throw httpError(400, "The payment session is invalid. Reopen checkout and try again.");
  }
  return crypto.createHash("sha256").update(sessionSecret).digest("hex");
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    throw httpError(400, "Your cart is empty or contains too many items.");
  }
  const seen = new Set();
  const normalized = items.map((line) => {
    if (!line || typeof line.id !== "string" || seen.has(line.id) || !MENU[line.id]
      || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) {
      throw httpError(400, "The cart contains an invalid item or quantity. Review it and try again.");
    }
    seen.add(line.id);
    return { id: line.id, name: MENU[line.id].name, price: MENU[line.id].price, quantity: line.quantity };
  });
  const itemCount = normalized.reduce((sum, line) => sum + line.quantity, 0);
  const total = normalized.reduce((sum, line) => sum + line.price * line.quantity, 0);
  if (itemCount > 200 || total < 1 || total > 100000) {
    throw httpError(400, "The cart total is outside the supported order limit.");
  }
  return { items: normalized, itemCount, total, amountPaise: total * 100 };
}

function generateToken() {
  const bytes = crypto.randomBytes(6);
  return `C2B-${Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("")}`;
}

function requestHash(requestId) {
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(requestId)) {
    throw httpError(400, "The checkout request ID is invalid. Please try checkout again.");
  }
  return crypto.createHash("sha256").update(requestId).digest("hex");
}

function constantTimeHexEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

async function reserveOrder({ db, body, paymentMethod }) {
  const cart = normalizeItems(body.items);
  const requestId = requestHash(body.requestId);
  const sessionHash = validateSession(body.sessionSecret);
  const cartHash = crypto.createHash("sha256").update(JSON.stringify(cart.items.map(({ id, quantity }) => [id, quantity]))).digest("hex");
  const requestRef = db.collection("checkoutRequests").doc(requestId);
  const newOrderRef = db.collection("orders").doc();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateToken();
    const tokenRef = db.collection("orderTokens").doc(token);
    const sessionRef = db.collection("checkoutSessions").doc(newOrderRef.id);
    try {
      return await db.runTransaction(async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);
        if (requestSnapshot.exists) {
          const saved = requestSnapshot.data();
          if (saved.cartHash !== cartHash || saved.paymentMethod !== paymentMethod
            || !constantTimeHexEqual(saved.checkoutSessionHash, sessionHash)) {
            throw httpError(409, "This checkout request was already used for a different order.");
          }
          return { orderId: saved.orderId, existing: true };
        }
        const tokenSnapshot = await transaction.get(tokenRef);
        if (tokenSnapshot.exists) throw httpError(409, "A token collision occurred. Please retry checkout.");
        const settingsRef = db.collection("settings").doc("menu");
        const settingsSnapshot = await transaction.get(settingsRef);
        const unavailable = settingsSnapshot.exists && Array.isArray(settingsSnapshot.data().unavailableIds)
          ? settingsSnapshot.data().unavailableIds : [];
        if (cart.items.some((line) => unavailable.includes(line.id))) {
          throw httpError(409, "An item in your cart is no longer available. Refresh the menu and try again.");
        }
        const now = Date.now();
        const order = {
          items: cart.items,
          total: cart.total,
          amountPaise: cart.amountPaise,
          currency: "INR",
          status: "Placed",
          paymentMethod,
          paymentStatus: "Pending",
          paymentAttempt: 0,
          createdAt: now,
          itemCount: cart.itemCount,
          version: 1
        };
        if (paymentMethod === "cash") order.token = token;
        transaction.set(requestRef, {
          orderId: newOrderRef.id, cartHash, paymentMethod,
          checkoutSessionHash: sessionHash, createdAt: now
        });
        transaction.set(tokenRef, { orderId: newOrderRef.id, createdAt: now });
        transaction.set(sessionRef, { checkoutSessionHash: sessionHash, token, createdAt: now });
        transaction.set(newOrderRef, order);
        return { orderId: newOrderRef.id, existing: false };
      });
    } catch (error) {
      if (error.statusCode !== 409 || error.message !== "A token collision occurred. Please retry checkout.") throw error;
    }
  }
  throw httpError(503, "Couldn't reserve a unique pickup token. Please retry checkout.");
}

async function startGatewayAttempt(db, client, orderId) {
  const orderRef = db.collection("orders").doc(orderId);
  const attempt = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw httpError(404, "This order could not be found.");
    const order = snapshot.data();
    if (!["online", "upi"].includes(order.paymentMethod)) throw httpError(409, "This order does not use online payment.");
    if (order.paymentStatus === "Successful") throw httpError(409, "This order has already been paid.");
    if (order.paymentInitStatus === "creating") throw httpError(409, "Payment setup is already in progress. Please wait before retrying.");
    if (order.paymentStatus === "Pending" && order.razorpayOrderId && order.paymentInitStatus === "ready") {
      return { existing: true, order, orderId: order.razorpayOrderId };
    }
    const attemptNumber = (order.paymentAttempt || 0) + 1;
    transaction.update(orderRef, {
      paymentStatus: "Pending",
      paymentInitStatus: "creating",
      paymentAttempt: attemptNumber,
      paymentUpdatedAt: Date.now()
    });
    return { existing: false, order, attemptNumber };
  });
  if (attempt.existing) return attempt;

  try {
    const gatewayOrder = await client.orders.create({
      amount: attempt.order.amountPaise,
      currency: "INR",
      receipt: `${orderId.slice(0, 20)}-${attempt.attemptNumber}`,
      notes: { crave2bite_order_id: orderId, payment_method: attempt.order.paymentMethod }
    });
    await orderRef.update({
      razorpayOrderId: gatewayOrder.id,
      paymentInitStatus: "ready",
      paymentUpdatedAt: Date.now()
    });
    return { existing: false, order: attempt.order, orderId: gatewayOrder.id };
  } catch (error) {
    await orderRef.update({
      paymentStatus: "Failed",
      paymentInitStatus: "failed",
      paymentUpdatedAt: Date.now()
    });
    throw httpError(502, "Razorpay couldn't start this payment. Your order was not confirmed; you can retry.");
  }
}

async function createOrder(body, paymentMethod) {
  const { db } = getFirebaseServices();
  const gateway = paymentMethod === "cash" ? null : getConfiguredGateway();
  const reservation = await reserveOrder({ db, body, paymentMethod });
  const orderSnapshot = await db.collection("orders").doc(reservation.orderId).get();
  if (!orderSnapshot.exists) throw httpError(500, "The reserved order could not be loaded.");
  const order = orderSnapshot.data();

  if (paymentMethod === "cash") {
    return { order: { ...order, id: reservation.orderId }, confirmed: true };
  }

  const session = await startGatewayAttempt(db, gateway.client, reservation.orderId);
  return {
    orderId: reservation.orderId,
    amount: order.amountPaise,
    currency: "INR",
    razorpayOrderId: session.orderId,
    keyId: gateway.keyId,
    mode: gateway.mode,
    paymentMethod
  };
}

async function retryPayment(body) {
  const { db } = getFirebaseServices();
  const sessionHash = validateSession(body.sessionSecret);
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId)) throw httpError(400, "The order reference is invalid.");
  const gateway = getConfiguredGateway();
  const orderRef = db.collection("orders").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists) throw httpError(404, "This order could not be found.");
  const order = snapshot.data();
  const sessionSnapshot = await db.collection("checkoutSessions").doc(orderId).get();
  if (!sessionSnapshot.exists || !constantTimeHexEqual(sessionSnapshot.data().checkoutSessionHash, sessionHash)) {
    throw httpError(403, "This checkout session is not authorized.");
  }
  if (!["Failed", "Cancelled"].includes(order.paymentStatus)) throw httpError(409, "Only a failed or cancelled payment can be retried.");
  const session = await startGatewayAttempt(db, gateway.client, orderId);
  return {
    orderId,
    amount: order.amountPaise,
    currency: "INR",
    razorpayOrderId: session.orderId,
    keyId: gateway.keyId,
    mode: gateway.mode,
    paymentMethod: order.paymentMethod
  };
}

async function verifyPayment(body) {
  const { db } = getFirebaseServices();
  const sessionHash = validateSession(body.sessionSecret);
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const gatewayOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId) || !gatewayOrderId || !paymentId || !/^[a-f0-9]{64}$/i.test(signature)) {
    throw httpError(400, "Razorpay returned incomplete payment details.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists) throw httpError(404, "This order could not be found.");
  const order = snapshot.data();
  const sessionRef = db.collection("checkoutSessions").doc(orderId);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists || !constantTimeHexEqual(sessionSnapshot.data().checkoutSessionHash, sessionHash)) {
    throw httpError(403, "This checkout session is not authorized.");
  }
  const checkoutSession = sessionSnapshot.data();
  if (order.razorpayOrderId !== gatewayOrderId) throw httpError(409, "This payment attempt is no longer active.");
  if (order.paymentStatus === "Successful" && checkoutSession.razorpayPaymentId === paymentId) {
    return { status: "Successful", order, duplicate: true };
  }
  if (order.paymentStatus === "Successful") throw httpError(409, "A different payment has already completed this order.");

  const { client, keySecret } = getRazorpay();
  const expected = crypto.createHmac("sha256", keySecret).update(`${gatewayOrderId}|${paymentId}`).digest("hex");
  if (!constantTimeHexEqual(expected, signature.toLowerCase())) throw httpError(400, "Razorpay signature verification failed.");
  const payment = await client.payments.fetch(paymentId);
  if (payment.order_id !== gatewayOrderId || payment.amount !== order.amountPaise || payment.currency !== "INR") {
    throw httpError(400, "The verified payment does not match this order's amount and currency.");
  }
  if (payment.status !== "captured") {
    if (payment.status === "failed") {
      await setGatewayFailure({ db, orderId, gatewayOrderId, status: "Failed" });
      return { status: "Failed" };
    }
    const paymentUpdatedAt = Date.now();
    await Promise.all([
      orderRef.update({ paymentStatus: "Pending", paymentUpdatedAt }),
      sessionRef.update({ razorpayPaymentId: paymentId, paymentUpdatedAt })
    ]);
    return { status: "Pending" };
  }

  const result = await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(orderRef);
    if (!currentSnapshot.exists) throw httpError(404, "This order could not be found.");
    const current = currentSnapshot.data();
    const sessionSnapshot = await transaction.get(db.collection("checkoutSessions").doc(orderId));
    const checkoutSession = sessionSnapshot.exists ? sessionSnapshot.data() : null;
    if (current.paymentStatus === "Successful" && checkoutSession?.razorpayPaymentId === paymentId) {
      return { order: current, duplicate: true };
    }
    if (current.paymentStatus === "Successful" || current.razorpayOrderId !== gatewayOrderId
      || !checkoutSession || !constantTimeHexEqual(checkoutSession.checkoutSessionHash, sessionHash)) {
      throw httpError(409, "The order payment state changed. Refresh your order before continuing.");
    }
    const updated = {
      ...current,
      token: checkoutSession.token,
      paymentStatus: "Successful",
      paidAt: Date.now(),
      paymentUpdatedAt: Date.now()
    };
    transaction.update(orderRef, {
      token: checkoutSession.token,
      paymentStatus: "Successful",
      paidAt: updated.paidAt,
      paymentUpdatedAt: updated.paymentUpdatedAt
    });
    transaction.update(db.collection("checkoutSessions").doc(orderId), {
      razorpayPaymentId: paymentId,
      paymentUpdatedAt: updated.paymentUpdatedAt
    });
    return { order: updated, duplicate: false };
  });
  return { status: "Successful", order: result.order, duplicate: result.duplicate };
}

async function setGatewayFailure({ db, orderId, gatewayOrderId, status }) {
  if (!["Failed", "Cancelled"].includes(status)) throw httpError(400, "Invalid payment status.");
  const orderRef = db.collection("orders").doc(orderId);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw httpError(404, "This order could not be found.");
    const order = snapshot.data();
    if (order.paymentStatus === "Successful") return { status: "Successful" };
    if (order.razorpayOrderId !== gatewayOrderId) throw httpError(409, "This payment attempt is no longer active.");
    transaction.update(orderRef, {
      paymentStatus: status,
      paymentUpdatedAt: Date.now()
    });
    return { status };
  });
  return result;
}

async function reportPaymentFailure(body, requestedStatus) {
  const { db } = getFirebaseServices();
  const sessionHash = validateSession(body.sessionSecret);
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const gatewayOrderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId : "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId) || !gatewayOrderId) throw httpError(400, "The payment reference is invalid.");
  const orderSnapshot = await db.collection("orders").doc(orderId).get();
  if (!orderSnapshot.exists) throw httpError(404, "This order could not be found.");
  const order = orderSnapshot.data();
  const sessionSnapshot = await db.collection("checkoutSessions").doc(orderId).get();
  if (!sessionSnapshot.exists || !constantTimeHexEqual(sessionSnapshot.data().checkoutSessionHash, sessionHash)) {
    throw httpError(403, "This checkout session is not authorized.");
  }
  if (requestedStatus === "Cancelled") {
    const { client } = getRazorpay();
    const gatewayOrder = await client.orders.fetch(gatewayOrderId);
    if (gatewayOrder.amount !== order.amountPaise || gatewayOrder.currency !== "INR") {
      throw httpError(400, "Razorpay's order details do not match this checkout.");
    }
    if (gatewayOrder.status !== "created") return { status: "Pending" };
    return setGatewayFailure({ db, orderId, gatewayOrderId, status: "Cancelled" });
  }
  const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
  if (!paymentId) throw httpError(400, "Razorpay did not provide a payment reference. The payment remains pending.");
  const { client } = getRazorpay();
  const payment = await client.payments.fetch(paymentId);
  if (payment.order_id !== gatewayOrderId || payment.status !== "failed") {
    throw httpError(409, "Razorpay has not confirmed a failed payment. The payment remains pending.");
  }
  return setGatewayFailure({ db, orderId, gatewayOrderId, status: "Failed" });
}

async function markCashPaid(req, body) {
  const { db, auth } = getFirebaseServices();
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw httpError(401, "Sign in as the designated canteen admin to confirm counter payments.");
  const decoded = await auth.verifyIdToken(token);
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || "";
  if (!adminEmail || decoded.email !== adminEmail) throw httpError(403, "Only the designated canteen admin can confirm cash payments.");
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(orderId)) throw httpError(400, "The order reference is invalid.");
  const orderRef = db.collection("orders").doc(orderId);
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw httpError(404, "This order could not be found.");
    const order = snapshot.data();
    if (order.paymentMethod !== "cash") throw httpError(409, "Only cash-at-canteen orders can be marked paid here.");
    if (order.paymentStatus === "Successful") return { duplicate: true };
    if (order.paymentStatus !== "Pending") throw httpError(409, "Only a pending cash payment can be confirmed.");
    transaction.update(orderRef, {
      paymentStatus: "Successful",
      paidAt: Date.now(),
      paymentUpdatedAt: Date.now(),
      paymentUpdatedAt: Date.now()
    });
    return { duplicate: false };
  });
  return { status: "Successful", duplicate: result.duplicate };
}

async function webhook(req, rawBody) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const { db } = getFirebaseServices();
  if (!secret) throw httpError(503, "The Razorpay webhook secret is not configured.");
  const signature = req.headers["x-razorpay-signature"];
  if (!Buffer.isBuffer(rawBody) || typeof signature !== "string") {
    throw httpError(400, "The webhook signature or raw request body is missing.");
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!constantTimeHexEqual(expected, signature)) throw httpError(400, "The Razorpay webhook signature is invalid.");
  const event = JSON.parse(rawBody.toString("utf8"));
  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!payment || !payment.order_id || !payment.id) return { received: true };
  const orderSnapshot = await db.collection("orders")
    .where("razorpayOrderId", "==", payment.order_id).limit(1).get();
  if (orderSnapshot.empty) return { received: true };
  const orderRef = orderSnapshot.docs[0].ref;
  if (payment.amount !== orderSnapshot.docs[0].data().amountPaise || payment.currency !== "INR") {
    throw httpError(400, "The webhook payment amount does not match its order.");
  }
  if (event.event === "payment.captured" && payment.status === "captured") {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(orderRef);
      if (!current.exists || current.data().paymentStatus === "Successful") return;
      const checkoutSession = await transaction.get(db.collection("checkoutSessions").doc(orderRef.id));
      if (!checkoutSession.exists || !checkoutSession.data().token) return;
      transaction.update(orderRef, {
        token: checkoutSession.data().token,
        paymentStatus: "Successful",
        paidAt: Date.now(),
        paymentUpdatedAt: Date.now()
      });
      transaction.update(db.collection("checkoutSessions").doc(orderRef.id), {
        razorpayPaymentId: payment.id,
        paymentUpdatedAt: Date.now()
      });
    });
  } else if (event.event === "payment.failed" && payment.status === "failed") {
    await setGatewayFailure({
      db, orderId: orderRef.id, gatewayOrderId: payment.order_id,
      status: "Failed"
    });
  }
  return { received: true };
}

module.exports = {
  MENU,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  normalizeItems,
  validateSession,
  requestHash,
  generateToken,
  getFirebaseServices,
  hasFirebaseServerConfiguration,
  getRazorpay,
  getConfiguredGateway,
  createOrder,
  retryPayment,
  verifyPayment,
  reportPaymentFailure,
  markCashPaid,
  webhook,
  httpError,
  requireSameOrigin
};
