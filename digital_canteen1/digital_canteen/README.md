# Crave2Bite

**Crave It. Scan It. Bite It.**

A responsive, order-ahead campus canteen app built with plain HTML, CSS, and JavaScript. Students can find and filter menu items, build an order, receive a unique pickup token, and follow its progress. Staff can see the shared kitchen queue, change order statuses, and mark items unavailable.

The existing app shell now provides separate hash-routed **Home**, **Food Details**, **Cart**, **Checkout**, and **Order Tracking** pages. Open a food card for its full image, description, current kitchen wait estimate, quantity selector, and add-to-cart action. Search, category/popular tabs, and the price filter use the same menu catalog and availability data. Cart selections persist in the existing browser storage key when navigating between pages; checkout reuses the existing cash/Razorpay payment controls and server verification. Successful order confirmation opens tracking, which displays the existing token, payment state, and live preparation status.

**The app works immediately in clearly labeled demo mode.** Demo orders, menu availability, and the cart are saved in the current browser only. Connect Firebase to share live orders between students and staff.

## Install the app on a phone

Crave2Bite is a Progressive Web App (PWA). Its manifest supplies the **Crave2Bite** app name, fork-and-spoon/QR-inspired home-screen icons, and emerald theme color. Its service worker caches **only the same-origin app shell**: the page, styles, application scripts, manifest, Firebase configuration, and local app icons. It does **not** cache or pretend to provide Firestore orders, menu photos, fonts, or QR images while offline.

The menu and cached app shell can still open offline. Adding to a basket remains possible, but the app clearly announces the lost connection, preserves the basket, and will not issue a pickup token, say an order was placed, or discard the basket unless the canteen confirms the order. If an order is already waiting for a server response, keep the page open and do not submit it a second time.

### Android installation test

1. Deploy Crave2Bite to Vercel and open its **HTTPS** production URL on your Android phone in **Chrome**. Service workers and installation require HTTPS (localhost is the local-development exception).
2. Wait for the page and its service worker to finish loading while online.
3. Tap **Install app** in the header. Chrome may display its installation prompt; confirm to add **Crave2Bite** to your home screen. If the prompt is unavailable, open Chrome's **⋮** menu and choose **Install app** or **Add to Home screen**.
4. Launch Crave2Bite from its new home-screen icon. Check that it opens in its app window and that the menu loads normally.
5. For an offline-shell check, load the app completely while online, then enable airplane mode and reopen it. The cached page should display an offline notice. Try to place an order and confirm it is **not** reported as placed. Turn airplane mode off and check that the app restores its connection.

On iPhone or iPad, open the HTTPS address in Safari, tap **Share**, and choose **Add to Home Screen**.

## Run locally

The browser-only demo can be served over HTTP from the project folder:

```bash
python -m http.server 8000
```

or:

```bash
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000). Cash orders in this browser-only demo are labeled local and pending; they do not notify a canteen and cannot confirm a real payment. Use Vercel's local function runtime to test server-backed payments:

```bash
npm install
npx vercel dev
```

A QR code is displayed on the page and encodes its current URL; scan the deployed URL from a phone to open the live canteen. `localhost` is a secure context for local PWA testing; other devices cannot install from a plain-HTTP LAN address.

## Connect Firebase for shared live orders

1. Create a project at [Firebase Console](https://console.firebase.google.com/). Add a **Web app** and copy its Firebase configuration.
2. Replace `null` in `firebase-config.js` with the configuration:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   window.FIREBASE_ADMIN_EMAIL = "canteen-admin@example.com";
   ```

3. In the Firebase console, create a **Cloud Firestore** database.
4. Open Firebase **Authentication → Sign-in method**, enable **Email/Password**, and create your staff account. Sign in with this account in the app's **For staff** dashboard. Do not enable public account creation.
5. Copy the rules in `firestore.rules` into **Firestore → Rules**, replace `REPLACE_WITH_YOUR_ADMIN_EMAIL` with the same staff email, and publish the rules.
6. Reload the app. The header should read **LIVE ORDERS**. Students can place orders without accounts through the server-side order API; staff must authenticate to update order preparation status or menu availability. Changes sync to connected browsers through Firestore listeners.

### Firebase security notes

Firebase's web-app configuration identifies your Firebase project; it is not an admin credential. Keep staff passwords private. The provided rules allow public reads of the order queue, but **deny browser-side order creation**: Vercel server functions create orders after server-side menu-price and availability checks. Private checkout-session, request-idempotency, and token-reservation documents are not client-readable. Only the designated staff email can change order preparation status or menu availability; payment status can be written only by the trusted server functions. Existing Firestore orders are not deleted or migrated by this update.

