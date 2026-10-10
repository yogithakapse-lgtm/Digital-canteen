const { webhook } = require("../server/payment-service");

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error("Webhook payload is too large."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  try {
    const result = await webhook(req, await readRawBody(req));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Razorpay webhook rejected.", error);
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "The payment webhook could not be processed."
    });
  }
};

module.exports.config = { api: { bodyParser: false } };
