const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeItems,
  validateSession,
  requestHash,
  generateToken
} = require("../server/payment-service");

test("prices are derived from the server catalog, not client prices", () => {
  const cart = normalizeItems([{ id: "berry-smoothie", quantity: 2, price: 1, name: "forged" }]);
  assert.equal(cart.total, 198);
  assert.equal(cart.amountPaise, 19800);
  assert.deepEqual(cart.items[0], {
    id: "berry-smoothie",
    name: "Berry nice smoothie",
    price: 99,
    quantity: 2
  });
});

test("rejects unknown items, duplicate lines, and invalid quantities", () => {
  assert.throws(() => normalizeItems([{ id: "unknown", quantity: 1 }]), /invalid item or quantity/);
  assert.throws(() => normalizeItems([
    { id: "brownie", quantity: 1 },
    { id: "brownie", quantity: 1 }
  ]), /invalid item or quantity/);
  assert.throws(() => normalizeItems([{ id: "brownie", quantity: 11 }]), /invalid item or quantity/);
  assert.throws(() => normalizeItems([]), /cart is empty/);
});

test("checkout sessions and idempotency keys must be high-entropy shaped values", () => {
  assert.equal(validateSession("a".repeat(64)).length, 64);
  assert.throws(() => validateSession("short"), /payment session is invalid/);
  assert.equal(requestHash("b".repeat(32)).length, 64);
  assert.throws(() => requestHash("not-an-id"), /request ID is invalid/);
});

test("server-generated pickup tokens are unique-format C2B tokens", () => {
  assert.match(generateToken(), /^C2B-[A-HJ-NP-Z2-9]{6}$/);
});