Without valid Firebase configuration, the app stays in clearly labeled **DEMO MODE**. If a Firebase configuration is present but cannot connect, the app shows **CONNECTION ISSUE** rather than silently storing online orders locally.

## Payments: Razorpay test mode, UPI, and cash

The cart offers **Online payment**, **UPI**, and **Cash at canteen**. UPI runs through Razorpay Checkout with UPI selected; Crave2Bite does not collect UPI PINs, card details, or other payment credentials. Online and UPI orders are excluded from the kitchen queue until the server verifies capture. Cash orders receive a token immediately and stay **Pending** until the signed-in canteen admin confirms cash at the counter. Payment state is stored separately from **Placed → Preparing → Ready for Pickup**.

Online and UPI are intentionally disabled in local-only **DEMO MODE** or when the payment configuration endpoint is unavailable. A plain static file server cannot run payment processing: deploy the `api/` functions to Vercel, configure `firebase-config.js` for live Firestore, and set the server-only environment variables below. The checkout setup note reports which server settings are missing; do not enable these controls by editing the browser UI.

The server creates Razorpay orders from its own INR menu-price catalog (in [`server/payment-service.js`](./server/payment-service.js)); it never trusts client-supplied prices. The browser callback is not proof of payment: the server verifies the Razorpay HMAC signature and fetches the payment directly from Razorpay, and a signed webhook also reconciles captured/failed payments. Only then is payment marked **Successful** and an online order token made public. Failed/cancelled attempts can be retried on the same order; pending attempts are deliberately not retryable until the gateway confirms their final state. Firestore request IDs and transaction-reserved tokens protect against duplicate checkout/order creation. A successful cash payment requires a verified Firebase admin ID token and can be recorded only once.

### Configure the backend

1. Deploy this project to Vercel with the `api/` functions and `package.json`; install dependencies with `npm install`. The server requires Node.js 20 or newer.
2. Create a dedicated Firebase service account with the minimum Firestore data access required (for example, **Cloud Datastore User**) and download its JSON securely. Do not put this credential in `firebase-config.js`, browser code, the repository, or chat.
3. In Vercel **Project → Settings → Environment Variables**, set these server-only variables for Preview/Development first:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — the complete service-account JSON.
   - `FIREBASE_ADMIN_EMAIL` — the exact Firebase Authentication staff email used by `firestore.rules`.
   - `RAZORPAY_MODE` — `test`.
   - `RAZORPAY_KEY_ID` — your Razorpay **test** key ID (`rzp_test_...`).
   - `RAZORPAY_KEY_SECRET` — matching Razorpay **test** secret. This must remain server-side.
   - `RAZORPAY_WEBHOOK_SECRET` — a separate webhook secret you choose in the Razorpay Dashboard.
4. In Razorpay test mode, configure a webhook pointing to `https://YOUR-VERCEL-DOMAIN/api/razorpay-webhook` and subscribe to `payment.captured` and `payment.failed`. Use the exact same webhook secret in Vercel. Redeploy after changing environment variables.
5. Publish the rules in [`firestore.rules`](./firestore.rules). They intentionally stop direct client order creation; the server uses the Firebase Admin SDK. Existing order records remain readable and are not removed.
6. Open the deployed HTTPS site. Test with Razorpay's official test instruments and test UPI flow from the Razorpay dashboard documentation. The cart shows disabled/unavailable payment methods if backend secrets are absent. The public Razorpay key ID is returned to the checkout only; the key secret and Firebase service-account key are never sent to the browser.
7. Only after successful test-mode verification and webhook checks should you switch to `RAZORPAY_MODE=live` and matching `rzp_live_...` credentials. Remove test credentials from production and use separate Vercel Preview/Production values.

Never manually set a payment to Successful in Firestore. Do not expose the Razorpay key secret, webhook secret, or service-account JSON. For a public production launch, add edge/API rate limiting and abuse monitoring appropriate to your Vercel plan; checkout idempotency prevents accidental duplicates but is not a general rate limiter.

### Payment status meanings and tests

- **Successful** — server verified a captured Razorpay payment, or the authenticated admin confirmed cash received.
- **Failed** — Razorpay API/webhook confirmed the attempt failed. Retry the same order.
- **Pending** — payment is not yet captured/confirmed. No paid confirmation or online token is shown; do not pay again while pending.
- **Cancelled** — the Razorpay order remained unattempted when checkout was dismissed. If Razorpay reports an attempted/uncertain order, it stays Pending instead of being treated as cancelled.

