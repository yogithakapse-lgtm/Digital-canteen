const service = require("../server/payment-service");

module.exports = async function handler(req, res) {
  try {
    service.requireSameOrigin(req);
    const action = req.query.action;
    if (req.method === "GET" && action === "config") {
      let gateway = null;
      try {
        gateway = service.getRazorpay();
      } catch (error) {
        console.info("Razorpay checkout is unavailable until server configuration is complete.", error.message);
      }
      const cashReady = service.hasFirebaseServerConfiguration();
      const webhookReady = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
      const requirements = [];
      if (!cashReady) {
        const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
        let serviceAccount = null;
        try {
          serviceAccount = JSON.parse(rawServiceAccount);
        } catch {
          if (rawServiceAccount) requirements.push("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.");
        }
        if (!rawServiceAccount) requirements.push("Set FIREBASE_SERVICE_ACCOUNT_JSON to the server-only Firebase service-account JSON.");
        else if (serviceAccount && (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key)) {
          requirements.push("FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key.");
        }
        if (!process.env.FIREBASE_ADMIN_EMAIL) requirements.push("Set FIREBASE_ADMIN_EMAIL to the staff account email.");
      }
      if (!process.env.RAZORPAY_KEY_ID) requirements.push("Set RAZORPAY_KEY_ID to a Razorpay test key ID (rzp_test_...).");
      if (!process.env.RAZORPAY_KEY_SECRET) requirements.push("Set RAZORPAY_KEY_SECRET to its matching server-only test secret.");
      if (process.env.RAZORPAY_MODE && !["test", "live"].includes(process.env.RAZORPAY_MODE)) {
        requirements.push("Set RAZORPAY_MODE to test or live.");
      } else if (process.env.RAZORPAY_MODE !== "live" && process.env.RAZORPAY_KEY_ID
        && !process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
        requirements.push("RAZORPAY_MODE=test requires an rzp_test_ key ID.");
      } else if (process.env.RAZORPAY_MODE === "live" && process.env.RAZORPAY_KEY_ID
        && !process.env.RAZORPAY_KEY_ID.startsWith("rzp_live_")) {
        requirements.push("RAZORPAY_MODE=live requires an rzp_live_ key ID.");
      }
      if (!webhookReady) requirements.push("Set RAZORPAY_WEBHOOK_SECRET and configure payment.captured and payment.failed at /api/razorpay-webhook.");
      return res.status(200).json({
        cashReady,
        onlineReady: Boolean(gateway && cashReady && webhookReady),
        upiReady: Boolean(gateway && cashReady && webhookReady),
        publicKeyId: gateway?.keyId || null,
        mode: gateway?.mode || null,
        setupMessage: requirements.length ? requirements.join(" ") : null
      });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed." });
    }
    if (action === "cash") return res.status(201).json(await service.createOrder(req.body, "cash"));
    if (action === "create") {
      const method = req.body?.paymentMethod;
      if (method !== "online" && method !== "upi") return res.status(400).json({ error: "Choose a supported payment method." });
      return res.status(201).json(await service.createOrder(req.body, method));
    }
    if (action === "retry") return res.status(200).json(await service.retryPayment(req.body));
    if (action === "verify") return res.status(200).json(await service.verifyPayment(req.body));
    if (action === "failed") return res.status(200).json(await service.reportPaymentFailure(req.body, "Failed"));
    if (action === "cancelled") return res.status(200).json(await service.reportPaymentFailure(req.body, "Cancelled"));
    if (action === "mark-cash-paid") return res.status(200).json(await service.markCashPaid(req, req.body));
    return res.status(404).json({ error: "Unknown payment action." });
  } catch (error) {
    console.error("Payment request failed.", error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "The payment service could not complete this request."
    });
  }
};