Run `npm test` for server-side menu pricing, input validation, session-key, and token-format tests. Test the full gateway lifecycle in Razorpay test mode: successful and captured online payment; failed payment then retry; dismiss an unattempted checkout; delayed UPI capture and webhook reconciliation; cash placement with Pending status; reject a non-admin or non-cash paid update; repeated checkout request and repeated verify call; and an offline/API failure that leaves the basket/token unconfirmed. Verify the order's preparation status is unchanged by payment callbacks.

The included `vercel.json` sets basic browser security headers. The images and fonts are provided by Unsplash and Google Fonts; they require an internet connection and are intentionally not cached by the service worker. The on-page QR code is generated by `api.qrserver.com` and also needs an internet connection.

1. Import the project folder or its Git repository into [Vercel](https://vercel.com/new).
2. Select **Other** as the framework preset. There is no frontend build command or output directory; Vercel installs the dependencies in `package.json` and deploys the `api/` Node functions alongside the static app.
3. Add the Firebase browser configuration and the server-only payment credentials from [Configure the backend](#configure-the-backend). Ensure your domain is listed under **Firebase Authentication → Settings → Authorized domains**.
4. Confirm that your deployed URL uses **HTTPS**; Vercel provisions HTTPS for its deployment domains automatically. If using a custom domain, connect and verify its DNS in **Vercel → Settings → Domains** and wait for its HTTPS certificate to become active.
5. Visit the HTTPS production URL on your Android device and follow [the Android installation test](#android-installation-test). If using Firebase, add your exact Vercel or custom hostname in **Firebase Authentication → Settings → Authorized domains**. The QR code opens the current site URL; test it from a phone with network access.

The included `vercel.json` sets basic browser security headers. The images and fonts are provided by Unsplash and Google Fonts; they require an internet connection and are intentionally not cached by the service worker. The on-page QR code is generated by `api.qrserver.com` and also needs an internet connection.

## BiteBot AI and canteen analytics

Open the floating **BiteBot AI** button to ask the on-device, rule-based assistant for recommendations. Enter a budget, use a menu name or category as a preference, ask for popular items, or try a suggested budget. Recommendations are calculated from the actual `FOOD_ITEMS` menu, current shared menu availability, submitted budget, and quantities recorded in orders. An unavailable dish is excluded, recommended item prices come directly from the menu, and **Add** puts the checked menu item or within-budget two-item combination into the existing cart. Allergens and dietary suitability are not inferred from descriptions; confirm these with canteen staff.

BiteBot works without an AI key, account, API, or network call. It is explicitly labeled **RULE-BASED · ON DEVICE**. There is no AI API endpoint or API key configured in this static starter. Do not place a secret API key in the browser or a public `firebase-config.js`; any future AI integration should use a secured server-side endpoint and should return recommendations restricted to known, currently available menu IDs and prices.

The authenticated staff dashboard includes **Crave2Bite analytics**, derived from the same recorded order documents as the dashboard. It shows recorded order totals, statuses, average order total, actual menu units ordered, and current availability. Demo analytics represent **this browser's local demo orders only**, not campus-wide activity. Firestore analytics use the latest 100 orders loaded by the dashboard and say so when the history reaches that limit. With no recorded sales, the dashboard explicitly says that sales have not yet been recorded. Recorded order totals are **not confirmed payments**. The curated “campus favorite” labels are menu labels, not measured sales.

## App features

- Responsive student menu with category filters, text search, popular picks, item images, and INR prices.
- Separate Home, Food Details, Cart, Checkout, and Order Tracking pages with bookmarkable hash routes.
- Food details with the existing menu image, description, listed price, live-queue-based preparation estimate, and quantity controls.
- Cart with working quantity controls, totals, and an unavailable-item check at checkout.
- Unique `SC-XXXXXX` pickup tokens and order tracking across **Placed → Preparing → Ready for Pickup**.
- Live kitchen queue and a wait-time estimate based on active orders.
- Staff dashboard with order management and item availability controls.
- Local, persistent demo mode for development without Firebase.
- Firestore listeners for online orders and shared menu availability.
- Installable Android PWA with app icons, a home-screen manifest, and an offline app-shell cache.
- Explicit offline and unconfirmed-order feedback; an order token appears only after the configured order backend confirms success.
- On-device BiteBot recommendations, priced menu combinations, current availability, recorded-sales popularity, and add-to-cart actions.
- Staff-only order analytics with explicit local-demo and latest-100-order scope.
- Razorpay online and UPI checkout with server-verified payment state, retry handling, webhook reconciliation, and counter cash confirmation.

Crave2Bite keeps existing browser storage keys, Firebase collections and order records, QR ordering, cart and token behavior, and PWA installation data in place. Payment processing is provided by the server-side Razorpay/Firebase configuration described above; without valid server credentials, live payment options remain unavailable rather than simulating a successful payment.
