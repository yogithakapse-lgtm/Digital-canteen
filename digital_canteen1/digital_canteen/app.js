const FOOD_ITEMS = [
  { id: "paneer-bowl", name: "The paneer sunshine bowl", category: "Mains", price: 189, description: "Golden paneer, fluffy rice & a little green goodness.", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80", badge: "CAMPUS FAVORITE", popular: true },
  { id: "avocado-toast", name: "Avocado garden toast", category: "Breakfast", price: 129, description: "Sourdough, buttery avo & a squeeze of sunshine.", image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=700&q=80", badge: "SO GOOD", popular: true },
  { id: "masala-wrap", name: "The masala mood wrap", category: "Mains", price: 149, description: "Spiced veggies wrapped up with minty magic.", image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=700&q=80", badge: "STUDENT PICK", popular: true },
  { id: "berry-smoothie", name: "Berry nice smoothie", category: "Drinks", price: 99, description: "Strawberries, blueberries & good-vibe energy.", image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=700&q=80", badge: "FEEL-GOOD SIP", popular: true },
  { id: "tomato-pasta", name: "Sunday tomato pasta", category: "Mains", price: 179, description: "Twisty pasta with slow-cooked tomato love.", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=700&q=80", badge: "MADE FRESH", popular: false },
  { id: "crispy-potatoes", name: "Crispy little potatoes", category: "Sides", price: 79, description: "Golden, crunchy & basically everyone's plus-one.", image: "https://images.unsplash.com/photo-1518013431117-eb1465fa5752?auto=format&fit=crop&w=700&q=80", badge: "PERFECT SIDE", popular: false },
  { id: "iced-matcha", name: "Honey-iced matcha", category: "Drinks", price: 119, description: "A cool little pick-me-up with a honey hug.", image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=700&q=80", badge: "FEEL-GOOD SIP", popular: false },
  { id: "brownie", name: "The very happy brownie", category: "Sweet", price: 89, description: "Warm, fudgy, and absolutely worth it.", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=80", badge: "SAVE ROOM", popular: false }
];

const ORDER_STATUSES = ["Placed", "Preparing", "Ready for Pickup"];
const PAYMENT_STATUSES = ["Successful", "Failed", "Pending", "Cancelled"];
const DEMO_ORDERS_KEY = "smart-canteen-demo-orders";
const CART_KEY = "smart-canteen-cart";
const LATEST_ORDER_KEY = "smart-canteen-latest-order";
const PAYMENT_SESSION_KEY = "crave2bite-payment-session";

const elements = {
  badge: document.querySelector("#mode-badge"),
  grid: document.querySelector("#menu-grid"),
  tabs: document.querySelector("#category-tabs"),
  search: document.querySelector("#search-input"),
  empty: document.querySelector("#empty-menu"),
  popularBanner: document.querySelector("#popular-banner"),
  cartCount: document.querySelector("#cart-count"),
  queueCount: document.querySelector("#queue-count"),
  queueLabel: document.querySelector("#queue-label"),
  waitTime: document.querySelector("#wait-time"),
  overlay: document.querySelector("#overlay"),
  cartPanel: document.querySelector("#cart-panel"),
  cartItems: document.querySelector("#cart-items"),
  cartEmpty: document.querySelector("#cart-empty"),
  cartFooter: document.querySelector("#cart-footer"),
  cartTotal: document.querySelector("#cart-total"),
  statusDialog: document.querySelector("#status-dialog"),
  statusContent: document.querySelector("#order-dialog-content"),
  adminDialog: document.querySelector("#admin-dialog"),
  adminView: document.querySelector("#admin-view"),
  toastRegion: document.querySelector("#toast-region"),
  notificationDot: document.querySelector("#order-notification-dot"),
  qr: document.querySelector("#qr-code-image"),
  installButton: document.querySelector("#install-app-button"),
  networkStatus: document.querySelector("#network-status"),
  smartbitePanel: document.querySelector("#smartbite-panel"),
  smartbiteLauncher: document.querySelector("#smartbite-launcher"),
  smartbiteMessages: document.querySelector("#smartbite-messages"),
  smartbiteForm: document.querySelector("#smartbite-form"),
  smartbiteMode: document.querySelector("#smartbite-mode"),
  homePage: document.querySelector("#home-page"),
  detailsPage: document.querySelector("#food-details-page"),
  cartPage: document.querySelector("#cart-page"),
  checkoutPage: document.querySelector("#checkout-page"),
  trackingPage: document.querySelector("#tracking-page"),
  trackingContent: document.querySelector("#tracking-page-content"),
  feedbackPage: document.querySelector("#feedback-page"),
  feedbackQr: document.querySelector("#feedback-qr-image"),
  feedbackQrPlaceholder: document.querySelector("#feedback-qr-placeholder"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackFormStatus: document.querySelector("#feedback-form-status"),
  feedbackSubmit: document.querySelector("#feedback-submit")
};

const memory = {
  mode: "demo",
  backendError: "",
  db: null,
  auth: null,
  categories: ["All", "Popular", "Breakfast", "Mains", "Sides", "Drinks", "Sweet"],
  category: "All",
  cart: loadJSON(CART_KEY, {}),
  orders: loadJSON(DEMO_ORDERS_KEY, []),
  unavailable: [],
  latestToken: localStorage.getItem(LATEST_ORDER_KEY),
  user: null,
  firestore: null,
  firebaseAuth: null,
  visibleDialog: null,
  statusTimer: null,
  installPrompt: null,
  pendingOrder: null,
  paymentSession: loadJSON(PAYMENT_SESSION_KEY, null),
  paymentCapabilities: { cashReady: false, onlineReady: false, upiReady: false, publicKeyId: null, mode: null, setupMessage: "" },
  confirmedTokens: new Set(),
  checkoutInProgress: false,
  page: "home",
  selectedFoodId: null,
  detailQuantity: 1,
  feedbackConfig: { configured: false, submissionReady: false, url: null, qrDataUrl: null, message: "Feedback service is not configured." }
};

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    console.warn(`Couldn't read saved ${key}; starting with an empty value.`, error);
    return fallback;
  }
}

function normalizeUnavailableIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id) => FOOD_ITEMS.some((item) => item.id === id)))];
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function isFirebaseConfigured(config) {
  return config && typeof config === "object"
    && typeof config.apiKey === "string" && config.apiKey.length > 0
    && !config.apiKey.includes("YOUR_")
    && typeof config.projectId === "string" && config.projectId.length > 0
    && !config.projectId.includes("YOUR_")
    && typeof config.appId === "string" && config.appId.length > 0
    && !config.appId.includes("YOUR_");
}

async function configureBackend() {
  const config = window.FIREBASE_CONFIG;
  if (!isFirebaseConfigured(config)) return;

  memory.mode = "error";
  setModeBadge();
  try {
    const [appModule, firestoreModule, authModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js")
    ]);
    const app = appModule.initializeApp(config);
    memory.db = firestoreModule.getFirestore(app);
    memory.auth = authModule.getAuth(app);
    memory.firestore = firestoreModule;
    memory.firebaseAuth = authModule;
    memory.mode = "firebase";
  } catch (error) {
    memory.backendError = error.message;
    console.error("Crave2Bite couldn't connect to Firebase.", error);
    showToast("Firebase couldn't connect. Check your configuration and internet connection.", true);
  }
  setModeBadge();
}

function setModeBadge() {
  const labels = { demo: "DEMO MODE", firebase: "LIVE ORDERS", error: "CONNECTION ISSUE" };
  elements.badge.replaceChildren();
  const dot = document.createElement("span");
  dot.className = "mode-indicator";
  dot.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "mode-label";
  const compactLabels = { demo: "DEMO", firebase: "LIVE", error: "ISSUE" };
  text.textContent = window.matchMedia("(max-width: 370px)").matches
    ? compactLabels[memory.mode]
    : labels[memory.mode];
  elements.badge.append(dot, text);
  elements.badge.setAttribute("aria-label", labels[memory.mode]);
  elements.badge.classList.toggle("online", memory.mode === "firebase");
  elements.badge.classList.toggle("connection-error", memory.mode === "error");
  elements.badge.title = memory.mode === "demo"
    ? "Demo mode: orders are saved only in this browser."
    : memory.mode === "error" ? "Firebase could not be initialized. Please check firebase-config.js." : "Live mode: orders and availability sync through Firebase Firestore.";
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4000);
}

function updateNetworkStatus() {
  const offline = !navigator.onLine;
  elements.networkStatus.hidden = !offline;
  if (offline && memory.pendingOrder) {
    showToast("Connection lost while the server was confirming your order. Leave this page open; we will tell you when it is confirmed.", true);
  }
}

async function refreshPaymentCapabilities() {
  if (memory.mode !== "firebase") {
    memory.paymentCapabilities = {
      cashReady: false,
      onlineReady: false,
      upiReady: false,
      publicKeyId: null,
      mode: null,
      setupMessage: "Online payment and UPI need live Firebase configuration in firebase-config.js, the Vercel /api/payments and /api/razorpay-webhook functions, and these server-only Vercel variables: FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_ADMIN_EMAIL, RAZORPAY_MODE=test, RAZORPAY_KEY_ID (rzp_test_...), RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET. Cash remains available as a clearly labeled local demo only until the live server is configured."
    };
    renderCart();
    return;
  }
  try {
    const response = await fetch("/api/payments?action=config", { cache: "no-store" });
    if (!response.ok) throw new Error(`Payment setup returned HTTP ${response.status}.`);
    const config = await response.json();
    memory.paymentCapabilities = {
      cashReady: config.cashReady === true,
      onlineReady: config.onlineReady === true,
      upiReady: config.upiReady === true,
      publicKeyId: typeof config.publicKeyId === "string" ? config.publicKeyId : null,
      mode: config.mode || null,
      setupMessage: config.setupMessage || ""
    };
  } catch (error) {
    memory.paymentCapabilities = {
      cashReady: false,
      onlineReady: false,
      upiReady: false,
      publicKeyId: null,
      mode: null,
      setupMessage: "The payment API is unavailable. Deploy the Vercel api/payments.js and api/razorpay-webhook.js functions (a static/local file server cannot process online payments), configure Firebase in firebase-config.js, then set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_ADMIN_EMAIL, RAZORPAY_MODE=test, RAZORPAY_KEY_ID (rzp_test_...), RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET in Vercel and redeploy."
    };
    console.error("Couldn't load secure payment configuration.", error);
  }
  renderCart();
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function updateInstallButton() {
  elements.installButton.hidden = isInstalled();
}

async function installApp() {
  if (memory.installPrompt) {
    const prompt = memory.installPrompt;
    memory.installPrompt = null;
    updateInstallButton();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        showToast("Crave2Bite is being added to your home screen.");
      }
    } catch (error) {
      console.error("The app installation prompt failed.", error);
      showToast("Couldn't open the install prompt. Try your browser's Add to Home screen menu instead.", true);
    }
    return;
  }
  if (isInstalled()) {
    updateInstallButton();
    showToast("Crave2Bite is already installed.");
    return;
  }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    showToast("To install, tap Share in Safari, then choose Add to Home Screen.");
  } else {
    showToast("Install isn't available yet. In Chrome, open ⋮ and choose Install app or Add to Home screen.");
  }
}

async function registerAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
  } catch (error) {
    console.error("Crave2Bite could not register its offline app shell.", error);
    showToast("Offline support and installation need a secure HTTPS connection. The canteen is still available online.", true);
  }
}

async function withTimeout(promise, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

function saveLocalState() {
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(memory.orders));
  localStorage.setItem(CART_KEY, JSON.stringify(memory.cart));
}

function renderCategories() {
  elements.tabs.innerHTML = memory.categories.map((category) => `
    <button class="category-tab${category === memory.category ? " active" : ""}" type="button"
      aria-pressed="${category === memory.category}" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>
  `).join("");
}

function renderMenu() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const maxPrice = Number(document.querySelector("#price-filter")?.value || 0);
  const items = FOOD_ITEMS.filter((item) => {
    if (memory.unavailable.includes(item.id)) return false;
    const matchesCategory = memory.category === "All"
      || (memory.category === "Popular" ? item.popular : item.category === memory.category);
    const matchesQuery = !query || `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase().includes(query);
    return matchesCategory && matchesQuery && (!maxPrice || item.price < maxPrice);
  });
  elements.popularBanner.classList.toggle("hidden", Boolean(query) || !["All", "Popular"].includes(memory.category));
  elements.grid.innerHTML = items.map((item) => `
    <article class="food-card" data-food="${item.id}" tabindex="0" role="link" aria-label="View details for ${escapeHTML(item.name)}">
      <div class="food-image-wrap">
        <img class="food-image" src="${item.image}" alt="${escapeHTML(item.name)}" loading="lazy" />
        <span class="food-badge${item.popular ? " popular" : ""}">${escapeHTML(item.badge)}</span>
      </div>
      <div class="food-card-body">
        <div class="food-category">${escapeHTML(item.category)} · vegetarian</div>
        <h3 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h3>
        <p class="food-description">${escapeHTML(item.description)}</p>
        <div class="food-card-bottom"><span class="food-price">${formatPrice(item.price)} <small>each</small></span>
          <button class="add-button" type="button" data-add="${item.id}" aria-label="Add ${escapeHTML(item.name)} to your order"${memory.pendingOrder || memory.paymentSession ? " disabled" : ""}>+</button></div>
      </div>
    </article>
  `).join("");
  elements.empty.hidden = items.length > 0;
  if (items.length === 0) {
    elements.empty.innerHTML = query
      ? `<span>No good things found for "${escapeHTML(elements.search.value.trim())}".</span><button id="clear-search" type="button">Clear your search ↗</button>`
      : "<span>Nothing on the menu right now. Check back soon.</span>";
  }
  if (memory.page === "details") renderFoodDetails();
}

function currentKitchenEstimate() {
  const count = activeOrders().length;
  return `${Math.max(5, count * 4 + 5)} min`;
}

function renderFoodDetails() {
  const item = FOOD_ITEMS.find((food) => food.id === memory.selectedFoodId);
  if (!item) return;
  const unavailable = memory.unavailable.includes(item.id);
  const quantityInCart = memory.cart[item.id] || 0;
  const maxAddable = Math.max(0, 10 - quantityInCart);
  memory.detailQuantity = Math.min(Math.max(1, memory.detailQuantity), Math.max(1, maxAddable));
  elements.detailsPage.innerHTML = `
    <div class="detail-breadcrumb"><a href="#home-menu">Home</a><span>/</span><span>${escapeHTML(item.category)}</span><span>/</span><span>${escapeHTML(item.name)}</span></div>
    <article class="food-detail-card">
      <img class="food-detail-image" src="${item.image}" alt="${escapeHTML(item.name)}" />
      <div class="food-detail-copy">
        <span class="eyebrow">${escapeHTML(item.category)}${item.popular ? " · CAMPUS FAVORITE" : ""}</span>
        <h1>${escapeHTML(item.name)}</h1>
        <p class="food-detail-description">${escapeHTML(item.description)}</p>
        <strong class="food-detail-price">${formatPrice(item.price)}</strong>
        <div class="food-detail-facts"><span><strong>Kitchen estimate</strong><small>About ${escapeHTML(currentKitchenEstimate())} based on the live queue</small></span><span><strong>Freshly made</strong><small>Prepared by your campus canteen</small></span></div>
        ${unavailable ? '<p class="detail-unavailable">This item is currently unavailable.</p>' : `
          <div class="detail-order-row">
            <div class="detail-quantity" aria-label="Choose quantity"><button type="button" data-detail-quantity="-1" aria-label="Remove one"${memory.detailQuantity <= 1 ? " disabled" : ""}>−</button><output id="detail-quantity">${memory.detailQuantity}</output><button type="button" data-detail-quantity="1" aria-label="Add one"${memory.detailQuantity >= maxAddable ? " disabled" : ""}>+</button></div>
            <button class="detail-add-button" type="button" data-detail-add="${item.id}"${memory.pendingOrder || memory.paymentSession || !maxAddable ? " disabled" : ""}>${maxAddable ? `Add to cart · ${formatPrice(item.price * memory.detailQuantity)}` : "Maximum quantity in cart"}</button>
          </div>
          ${quantityInCart ? `<p class="detail-cart-note">${quantityInCart} already in your cart · <a href="#cart">View cart ↗</a></p>` : ""}`}
      </div>
    </article>`;
}

function renderPageCart() {
  const entries = cartEntries();
  const empty = entries.length === 0;
  const pageItems = document.querySelector("#cart-page-items");
  const pageEmpty = document.querySelector("#cart-page-empty");
  pageItems.hidden = empty;
  pageEmpty.hidden = !empty;
  document.querySelector("#cart-page-summary").hidden = empty;
  const continueButton = document.querySelector("#continue-checkout");
  if (continueButton) continueButton.textContent = `Continue to checkout · ${formatPrice(entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0))}`;
  continueButton.hidden = empty;
}

function mountCartForPage() {
  const itemsTarget = memory.page === "cart" ? document.querySelector("#cart-page-items")
    : memory.page === "checkout" ? document.querySelector("#checkout-page-items")
      : elements.cartPanel;
  const footerTarget = memory.page === "cart" ? document.querySelector("#cart-page-summary")
    : memory.page === "checkout" ? document.querySelector("#checkout-page-controls")
      : elements.cartPanel;
  itemsTarget.append(elements.cartItems);
  footerTarget.append(elements.cartFooter);
  elements.cartPanel.classList.toggle("route-mounted", memory.page === "cart" || memory.page === "checkout");
  elements.cartPanel.setAttribute("aria-hidden", String(memory.page !== "cart" && memory.page !== "checkout" && !elements.cartPanel.classList.contains("open")));
}

function renderRouteTracking() {
  if (!elements.trackingContent) return;
  elements.trackingContent.innerHTML = elements.statusContent.innerHTML;
}

function renderFeedbackRatings() {
  const labels = {
    experience: "Overall experience",
    foodQuality: "Food quality",
    cleanliness: "Cleanliness",
    staffService: "Staff service"
  };
  for (const fieldset of document.querySelectorAll(".feedback-rating")) {
    const name = fieldset.dataset.rating;
    const label = labels[name];
    fieldset.innerHTML = `<legend>${escapeHTML(label)} <span>(required)</span></legend><div class="feedback-stars" role="radiogroup" aria-label="${escapeHTML(label)}">${[1, 2, 3, 4, 5].map((rating) => `
      <label><input type="radio" name="${name}" value="${rating}" required /><span aria-hidden="true">★</span><span class="visually-hidden">${rating} ${rating === 1 ? "star" : "stars"}</span></label>`).join("")}</div>`;
  }
}

async function loadFeedbackConfiguration() {
  try {
    const response = await fetch("/api/feedback", { cache: "no-store" });
    if (!response.ok) throw new Error(`Feedback setup returned HTTP ${response.status}.`);
    const config = await response.json();
    memory.feedbackConfig = {
      configured: config.configured === true,
      submissionReady: config.submissionReady === true,
      url: typeof config.url === "string" ? config.url : null,
      qrDataUrl: typeof config.qrDataUrl === "string" ? config.qrDataUrl : null,
      message: typeof config.message === "string" ? config.message : ""
    };
    if (memory.feedbackConfig.configured && memory.feedbackConfig.qrDataUrl) {
      elements.feedbackQr.src = memory.feedbackConfig.qrDataUrl;
      elements.feedbackQr.alt = "Scannable QR code linking to the Crave2Bite canteen feedback form";
      elements.feedbackQr.hidden = false;
      elements.feedbackQrPlaceholder.hidden = true;
    } else {
      elements.feedbackQr.hidden = true;
      elements.feedbackQrPlaceholder.hidden = false;
      elements.feedbackQrPlaceholder.textContent = config.message || "Feedback QR is not configured. Set CANTEEN_FEEDBACK_URL on the server.";
    }
    if (!memory.feedbackConfig.submissionReady) {
      elements.feedbackFormStatus.textContent = config.message || "Feedback submissions are not connected yet; nothing will be sent.";
      elements.feedbackSubmit.disabled = true;
    } else {
      elements.feedbackFormStatus.textContent = "";
      elements.feedbackSubmit.disabled = false;
    }
  } catch (error) {
    memory.feedbackConfig = {
      configured: false,
      submissionReady: false,
      url: null,
      qrDataUrl: null,
      message: "Feedback isn't connected in this environment. Deploy the Vercel feedback API and configure CANTEEN_FEEDBACK_URL plus Firebase Admin credentials before scanning or submitting."
    };
    elements.feedbackQr.hidden = true;
    elements.feedbackQrPlaceholder.hidden = false;
    elements.feedbackQrPlaceholder.textContent = memory.feedbackConfig.message;
    elements.feedbackFormStatus.textContent = memory.feedbackConfig.message;
    elements.feedbackSubmit.disabled = true;
    console.error("Couldn't load the canteen feedback service configuration.", error);
  }
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = elements.feedbackForm;
  const values = Object.fromEntries([...form.querySelectorAll('.feedback-rating input:checked')].map((input) => [input.name, Number(input.value)]));
  const fields = ["experience", "foodQuality", "cleanliness", "staffService"];
  if (fields.some((field) => !Number.isInteger(values[field]) || values[field] < 1 || values[field] > 5)) {
    elements.feedbackFormStatus.textContent = "Please select a 1–5 star rating for each category.";
    form.querySelector(".feedback-rating input:not(:checked)")?.focus();
    return;
  }
  const comments = document.querySelector("#feedback-comments").value.trim();
  if (comments.length > 1000) {
    elements.feedbackFormStatus.textContent = "Please keep your comments to 1,000 characters or fewer.";
    return;
  }
  if (!memory.feedbackConfig.submissionReady) {
    elements.feedbackFormStatus.textContent = memory.feedbackConfig.message || "Feedback submission isn't connected, so nothing was sent.";
    return;
  }
  elements.feedbackSubmit.disabled = true;
  elements.feedbackFormStatus.textContent = "Sending your feedback…";
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        comments,
        anonymous: document.querySelector("#feedback-anonymous").checked
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.saved !== true) throw new Error(result.error || "The feedback server did not confirm receipt.");
    form.reset();
    elements.feedbackFormStatus.textContent = "Thank you—your feedback was received by the canteen.";
  } catch (error) {
    console.error("Feedback submission was not confirmed.", error);
    elements.feedbackFormStatus.textContent = `${error.message || "Feedback could not be submitted."} Nothing was confirmed as saved; please try again later.`;
  } finally {
    elements.feedbackSubmit.disabled = !memory.feedbackConfig.submissionReady;
  }
}

function goToPage(route) {
  const target = `#${route}`;
  if (window.location.hash === target) {
    updatePage();
    return;
  }
  window.location.hash = route;
}

function updatePage() {
  const route = window.location.hash.replace(/^#/, "");
  const detailMatch = route.match(/^food\/([a-z0-9-]+)$/);
  const item = detailMatch && FOOD_ITEMS.find((food) => food.id === detailMatch[1]);
  const page = ["cart", "checkout", "track", "feedback"].includes(route) ? route
    : item ? "details" : "home";
  if (page === "checkout" && cartEntries().length === 0 && !memory.paymentSession) {
    window.location.hash = "cart";
    return;
  }
  if (memory.selectedFoodId !== item?.id) memory.detailQuantity = 1;
  memory.page = page;
  memory.selectedFoodId = item?.id || null;
  for (const [name, element] of Object.entries({
    home: elements.homePage,
    details: elements.detailsPage,
    cart: elements.cartPage,
    checkout: elements.checkoutPage,
    track: elements.trackingPage,
    feedback: elements.feedbackPage
  })) element.hidden = name !== page;
  document.body.dataset.page = page;
  document.querySelector(".site-footer").hidden = page !== "home";
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", page === "home" && link.getAttribute("href") === "#home-menu"
      || page === "track" && link.getAttribute("href") === "#track");
  });
  mountCartForPage();
  if (page === "details") renderFoodDetails();
  if (page === "cart" || page === "checkout") {
    renderCart();
    renderPageCart();
  }
  if (page === "track") {
    renderOrderStatus();
    renderRouteTracking();
  }
  if (page === "feedback") renderFeedbackRatings();
  setOpenPanel(null);
  elements.cartPanel.setAttribute("aria-hidden", String(page !== "cart" && page !== "checkout"));
  window.scrollTo({ top: 0, behavior: "auto" });
  if (route === "home-menu" || route === "how-it-works") {
    document.querySelector(route === "home-menu" ? "#menu-section" : "#how-it-works")
      .scrollIntoView({ behavior: "smooth" });
  }
}

function cartEntries() {
  return Object.entries(memory.cart)
    .filter(([id, quantity]) => FOOD_ITEMS.some((item) => item.id === id) && quantity > 0)
    .map(([id, quantity]) => ({ item: FOOD_ITEMS.find((food) => food.id === id), quantity }));
}

function renderCart() {
  const entries = cartEntries();
  const totalItems = entries.reduce((count, entry) => count + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  elements.cartCount.textContent = String(totalItems);
  elements.cartEmpty.hidden = entries.length > 0;
  elements.cartItems.hidden = entries.length === 0;
  elements.cartFooter.hidden = entries.length === 0;
  elements.cartItems.innerHTML = entries.map(({ item, quantity }) => `
    <article class="cart-item" data-food="${item.id}" tabindex="0" role="link" aria-label="View details for ${escapeHTML(item.name)}">
      <img class="cart-item-image" src="${item.image}" alt="" loading="lazy" />
      <div class="cart-item-details"><h3>${escapeHTML(item.name)}</h3><span>${formatPrice(item.price)} each</span>
        <div class="quantity-controls" aria-label="Quantity of ${escapeHTML(item.name)}">
          <button type="button" data-quantity="-1" data-id="${item.id}" aria-label="Remove one ${escapeHTML(item.name)}"${memory.pendingOrder || memory.paymentSession ? " disabled" : ""}>−</button>
          <span>${quantity}</span>
          <button type="button" data-quantity="1" data-id="${item.id}" aria-label="Add one ${escapeHTML(item.name)}"${memory.pendingOrder || memory.paymentSession ? " disabled" : ""}>+</button>
        </div>
      </div><span class="cart-item-total">${formatPrice(item.price * quantity)}</span>
    </article>
  `).join("");
  elements.cartTotal.textContent = formatPrice(total);
  const paymentSessionOrder = memory.paymentSession?.orderId
    ? memory.orders.find((order) => order.id === memory.paymentSession.orderId)
    : null;
  const paymentState = memory.paymentSession?.status || paymentSessionOrder?.paymentStatus || "";
  const retryPayment = memory.paymentSession && (["Failed", "Cancelled"].includes(paymentState)
    || (!memory.paymentSession.orderId && memory.paymentSession.status === "Starting"));
  const methodInputs = [...document.querySelectorAll('input[name="payment-method"]')];
  for (const input of methodInputs) {
    input.checked = input.value === (memory.paymentSession?.method || selectedPaymentMethod());
    input.disabled = memory.checkoutInProgress || Boolean(memory.pendingOrder)
      || Boolean(memory.paymentSession)
      || (input.value === "online" && (memory.mode !== "firebase" || !memory.paymentCapabilities.onlineReady))
      || (input.value === "upi" && (memory.mode !== "firebase" || !memory.paymentCapabilities.upiReady))
      || (input.value === "cash" && memory.mode === "firebase" && !memory.paymentCapabilities.cashReady);
  }
  const setupNote = document.querySelector("#payment-setup-note");
  if (setupNote) {
    const selectedMethod = memory.paymentSession?.method || selectedPaymentMethod();
    const unavailable = memory.mode === "demo"
      || !memory.paymentCapabilities.onlineReady
      || !memory.paymentCapabilities.upiReady
      || (memory.mode === "firebase" && !memory.paymentCapabilities.cashReady);
    const demoCash = memory.mode === "demo" && selectedMethod === "cash";
    setupNote.hidden = !unavailable;
    setupNote.textContent = demoCash
      ? `Demo mode: cash orders are saved only in this browser. No canteen is notified and no payment is collected. Online payment and UPI stay disabled until live setup is complete. ${memory.paymentCapabilities.setupMessage}`
      : memory.paymentCapabilities.setupMessage || (memory.mode === "firebase" && !memory.paymentCapabilities.cashReady
        ? "Cash orders need FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_ADMIN_EMAIL configured in the Vercel server environment."
        : "This payment method is not configured on the canteen server yet.");
  }
  const paymentStatusNote = document.querySelector("#payment-status-note");
  if (paymentStatusNote) {
    paymentStatusNote.hidden = !memory.paymentSession;
    const currentStatus = paymentState || "Pending";
    paymentStatusNote.innerHTML = `<strong>Payment · ${escapeHTML(currentStatus)}</strong><br />${currentStatus === "Failed"
      ? "The gateway confirmed failure. Retry this same order; don't create another one."
      : currentStatus === "Cancelled"
        ? "The gateway confirmed cancellation. You can retry this order or close checkout."
        : "The server has not confirmed payment yet. Don't pay again; your pickup token appears only after verification."}`;
  }
  const checkoutButton = document.querySelector("#checkout-button");
  if (checkoutButton) {
    const selectedMethod = memory.paymentSession?.method || selectedPaymentMethod();
    const unavailable = selectedMethod === "online" ? !memory.paymentCapabilities.onlineReady
      : selectedMethod === "upi" ? !memory.paymentCapabilities.upiReady
        : memory.mode === "firebase" && !memory.paymentCapabilities.cashReady;
    checkoutButton.disabled = memory.checkoutInProgress || Boolean(memory.pendingOrder)
      || (Boolean(memory.paymentSession) && !retryPayment)
      || unavailable;
    if (memory.pendingOrder) {
      checkoutButton.innerHTML = '<span>Waiting for server confirmation…</span>';
    } else if (retryPayment) {
      checkoutButton.textContent = memory.paymentSession.orderId ? "Retry payment" : "Resume payment setup";
      checkoutButton.dataset.retryPayment = "true";
    } else if (memory.paymentSession) {
      checkoutButton.textContent = "Payment pending — checking";
      delete checkoutButton.dataset.retryPayment;
    } else if (memory.checkoutInProgress) {
      checkoutButton.textContent = "Placing your order...";
    } else {
      delete checkoutButton.dataset.retryPayment;
      checkoutButton.innerHTML = 'Place my order <span>↗</span>';
    }
    if (memory.page === "cart" || memory.page === "checkout") {
      mountCartForPage();
      renderPageCart();
    }
  }
}

function selectedPaymentMethod() {
  return document.querySelector('input[name="payment-method"]:checked')?.value || "cash";
}

function activeOrders() {
  return memory.orders.filter((order) => order.status !== "Ready for Pickup"
    && (!["online", "upi"].includes(order.paymentMethod) || order.paymentStatus === "Successful"));
}

function getPopularItems() {
  const soldUnits = new Map(FOOD_ITEMS.map((item) => [item.id, 0]));
  for (const order of memory.orders) {
    if (order.paymentStatus && order.paymentStatus !== "Successful") continue;
    if (!Array.isArray(order.items)) continue;
    for (const line of order.items) {
      if (!soldUnits.has(line.id) || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) continue;
      soldUnits.set(line.id, soldUnits.get(line.id) + line.quantity);
    }
  }
  return FOOD_ITEMS.map((item) => ({ ...item, soldUnits: soldUnits.get(item.id) }))
    .sort((left, right) =>
      right.soldUnits - left.soldUnits
      || Number(right.popular) - Number(left.popular)
      || left.price - right.price
      || left.name.localeCompare(right.name));
}

function deriveAnalytics() {
  const recordedOrders = memory.orders.filter((order) => order && Number.isFinite(order.total)
    && (!order.paymentStatus || order.paymentStatus === "Successful"));
  const topItems = getPopularItems().filter((item) => item.soldUnits > 0);
  const orderTotal = recordedOrders.reduce((sum, order) => sum + order.total, 0);
  return {
    orderCount: recordedOrders.length,
    activeCount: recordedOrders.filter((order) => ORDER_STATUSES.includes(order.status) && order.status !== "Ready for Pickup").length,
    placedCount: recordedOrders.filter((order) => order.status === "Placed").length,
    preparingCount: recordedOrders.filter((order) => order.status === "Preparing").length,
    readyCount: recordedOrders.filter((order) => order.status === "Ready for Pickup").length,
    recordedOrderTotal: orderTotal,
    averageOrderTotal: recordedOrders.length ? orderTotal / recordedOrders.length : null,
    availableCount: FOOD_ITEMS.length - memory.unavailable.length,
    topItems,
    isLimited: memory.mode === "firebase" && memory.orders.length >= 100
  };
}

function renderAnalytics() {
  const analytics = deriveAnalytics();
  const orderScope = memory.mode === "firebase"
    ? analytics.isLimited ? "latest 100 live orders; history may be incomplete" : "live orders currently loaded"
    : "this browser's local demo orders only";
  const salesMarkup = analytics.topItems.length
    ? `<ol class="analytics-ranking">${analytics.topItems.slice(0, 5).map((item, index) => `
        <li class="analytics-item">
          <span class="analytics-rank">${index + 1}</span>
          <span class="analytics-item-name">${escapeHTML(item.name)}</span>
          <span class="analytics-sales">${item.soldUnits} ${item.soldUnits === 1 ? "unit" : "units"}</span>
        </li>`).join("")}</ol>`
    : '<p class="analytics-no-sales">No menu-item sales recorded yet. Popularity will appear here after real orders.</p>';

  return `
    <section class="admin-section analytics-section" aria-labelledby="analytics-heading">
      <div class="admin-section-header"><h3 id="analytics-heading">Crave2Bite analytics</h3><span>Calculated from recorded orders</span></div>
      <p class="analytics-scope">Source: ${escapeHTML(orderScope)}. Demo data is device-local, not campus-wide.</p>
      <div class="admin-stats analytics-stats">
        <div class="admin-stat"><strong>${analytics.orderCount}</strong><small>Recorded orders</small></div>
        <div class="admin-stat"><strong>${analytics.activeCount}</strong><small>Active queue</small></div>
        <div class="admin-stat"><strong>${analytics.placedCount}</strong><small>Placed</small></div>
        <div class="admin-stat"><strong>${analytics.preparingCount}</strong><small>Preparing</small></div>
        <div class="admin-stat"><strong>${analytics.readyCount}</strong><small>Ready for pickup</small></div>
        <div class="admin-stat"><strong>${formatPrice(analytics.recordedOrderTotal)}</strong><small>Recorded order total</small></div>
        <div class="admin-stat"><strong>${analytics.averageOrderTotal === null ? "—" : formatPrice(analytics.averageOrderTotal)}</strong><small>Average order total</small></div>
        <div class="admin-stat"><strong>${analytics.availableCount} / ${FOOD_ITEMS.length}</strong><small>Menu items available</small></div>
      </div>
      <div class="analytics-popularity-heading"><strong>Most ordered foods</strong><span>Ranked by units in the same recorded orders</span></div>
      ${salesMarkup}
      <p class="analytics-disclaimer">Order totals are recorded order values, not verified payments. These figures describe only the orders listed above.</p>
    </section>`;
}

function appendChatMessage(message, role, recommendations = []) {
  const bubble = document.createElement("article");
  bubble.className = `smartbite-message ${role === "user" ? "user" : "assistant"}`;
  const label = document.createElement("span");
  label.className = "smartbite-message-author";
  label.textContent = role === "user" ? "YOU" : "BITEBOT AI";
  const copy = document.createElement("p");
  copy.className = "smartbite-message-copy";
  copy.textContent = message;
  bubble.append(label, copy);
  if (recommendations.length) {
    const cards = document.createElement("div");
    cards.className = "smartbite-recommendations";
    cards.innerHTML = recommendations.map(({ items, price }) => {
      const multiple = items.length > 1;
      const names = items.map((item) => item.name).join(" + ");
      const itemIds = items.map((item) => item.id);
      const safeIds = itemIds.map(encodeURIComponent).join(",");
      const detail = items.map((item) => escapeHTML(item.category)).join(" + ");
      return `
        <article class="smartbite-food-card">
          <span class="smartbite-food-kicker">${multiple ? "CAMPUS-SIZED COMBO" : escapeHTML(items[0].category.toUpperCase())}</span>
          <strong>${escapeHTML(names)}</strong>
          <span class="smartbite-food-price">${multiple ? "Total" : "Menu price"}: ${formatPrice(price)}</span>
          <span class="smartbite-food-detail">${detail}${multiple ? " · " + items.length + " menu items" : ""}</span>
          <button type="button" class="smartbite-add-button" data-ai-add="${safeIds}">Add ${multiple ? "the combo" : "to order"} <span aria-hidden="true">+</span></button>
        </article>`;
    }).join("");
    bubble.append(cards);
  }
  elements.smartbiteMessages.append(bubble);
  elements.smartbiteMessages.scrollTop = elements.smartbiteMessages.scrollHeight;
}

function getSmartbiteContext(rawPreferences) {
  const text = rawPreferences.trim().toLocaleLowerCase();
  const budgetMatch = text.match(/(?:under|below|budget|max(?:imum)?|within)\s*₹?\s*(\d+)|₹\s*(\d+)/i);
  const inlineBudget = budgetMatch ? Number(budgetMatch[1] || budgetMatch[2]) : null;
  const focusPopular = /\b(popular|popularity|favorite|favourite|best.?sell(?:er|ing)?)\b/i.test(text);
  const ignored = new Set(["food", "foods", "meal", "meals", "item", "items", "menu", "something", "anything", "please", "show", "find", "suggest", "recommend", "recommendation", "recommendations", "want", "like", "good", "cheap", "cheapest", "affordable", "budget", "under", "below", "within", "maximum", "max", "popular", "popularity", "favorite", "favourite", "best", "seller", "selling", "rupees", "rupee", "inr", "and", "the", "for", "with", "have", "some", "give", "make", "can", "get"]);
  const preferences = text.match(/[a-z][a-z0-9-]*/g) || [];
  const keywords = [...new Set(preferences.filter((word) => word.length > 2 && !ignored.has(word)))].slice(0, 8);
  return { inlineBudget, focusPopular, keywords };
}

function findSmartbiteRecommendations({ budget = null, preferences = "" } = {}) {
  const context = getSmartbiteContext(preferences);
  const amount = budget ?? context.inlineBudget;
  const filteredKeywords = context.keywords;
  const availableItems = FOOD_ITEMS.filter((item) =>
    !memory.unavailable.includes(item.id)
    && (!Number.isFinite(amount) || item.price <= amount)
    && filteredKeywords.every((keyword) =>
      `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase().includes(keyword)));
  const popularItems = getPopularItems();
  const popularityRank = new Map(popularItems.map((item, index) => [item.id, index]));
  const salesById = new Map(popularItems.map((item) => [item.id, item.soldUnits]));
  const rankedItems = availableItems.map((item) => ({ ...item, soldUnits: salesById.get(item.id) || 0 })).sort((left, right) =>
    (context.focusPopular ? popularityRank.get(left.id) - popularityRank.get(right.id) : 0)
    || right.soldUnits - left.soldUnits
    || Number(right.popular) - Number(left.popular)
    || left.price - right.price
    || left.name.localeCompare(right.name));
  const combos = [];

  if (Number.isFinite(amount) && amount > 0 && filteredKeywords.length === 0) {
    for (let leftIndex = 0; leftIndex < availableItems.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < availableItems.length; rightIndex += 1) {
        const items = [availableItems[leftIndex], availableItems[rightIndex]];
        const price = items[0].price + items[1].price;
        if (price <= amount) combos.push({ items, price });
      }
    }
    combos.sort((left, right) => {
      const salesDifference = right.items.reduce((sum, item) => sum + item.soldUnits, 0)
        - left.items.reduce((sum, item) => sum + item.soldUnits, 0);
      if (salesDifference) return salesDifference;
      const curatedDifference = Number(right.items.every((item) => item.popular))
        - Number(left.items.every((item) => item.popular));
      return curatedDifference || left.price - right.price;
    });
  }

  return {
    amount,
    keywords: filteredKeywords,
    popularItems: context.focusPopular,
    availableCount: FOOD_ITEMS.length - memory.unavailable.length,
    recordedOrders: memory.orders.length,
    hasRecordedSales: getPopularItems().some((item) => item.soldUnits > 0),
    recommendations: combos.length
      ? [...combos.slice(0, 2), ...rankedItems.slice(0, 1).map((item) => ({ items: [item], price: item.price }))]
      : rankedItems.slice(0, 3).map((item) => ({ items: [item], price: item.price }))
  };
}

function askSmartbite({ budgetValue = "", preferenceValue = "" } = {}) {
  const budgetText = String(budgetValue).trim();
  const budget = budgetText === "" ? null : Number(budgetText);
  if (budgetText && (!Number.isFinite(budget) || budget <= 0 || budget > 100000)) {
    appendChatMessage("Please enter a budget between ₹1 and ₹100,000 so I can compare real menu prices.", "assistant");
    return;
  }
  appendChatMessage([
    budget === null ? "" : `Budget ₹${budget}`,
    preferenceValue.trim()
  ].filter(Boolean).join(" · ") || "What is available right now?", "user");

  const result = findSmartbiteRecommendations({ budget, preferences: preferenceValue });
  if (result.availableCount === 0) {
    appendChatMessage("There are no available menu items at the moment, so I can't recommend or add a meal. Check back when staff updates the menu.", "assistant");
    return;
  }
  if (!result.recommendations.length) {
    if (result.amount !== null && result.amount < Math.min(...FOOD_ITEMS.filter((item) => !memory.unavailable.includes(item.id)).map((item) => item.price))) {
      appendChatMessage(`Nothing currently available costs ₹${result.amount} or less. Please check the listed menu prices or raise your budget.`, "assistant");
      return;
    }
    appendChatMessage("I couldn't find currently available menu descriptions that match every preference you entered. Try a simpler menu word or category. The menu doesn't verify ingredients or allergens, so please ask canteen staff about dietary needs.", "assistant");
    return;
  }

  const opening = result.popularItems && !result.hasRecordedSales
    ? "No recorded item sales are available to rank, so these are the menu's pre-labelled campus picks—not measured sales."
    : result.popularItems
      ? `Sorted using actual item quantities from ${result.recordedOrders} order${result.recordedOrders === 1 ? "" : "s"} recorded here.`
      : "These suggestions use today's available menu and its exact listed prices.";
  const affordability = result.amount === null
    ? "Add a budget if you'd like me to build affordable two-item combinations."
    : `Each suggestion is within your ₹${result.amount} budget.`;
  appendChatMessage(`${opening} ${affordability} Choose a recommendation below to add the listed item or combo to your cart.`, "assistant", result.recommendations);
}

function addSmartbiteItems(encodedIds) {
  if (memory.pendingOrder || memory.paymentSession) {
    appendChatMessage("Your current order is still awaiting server confirmation, so I can't change your basket just yet.", "assistant");
    return;
  }
  let ids;
  try {
    ids = encodedIds.split(",").map((id) => decodeURIComponent(id));
  } catch (error) {
    console.error("Invalid BiteBot recommendation.", error);
    showToast("Couldn't read that recommendation. Please ask BiteBot AI for another one.", true);
    return;
  }
  const items = ids.map((id) => FOOD_ITEMS.find((item) => item.id === id));
  if (!items.length || items.some((item) => !item)) {
    showToast("That recommendation is no longer on this menu. Please ask BiteBot AI again.", true);
    return;
  }
  const additions = new Map();
  for (const item of items) additions.set(item.id, (additions.get(item.id) || 0) + 1);
  for (const [id, quantity] of additions) {
    if (memory.unavailable.includes(id)) {
      appendChatMessage("That item just became unavailable. I haven't changed your cart; please ask for a fresh recommendation.", "assistant");
      return;
    }
    if ((memory.cart[id] || 0) + quantity > 10) {
      appendChatMessage("That addition would exceed the 10-per-item order limit. Your cart is unchanged.", "assistant");
      return;
    }
  }
  try {
    for (const [id, quantity] of additions) memory.cart[id] = (memory.cart[id] || 0) + quantity;
    localStorage.setItem(CART_KEY, JSON.stringify(memory.cart));
    renderCart();
    const label = items.map((item) => item.name).join(" + ");
    appendChatMessage(`Added ${label} to your cart at the menu prices shown above. Open “My order” to review your total.`, "assistant");
    closeSmartbite();
    setOpenPanel("cart");
  } catch (error) {
    console.error("Couldn't add the BiteBot suggestion to the order.", error);
    appendChatMessage("I couldn't save that addition to your cart. Please try again; your existing order was not replaced.", "assistant");
  }
}

function openSmartbite() {
  elements.smartbitePanel.classList.add("open");
  elements.smartbitePanel.setAttribute("aria-hidden", "false");
  elements.smartbiteLauncher.setAttribute("aria-expanded", "true");
  document.querySelector("#smartbite-preferences").focus();
}

function closeSmartbite() {
  elements.smartbitePanel.classList.remove("open");
  elements.smartbitePanel.setAttribute("aria-hidden", "true");
  elements.smartbiteLauncher.setAttribute("aria-expanded", "false");
  elements.smartbiteLauncher.focus();
}

function renderQueue() {
  const count = activeOrders().length;
  elements.queueCount.textContent = String(count);
  elements.queueLabel.textContent = count === 1 ? "order in the kitchen" : "orders in the kitchen";
  elements.waitTime.textContent = `${Math.max(5, count * 4 + 5)} min`;
}

function setOpenPanel(panel) {
  if (!panel && memory.statusTimer !== null) {
    window.clearTimeout(memory.statusTimer);
    memory.statusTimer = null;
  }
  const isCart = panel === "cart";
  memory.visibleDialog = isCart ? null : panel;
  elements.cartPanel.classList.toggle("open", isCart);
  elements.cartPanel.setAttribute("aria-hidden", String(!isCart));
  elements.statusDialog.classList.toggle("open", panel === "status");
  elements.statusDialog.setAttribute("aria-hidden", String(panel !== "status"));
  elements.adminDialog.classList.toggle("open", panel === "admin");
  elements.adminDialog.setAttribute("aria-hidden", String(panel !== "admin"));
  elements.overlay.hidden = !panel;
  document.body.classList.toggle("modal-open", Boolean(panel));
}

function latestOrder() {
  return memory.latestToken
    ? memory.orders.find((order) => order.token === memory.latestToken) ?? null
    : null;
}

function renderOrderStatus() {
  const order = latestOrder();
  elements.notificationDot.hidden = !order || order.status === "Ready for Pickup";
  if (!order) {
    elements.statusContent.innerHTML = `
      <span class="dialog-kicker">A LITTLE PEACE OF MIND</span>
      <h2 class="dialog-heading" id="order-dialog-heading">Nothing to track just yet.</h2>
      <p class="dialog-description">Once you place an order, your personal pickup token and live kitchen updates will show up right here.</p>
      <button type="button" class="checkout-button" id="status-explore-button">Find something lovely <span>↗</span></button>`;
    renderRouteTracking();
    return;
  }
  const currentStep = ORDER_STATUSES.indexOf(order.status);
  const items = order.items.map((item) => `${item.quantity}× ${escapeHTML(item.name)}`).join(" · ");
  const paymentLabel = order.paymentStatus || "Legacy order";
  const paymentMessage = order.paymentMethod === "cash" && paymentLabel === "Pending"
    ? "Pay at the canteen counter. Your order token is ready."
    : paymentLabel === "Successful" ? "Payment confirmed separately from kitchen preparation."
      : `Payment ${paymentLabel.toLowerCase()}. Kitchen preparation does not begin until payment is confirmed.`;
  elements.statusContent.innerHTML = `
    <span class="dialog-kicker">YOUR ORDER IS IN GOOD HANDS</span>
    <h2 class="dialog-heading status-title" id="order-dialog-heading">Your very own token</h2>
    <div class="status-token">${escapeHTML(order.token)}</div>
    <div class="status-caption">KEEP THIS HANDY WHEN YOU COLLECT</div>
    <div class="status-item-summary">${items}</div>
    <div class="payment-status-line"><strong>Payment · ${escapeHTML(paymentLabel)}</strong><br />${escapeHTML(paymentMessage)}</div>
    <div class="status-progress">${ORDER_STATUSES.map((status, index) => `
      <div class="progress-step${index <= currentStep ? " complete" : ""}${index === currentStep ? " active" : ""}"${index === currentStep ? ' aria-current="step"' : ""}>
        <div class="progress-dot"></div>${escapeHTML(status)}
      </div>`).join("")}</div>
    <p class="status-hint">${order.status === "Ready for Pickup"
      ? "It's ready! Come by the counter and show your token."
      : order.status === "Preparing" ? "The kitchen is on it. We'll see you in a bit."
        : "Your order is placed. We'll get cooking shortly."}</p>`;
  renderRouteTracking();
}

function orderTime(createdAt) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(createdAt);
}

function renderAdmin() {
  if (memory.mode === "error") {
    elements.adminView.innerHTML = `
      <span class="dialog-kicker">A LITTLE ADMIN HOUSEKEEPING</span>
      <h2 class="dialog-heading" id="admin-heading">We couldn't reach Firebase.</h2>
      <p class="dialog-description">Check your Firebase project settings, internet connection, and Firebase CDN access, then reload the app.</p>
      <p class="form-feedback">${escapeHTML(memory.backendError || "Firebase initialization failed.")}</p>`;
    return;
  }
  if (memory.mode === "firebase" && !memory.user) {
    elements.adminView.innerHTML = `
      <span class="dialog-kicker">JUST FOR THE GOOD PEOPLE BEHIND THE COUNTER</span>
      <h2 class="dialog-heading" id="admin-heading">Staff sign-in<span class="heading-period">.</span></h2>
      <p class="dialog-description">Sign in using the staff account you created in Firebase Authentication.</p>
      <label class="form-label" for="staff-email">Staff email</label>
      <input class="form-input" id="staff-email" type="email" autocomplete="username" placeholder="you@campus.edu" required />
      <label class="form-label" for="staff-password">Password</label>
      <input class="form-input" id="staff-password" type="password" autocomplete="current-password" placeholder="Your staff password" required />
      <button class="login-button" id="staff-login-button" type="button">Sign in to the dashboard <span>↗</span></button>
      <p class="form-feedback" id="admin-feedback">${escapeHTML(elements.adminView.dataset.error || "")}</p>`;
    return;
  }
  if (memory.mode === "firebase" && memory.user.email !== window.FIREBASE_ADMIN_EMAIL) {
    elements.adminView.innerHTML = `
      <span class="dialog-kicker">A LITTLE ADMIN HOUSEKEEPING</span>
      <h2 class="dialog-heading" id="admin-heading">This account isn't on the list.</h2>
      <p class="dialog-description">Only the designated staff email can manage orders. Sign in with the address configured in your Firebase rules.</p>
      <button class="login-button" id="sign-out-button" type="button">Sign out <span>↗</span></button>`;
    return;
  }

  const count = activeOrders().length;
  const preparing = memory.orders.filter((order) => order.status === "Preparing").length;
  const ready = memory.orders.filter((order) => order.status === "Ready for Pickup").length;
  const sortedOrders = [...memory.orders].sort((a, b) => b.createdAt - a.createdAt);
  elements.adminView.innerHTML = `
    <span class="dialog-kicker">RUNNING A HAPPY LITTLE KITCHEN</span>
    <div class="admin-topline"><h2 id="admin-heading">Behind the counter.</h2>${memory.mode === "demo" ? "" : '<button type="button" class="logout-button" id="sign-out-button">Sign out</button>'}</div>
    ${memory.mode === "demo" ? '<p class="admin-mode-notice"><strong>DEMO DASHBOARD.</strong> Changes are saved only in this browser. Configure Firebase and sign in as an administrator to share live data.</p>' : ""}
    <p class="admin-dashboard-description">A look at what's cooking, right now.</p>
    <div class="admin-stats">
      <div class="admin-stat"><strong>${count}</strong><small>In the kitchen</small></div>
      <div class="admin-stat"><strong>${preparing}</strong><small>Getting made</small></div>
      <div class="admin-stat"><strong>${ready}</strong><small>Ready to collect</small></div>
    </div>
    ${renderAnalytics()}
    <section class="admin-section" aria-label="Live orders">
      <div class="admin-section-header"><h3>The little line-up</h3><span>${memory.orders.length} orders, most recent first</span></div>
      <div class="admin-order-list">${sortedOrders.length ? sortedOrders.map((order) => `
        <article class="admin-order">
          <div class="admin-order-head"><strong class="admin-order-token">${escapeHTML(order.token || "Awaiting payment")}</strong>
            <span class="status-chip ${order.status === "Preparing" ? "preparing" : order.status === "Ready for Pickup" ? "ready" : ""}">${escapeHTML(order.status)}</span></div>
          <p class="admin-order-items">${order.items.map((item) => `${item.quantity}× ${escapeHTML(item.name)}`).join(" · ")}</p>
          <div class="admin-payment-actions">
            <span class="payment-method-label">${escapeHTML(order.paymentMethod === "upi" ? "UPI · Razorpay" : order.paymentMethod === "online" ? "Online · Razorpay" : order.paymentMethod === "cash" ? "Cash at canteen" : "Legacy payment")}</span>
            <span class="payment-status-chip ${(order.paymentStatus || "").toLowerCase()}">${escapeHTML(order.paymentStatus || "Legacy / untracked")}</span>
            ${memory.mode === "firebase" && order.paymentMethod === "cash" && order.paymentStatus === "Pending"
              ? `<button class="admin-mark-paid" type="button" data-mark-paid="${escapeHTML(order.id)}">Confirm cash received</button>`
              : ""}
          </div>
          <div class="admin-order-bottom">
            <select aria-label="Update status for ${escapeHTML(order.token || "unpaid online order")}" data-order-status="${escapeHTML(order.token || "")}"${["online", "upi"].includes(order.paymentMethod) && order.paymentStatus !== "Successful" ? " disabled" : ""}>
              ${ORDER_STATUSES.map((status) => `<option value="${escapeHTML(status)}"${status === order.status ? " selected" : ""}>${escapeHTML(status)}</option>`).join("")}
            </select><span>${orderTime(order.createdAt)} · ${formatPrice(order.total)}</span>
          </div>
        </article>`).join("") : '<p class="admin-empty">The kitchen is quiet for now. Orders will pop up right here.</p>'}</div>
    </section>
    <section class="admin-section" aria-label="Menu availability">
      <div class="admin-section-header"><h3>What's on the menu</h3><span>Tap to toggle availability</span></div>
      <div class="availability-list">${FOOD_ITEMS.map((item) => {
        const available = !memory.unavailable.includes(item.id);
        return `<div class="availability-row"><span class="availability-info"><strong>${escapeHTML(item.name)}</strong><small>${available ? "Available to order" : "Taking a little break"}</small></span><button class="availability-toggle${available ? " active" : ""}" type="button" role="switch" aria-checked="${available}" aria-label="${available ? "Mark unavailable" : "Mark available"}: ${escapeHTML(item.name)}" data-availability="${item.id}"></button></div>`;
      }).join("")}</div>
    </section>`;
}

function updateOrders(orders) {
  memory.orders = orders.map((order) => ({
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    status: ORDER_STATUSES.includes(order.status) ? order.status : ORDER_STATUSES[0]
  }));
  if (memory.paymentSession?.orderId) {
    const paymentOrder = memory.orders.find((order) => order.id === memory.paymentSession.orderId);
    if (paymentOrder) {
      memory.paymentSession.status = paymentOrder.paymentStatus || memory.paymentSession.status;
      localStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(memory.paymentSession));
      if (paymentOrder.paymentStatus === "Successful") {
        completeRemoteOrder(paymentOrder);
        return;
      }
    }
  }
  renderQueue();
  renderOrderStatus();
  renderCart();
  if (memory.visibleDialog === "admin") renderAdmin();
}

async function connectFirestoreListeners() {
  const { collection, doc, onSnapshot, orderBy, query, limit } = memory.firestore;
  const ordersQuery = query(collection(memory.db, "orders"), orderBy("createdAt", "desc"), limit(100));
  memory.cleanup = [
    onSnapshot(ordersQuery, (snapshot) => {
      updateOrders(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    }, (error) => {
      console.error("Could not read the live order queue.", error);
      showToast("Couldn't refresh live orders. Check your Firestore security rules.", true);
    }),
    onSnapshot(doc(memory.db, "settings", "menu"), (snapshot) => {
      const values = snapshot.exists() ? snapshot.data().unavailableIds : [];
      memory.unavailable = Array.isArray(values) ? values.filter((id) => FOOD_ITEMS.some((item) => item.id === id)) : [];
      renderMenu();
      if (memory.visibleDialog === "admin") renderAdmin();
    }, (error) => {
      console.error("Could not read menu availability settings.", error);
      showToast("Couldn't read menu availability. Check your Firestore rules.", true);
    }),
    memory.firebaseAuth.onAuthStateChanged(memory.auth, (user) => {
      memory.user = user;
      if (memory.visibleDialog === "admin") renderAdmin();
    })
  ];
}

function setCartQuantity(id, quantity) {
  if (memory.pendingOrder || memory.paymentSession) {
    showToast("Your order is awaiting the canteen server. Your basket will stay unchanged until it is confirmed.", true);
    return;
  }
  const item = FOOD_ITEMS.find((food) => food.id === id);
  if (!item || (quantity > (memory.cart[id] || 0) && memory.unavailable.includes(id))) {
    showToast("That lovely little thing isn't available right now.", true);
    renderMenu();
    return;
  }
  if (quantity > 10) {
    showToast("Ten of each item per order, please.", true);
    return;
  }
  if (quantity <= 0) delete memory.cart[id];
  else memory.cart[id] = quantity;
  localStorage.setItem(CART_KEY, JSON.stringify(memory.cart));
  renderCart();
}

function makeToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(6);
  const tokens = new Set(memory.orders.map((order) => order.token));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    crypto.getRandomValues(random);
    const suffix = Array.from(random, (byte) => alphabet[byte % alphabet.length]).join("");
    const token = `SC-${suffix}`;
    if (!tokens.has(token)) return token;
  }
  throw new Error("Couldn't generate a unique pickup token. Please place your order again.");
}

async function placeOrder() {
  if (memory.checkoutInProgress) return;
  if (memory.pendingOrder) {
    showToast("Still waiting for the server. Keep this page open; don't place the same order again.", true);
    return;
  }
  if (memory.mode === "error") {
    showToast("Orders are paused because the online service could not connect.", true);
    return;
  }
  const entries = cartEntries();
  if (entries.length === 0) {
    showToast("Your little lineup is empty. Pick something lovely first.", true);
    return;
  }
  if (entries.some(({ item }) => memory.unavailable.includes(item.id))) {
    showToast("Something in your lineup just sold out. Remove it before placing your order.", true);
    return;
  }
  memory.checkoutInProgress = true;
  renderCart();
  try {
    if (memory.paymentSession) {
      await retryPayment();
    } else if (selectedPaymentMethod() === "cash") {
      await createCashOrder();
    } else {
      await createOnlineOrder(selectedPaymentMethod());
    }
  } catch (error) {
    console.error("Couldn't place the canteen order.", error);
    if (!navigator.onLine) elements.networkStatus.hidden = false;
    showToast(error.message || "We couldn't place your order. Please try again.", true);
  } finally {
    memory.checkoutInProgress = false;
    renderCart();
  }
}

function makeCheckoutSession(method) {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const sessionSecret = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const requestRandom = new Uint8Array(16);
  crypto.getRandomValues(requestRandom);
  const requestId = Array.from(requestRandom, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { requestId, sessionSecret, method, status: "Starting" };
}

function savePaymentSession(session) {
  memory.paymentSession = session;
  localStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(session));
  renderMenu();
  renderCart();
}

function clearPaymentSession() {
  memory.paymentSession = null;
  localStorage.removeItem(PAYMENT_SESSION_KEY);
  renderMenu();
}

async function paymentApi(action, body = {}, authorization = "") {
  const response = await fetch(`/api/payments?action=${encodeURIComponent(action)}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {})
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The secure payment service could not complete the request.");
  return result;
}

async function createCashOrder() {
  const entries = cartEntries();
  if (memory.mode !== "firebase") {
    const order = {
      id: `demo-${crypto.randomUUID()}`,
      token: makeToken(),
      items: entries.map(({ item, quantity }) => ({ id: item.id, name: item.name, price: item.price, quantity })),
      total: entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
      status: ORDER_STATUSES[0],
      paymentMethod: "cash",
      paymentStatus: "Pending",
      createdAt: Date.now(),
      itemCount: entries.reduce((sum, entry) => sum + entry.quantity, 0)
    };
    memory.orders.unshift(order);
    saveLocalState();
    updateOrders(memory.orders);
    confirmOrder(order);
    return;
  }
  if (!memory.paymentCapabilities.cashReady) {
    throw new Error(memory.paymentCapabilities.setupMessage || "Counter payments need the secure Firebase server configuration.");
  }
  const session = memory.paymentSession?.method === "cash"
    ? memory.paymentSession
    : makeCheckoutSession("cash");
  savePaymentSession(session);
  const result = await paymentApi("cash", {
    requestId: session.requestId,
    sessionSecret: session.sessionSecret,
    items: entries.map(({ item, quantity }) => ({ id: item.id, quantity }))
  });
  const order = result.order;
  if (!result.confirmed || !order?.token || !["Pending", "Successful"].includes(order.paymentStatus)
    || order.paymentMethod !== "cash") {
    throw new Error("The canteen server did not confirm this cash order. Your basket is still here.");
  }
  order.id = order.id || result.order.id;
  memory.orders = [order, ...memory.orders.filter((entry) => entry.id !== order.id)];
  updateOrders(memory.orders);
  confirmOrder(order);
}

async function createOnlineOrder(method) {
  if (memory.mode !== "firebase") throw new Error("Online and UPI payments need the live, server-backed canteen. Demo mode cannot process payments.");
  if (method === "online" ? !memory.paymentCapabilities.onlineReady : !memory.paymentCapabilities.upiReady) {
    throw new Error(memory.paymentCapabilities.setupMessage || "Razorpay payments are not configured on the canteen server.");
  }
  const session = makeCheckoutSession(method);
  savePaymentSession(session);
  const result = await paymentApi("create", {
    requestId: session.requestId,
    sessionSecret: session.sessionSecret,
    paymentMethod: method,
    items: cartEntries().map(({ item, quantity }) => ({ id: item.id, quantity }))
  });
  session.orderId = result.orderId;
  session.gatewayOrderId = result.razorpayOrderId;
  session.status = "Pending";
  savePaymentSession(session);
  await openRazorpayCheckout(session, result);
}

async function loadRazorpayCheckout() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Secure Razorpay checkout couldn't load. Your order is not confirmed; try again online."));
    document.head.append(script);
  });
}

async function openRazorpayCheckout(session, gatewayOrder) {
  try {
    await loadRazorpayCheckout();
  } catch (error) {
    await reportGatewayStatus(session, "cancelled");
    throw error;
  }
  let finished = false;
  const options = {
    key: gatewayOrder.keyId,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    name: "Crave2Bite",
    description: session.method === "upi" ? "Secure UPI payment" : "Secure canteen order payment",
    order_id: gatewayOrder.razorpayOrderId,
    method: session.method === "upi"
      ? { upi: true, card: false, netbanking: false, wallet: false, paylater: false, emi: false }
      : undefined,
    handler: async (response) => {
      finished = true;
      await verifyGatewayPayment(session, response);
    },
    modal: {
      ondismiss: async () => {
        if (finished) return;
        finished = true;
        await reportGatewayStatus(session, "cancelled");
      }
    },
    theme: { color: "#087a57" }
  };
  try {
    const checkout = new window.Razorpay(options);
    checkout.on("payment.failed", async (event) => {
      finished = true;
      await reportGatewayStatus(session, "failed", event.error?.metadata?.payment_id);
    });
    checkout.open();
  } catch (error) {
    await reportGatewayStatus(session, "cancelled");
    throw error;
  }
}

async function verifyGatewayPayment(session, paymentResponse) {
  const callback = {
    razorpay_order_id: paymentResponse.razorpay_order_id,
    razorpay_payment_id: paymentResponse.razorpay_payment_id,
    razorpay_signature: paymentResponse.razorpay_signature
  };
  session.callback = callback;
  session.status = "Pending";
  savePaymentSession(session);
  try {
    const result = await paymentApi("verify", {
      ...callback,
      orderId: session.orderId,
      sessionSecret: session.sessionSecret
    });
    if (result.status === "Successful" && result.order?.token) {
      completeRemoteOrder(result.order);
      return;
    }
    session.status = result.status;
    savePaymentSession(session);
    if (result.status === "Pending") {
      showToast("Razorpay has not confirmed capture yet. Your payment is pending; the token will appear after server verification.", true);
      void pollPendingPayment();
    } else {
      showToast(`Payment ${String(result.status || "Pending").toLowerCase()}. Your cart is saved. Retry is available when the gateway confirms failure or cancellation.`, true);
    }
  } catch (error) {
    console.error("Server-side payment verification is pending.", error);
    showToast("We couldn't verify payment with the server yet. No paid confirmation or token was issued; keep this page open while we retry verification.", true);
    void pollPendingPayment();
  }
}

async function pollPendingPayment() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const session = memory.paymentSession;
    if (!session?.callback) return;
    await new Promise((resolve) => window.setTimeout(resolve, 3000));
    if (memory.paymentSession !== session) return;
    try {
      const result = await paymentApi("verify", {
        ...session.callback,
        orderId: session.orderId,
        sessionSecret: session.sessionSecret
      });
      if (result.status === "Successful" && result.order?.token) {
        completeRemoteOrder(result.order);
        return;
      }
      session.status = result.status;
      savePaymentSession(session);
      if (result.status === "Failed") return;
    } catch (error) {
      console.error("Payment status refresh failed.", error);
    }
  }
  showToast("Payment is still pending server verification. Your cart and payment reference are saved; do not pay a second time.", true);
}

async function reportGatewayStatus(session, action, paymentId) {
  try {
    const result = await paymentApi(action, {
      orderId: session.orderId,
      sessionSecret: session.sessionSecret,
      razorpayOrderId: session.gatewayOrderId,
      paymentId
    });
    session.status = result.status;
    savePaymentSession(session);
    showToast(result.status === "Failed"
      ? "Razorpay confirmed the payment failed. Your cart is saved; you can retry."
      : result.status === "Cancelled"
        ? "Payment was cancelled. Your cart is saved; you can retry or choose another method."
        : "Razorpay still reports this payment as pending. Do not retry or pay again until the server confirms its final status.", true);
  } catch (error) {
    console.error("Could not confirm the final Razorpay payment state.", error);
    showToast("The payment state is not confirmed yet. Don't submit another payment; check your connection and retry status later.", true);
  }
}

async function retryPayment() {
  const session = memory.paymentSession;
  if (!session) return createOnlineOrder(selectedPaymentMethod());
  if (session.method === "cash") return createCashOrder();
  if (!["Failed", "Cancelled"].includes(session.status)
    && !(!session.orderId && session.status === "Starting")) {
    throw new Error("This payment is still being verified. Wait for the canteen server before retrying.");
  }
  const result = session.orderId
    ? await paymentApi("retry", { orderId: session.orderId, sessionSecret: session.sessionSecret })
    : await paymentApi("create", {
      requestId: session.requestId,
      sessionSecret: session.sessionSecret,
      paymentMethod: session.method,
      items: cartEntries().map(({ item, quantity }) => ({ id: item.id, quantity }))
    });
  session.orderId = result.orderId;
  session.gatewayOrderId = result.razorpayOrderId;
  session.callback = null;
  session.status = "Pending";
  savePaymentSession(session);
  await openRazorpayCheckout(session, result);
}

function completeRemoteOrder(order) {
  if (!order || order.paymentStatus !== "Successful") return;
  const orderId = order.id || memory.paymentSession?.orderId;
  if (orderId) order.id = orderId;
  clearPaymentSession();
  memory.orders = [order, ...memory.orders.filter((entry) => entry.id !== orderId && entry.token !== order.token)];
  updateOrders(memory.orders);
  confirmOrder(order);
}

function confirmOrder(order) {
  if (memory.confirmedTokens.has(order.token)) return;
  memory.confirmedTokens.add(order.token);
  if (memory.pendingOrder?.order.token === order.token) memory.pendingOrder = null;
  memory.latestToken = order.token;
  localStorage.setItem(LATEST_ORDER_KEY, order.token);
  clearPaymentSession();
  memory.cart = {};
  if (memory.mode === "demo") saveLocalState();
  else localStorage.setItem(CART_KEY, JSON.stringify(memory.cart));
  renderCart();
  renderOrderStatus();
  setOpenPanel(null);
  const paymentMessage = order.paymentMethod === "cash" && order.paymentStatus === "Pending"
    ? "Pay at the canteen counter."
    : order.paymentStatus === "Successful" ? "Payment verified by the canteen server."
      : "Payment is pending.";
  showToast(memory.mode === "firebase"
    ? `Order confirmed. ${paymentMessage} Pickup token: ${order.token}.`
    : `Demo order saved in this browser only—no canteen was notified. Payment remains pending; no payment was taken. Demo token: ${order.token}.`);
  goToPage("track");
}

function openStatus() {
  if (memory.statusTimer !== null) {
    window.clearTimeout(memory.statusTimer);
    memory.statusTimer = null;
  }
  renderOrderStatus();
  goToPage("track");
}

function openAdmin() {
  elements.adminView.dataset.error = "";
  renderAdmin();
  setOpenPanel("admin");
}

async function changeOrderStatus(token, status, select) {
  if (!ORDER_STATUSES.includes(status)) return;
  const oldOrder = memory.orders.find((order) => order.token === token);
  if (!oldOrder || oldOrder.status === status) return;
  if (memory.mode === "firebase" && !memory.user) {
    showToast("Sign in before updating a live order.", true);
    renderAdmin();
    return;
  }
  select.disabled = true;
  try {
    if (memory.mode === "firebase") {
      await memory.firestore.updateDoc(memory.firestore.doc(memory.db, "orders", oldOrder.id), { status });
    } else {
      oldOrder.status = status;
      saveLocalState();
      updateOrders(memory.orders);
    }
    showToast(`${token} → ${status}. The queue is up to date.`);
  } catch (error) {
    console.error(`Couldn't update order ${token}.`, error);
    showToast(error.message || "Couldn't update that order. Check the admin account and Firestore rules.", true);
    renderAdmin();
  }
}

async function markCashPaymentPaid(orderId, button) {
  if (memory.mode !== "firebase" || !memory.user || !orderId) {
    showToast("Sign in as the canteen admin before confirming a cash payment.", true);
    return;
  }
  button.disabled = true;
  try {
    const idToken = await memory.firebaseAuth.getIdToken(memory.user);
    const result = await paymentApi("mark-cash-paid", { orderId }, idToken);
    if (result.status !== "Successful") throw new Error("The server did not confirm this counter payment.");
    showToast(result.duplicate ? "This cash payment was already confirmed." : "Cash payment recorded as successful.");
  } catch (error) {
    console.error(`Couldn't confirm cash payment for ${orderId}.`, error);
    showToast(error.message || "The server could not confirm this cash payment.", true);
  } finally {
    renderAdmin();
  }
}

async function setUnavailable(id) {
  if (memory.mode === "firebase" && !memory.user) {
    showToast("Sign in before updating the live menu.", true);
    return;
  }
  const original = [...memory.unavailable];
  const isUnavailable = original.includes(id);
  const name = FOOD_ITEMS.find((food) => food.id === id)?.name ?? "Menu item";
  try {
    if (memory.mode === "firebase") {
      const reference = memory.firestore.doc(memory.db, "settings", "menu");
      await memory.firestore.runTransaction(memory.db, async (transaction) => {
        const existing = await transaction.get(reference);
        const current = existing.exists() ? existing.data().unavailableIds : [];
        const valid = Array.isArray(current) ? current.filter((value) => FOOD_ITEMS.some((food) => food.id === value)) : [];
        const updated = valid.includes(id) ? valid.filter((value) => value !== id) : [...valid, id];
        transaction.set(reference, { unavailableIds: updated });
      });
    } else {
      memory.unavailable = isUnavailable ? original.filter((value) => value !== id) : [...original, id];
      localStorage.setItem("smart-canteen-demo-unavailable", JSON.stringify(memory.unavailable));
      renderMenu();
      showToast(`${name}: ${isUnavailable ? "back on the menu" : "marked unavailable"}.`);
      renderAdmin();
    }
  } catch (error) {
    console.error(`Couldn't change availability for ${id}.`, error);
    showToast(error.message || "Couldn't update availability. Check the admin account and Firestore rules.", true);
    renderAdmin();
  }
}

async function staffSignIn() {
  const email = document.querySelector("#staff-email").value.trim();
  const password = document.querySelector("#staff-password").value;
  if (!email || !password) {
    document.querySelector("#admin-feedback").textContent = "Please enter both your staff email and password.";
    return;
  }
  const button = document.querySelector("#staff-login-button");
  button.disabled = true;
  if (email !== window.FIREBASE_ADMIN_EMAIL) {
    elements.adminView.dataset.error = "That account isn't the designated admin email. Please check the address and try again.";
    renderAdmin();
    document.querySelector("#staff-email").value = email;
    return;
  }
  try {
    await memory.firebaseAuth.signInWithEmailAndPassword(memory.auth, email, password);
    elements.adminView.dataset.error = "";
  } catch (error) {
    console.error("Staff sign-in failed.", error);
    const messages = {
      "auth/invalid-credential": "That email and password didn't match. Please try again.",
      "auth/user-not-found": "No staff account exists with that email. Create one in Firebase Authentication first.",
      "auth/wrong-password": "That password doesn't match the staff account.",
      "auth/too-many-requests": "Too many sign-in attempts. Please wait a bit and try again."
    };
    elements.adminView.dataset.error = messages[error.code] || `Sign-in failed: ${error.message}`;
    renderAdmin();
    document.querySelector("#staff-email").value = email;
  }
}

async function signOutStaff() {
  try {
    await memory.firebaseAuth.signOut(memory.auth);
    memory.user = null;
    renderAdmin();
  } catch (error) {
    console.error("Couldn't sign out of the staff dashboard.", error);
    showToast(error.message || "Sign-out failed. Please try again.", true);
  }
}

function setupQRCode() {
  const url = window.location.href.split("#")[0];
  elements.qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=4&data=${encodeURIComponent(url)}`;
  elements.qr.addEventListener("error", () => {
    const label = elements.qr.nextElementSibling;
    label.className = "qr-error";
    label.innerHTML = "QR unavailable.<br><small>Please try again online.</small>";
  }, { once: true });
}

function handleClick(event) {
  const target = event.target;
  const category = target.closest("[data-category]");
  const addButton = target.closest("[data-add]");
  const quantityButton = target.closest("[data-quantity]");
  const availabilityButton = target.closest("[data-availability]");
  const detailQuantityButton = target.closest("[data-detail-quantity]");
  const detailAddButton = target.closest("[data-detail-add]");
  const foodCard = target.closest("[data-food]");
  if (category) {
    memory.category = category.dataset.category;
    renderCategories();
    renderMenu();
  } else if (detailQuantityButton) {
    const inCart = memory.cart[memory.selectedFoodId] || 0;
    const maxAddable = Math.max(1, 10 - inCart);
    memory.detailQuantity = Math.max(1, Math.min(maxAddable, memory.detailQuantity + Number(detailQuantityButton.dataset.detailQuantity)));
    renderFoodDetails();
  } else if (detailAddButton) {
    const item = FOOD_ITEMS.find((food) => food.id === detailAddButton.dataset.detailAdd);
    if (item) {
      try {
        setCartQuantity(item.id, (memory.cart[item.id] || 0) + memory.detailQuantity);
        showToast(`${memory.detailQuantity} × ${item.name} added to your cart.`);
        renderFoodDetails();
      } catch (error) {
        showToast(error.message || "Couldn't add this item. Please try again.", true);
      }
    }
  } else if (addButton) {
    const id = addButton.dataset.add;
    try {
      setCartQuantity(id, (memory.cart[id] || 0) + 1);
    } catch (error) {
      console.error("Couldn't update the canteen cart.", error);
      showToast("Couldn't update your order. Please try again.", true);
      return;
    }
    addButton.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.24)" }, { transform: "scale(1)" }], { duration: 240 });
    showToast("A little something lovely has joined your order.");
  } else if (quantityButton) {
    setCartQuantity(quantityButton.dataset.id, (memory.cart[quantityButton.dataset.id] || 0) + Number(quantityButton.dataset.quantity));
  } else if (availabilityButton) {
    void setUnavailable(availabilityButton.dataset.availability);
  } else if (target.closest("#cart-button")) {
    goToPage("cart");
  } else if (target.closest("#continue-checkout")) {
    event.preventDefault();
    goToPage("checkout");
  } else if (foodCard) {
    goToPage(`food/${foodCard.dataset.food}`);
  } else if (target.closest("#close-cart") || target === elements.overlay) {
    setOpenPanel(null);
  } else if (target.closest("#checkout-button")) {
    void placeOrder();
  } else if (target.closest("[data-mark-paid]")) {
    void markCashPaymentPaid(target.closest("[data-mark-paid]").dataset.markPaid, target.closest("[data-mark-paid]"));
  } else if (target.closest("#track-order-button")) {
    openStatus();
  } else if (target.closest("#panel-track-order-button")) {
    openStatus();
  } else if (target.closest("#admin-mode-button")) {
    openAdmin();
  } else if (target.closest("[data-close-dialog]")) {
    setOpenPanel(null);
  } else if (target.closest("#clear-search")) {
    elements.search.value = "";
    renderMenu();
    elements.search.focus();
  } else if (target.closest("#explore-menu-button") || target.closest("#status-explore-button")) {
    setOpenPanel(null);
    goToPage("home-menu");
  } else if (target.closest("#staff-login-button")) {
    void staffSignIn();
  } else if (target.closest("#sign-out-button")) {
    void signOutStaff();
  }

}

function handleFoodCardKeydown(event) {
  const card = event.target.closest("[data-food]");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    goToPage(`food/${card.dataset.food}`);
  }
}

function handleChange(event) {
  const paymentMethod = event.target.closest('input[name="payment-method"]');
  if (paymentMethod) {
    if (memory.paymentSession) {
      renderCart();
      showToast("Finish or retry the current payment before choosing another method.", true);
    } else {
      renderCart();
    }
    return;
  }
  const select = event.target.closest("[data-order-status]");
  if (select) void changeOrderStatus(select.dataset.orderStatus, select.value, select);
}

function setupEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("keydown", handleFoodCardKeydown);
  window.addEventListener("hashchange", updatePage);
  elements.search.addEventListener("input", renderMenu);
  document.querySelector("#price-filter").addEventListener("change", renderMenu);
  elements.feedbackForm.addEventListener("submit", (event) => void submitFeedback(event));
  window.addEventListener("resize", setModeBadge);
  window.addEventListener("online", () => {
    updateNetworkStatus();
    if (memory.pendingOrder) {
      showToast("You're back online. We're waiting for the canteen server to confirm your order.");
    }
  });
  window.addEventListener("offline", updateNetworkStatus);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    memory.installPrompt = event;
    updateInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    memory.installPrompt = null;
    updateInstallButton();
    showToast("Crave2Bite is installed and ready for your next break.");
  });
  elements.installButton.addEventListener("click", () => void installApp());
  elements.smartbiteLauncher.addEventListener("click", () => {
    if (elements.smartbitePanel.classList.contains("open")) closeSmartbite();
    else openSmartbite();
  });
  document.querySelector("#smartbite-close").addEventListener("click", closeSmartbite);
  elements.smartbiteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    askSmartbite({
      budgetValue: document.querySelector("#smartbite-budget").value,
      preferenceValue: document.querySelector("#smartbite-preferences").value
    });
  });
  elements.smartbiteMessages.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ai-add], [data-smartbite-quick]");
    if (!button) return;
    if (button.hasAttribute("data-ai-add")) {
      addSmartbiteItems(button.dataset.aiAdd);
      return;
    }
    const quickAction = button.dataset.smartbiteQuick;
    if (quickAction === "popular") {
      const currentBudget = document.querySelector("#smartbite-budget").value;
      document.querySelector("#smartbite-preferences").value = "popular";
      askSmartbite({ budgetValue: currentBudget, preferenceValue: "popular" });
    } else {
      const budget = quickAction === "under-150" ? "150" : "300";
      document.querySelector("#smartbite-budget").value = budget;
      document.querySelector("#smartbite-preferences").value = "";
      askSmartbite({ budgetValue: budget });
    }
  });
  updateNetworkStatus();
  updateInstallButton();
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && document.activeElement?.matches("#staff-email, #staff-password")) {
      event.preventDefault();
      void staffSignIn();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (memory.page !== "home") goToPage("home-menu");
      elements.search.focus();
    } else if (event.key === "Escape") {
      if (elements.smartbitePanel.classList.contains("open")) closeSmartbite();
      else setOpenPanel(null);
    } else if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      if (memory.page !== "home") goToPage("home-menu");
      elements.search.focus();
    }
  });
  window.addEventListener("storage", (event) => {
    if (memory.mode !== "demo") return;
    if (event.key === DEMO_ORDERS_KEY) {
      memory.orders = loadJSON(DEMO_ORDERS_KEY, []);
      renderQueue();
      renderOrderStatus();
      if (memory.visibleDialog === "admin") renderAdmin();
    }
    if (event.key === LATEST_ORDER_KEY && !memory.latestToken) {
      memory.latestToken = event.newValue;
      renderOrderStatus();
    }
  });
}

async function start() {
  setupEvents();
  elements.smartbiteMode.textContent = "RULE-BASED · ON DEVICE";
  appendChatMessage("Hi! I'm BiteBot AI. Tell me your budget, name a food or menu category, or ask what's popular. I'll only suggest available items at their listed prices. I can't verify allergens or dietary restrictions, so please check with canteen staff.", "assistant");
  const welcome = document.createElement("div");
  welcome.className = "smartbite-quick-actions";
  welcome.innerHTML = `
    <button type="button" data-smartbite-quick="popular">What's popular?</button>
    <button type="button" data-smartbite-quick="under-150">Under ₹150</button>
    <button type="button" data-smartbite-quick="meal-300">Combos under ₹300</button>`;
  elements.smartbiteMessages.append(welcome);
  renderCategories();
  renderCart();
  renderMenu();
  memory.unavailable = normalizeUnavailableIds(loadJSON("smart-canteen-demo-unavailable", []));
  renderMenu();
  renderQueue();
  renderOrderStatus();
  updatePage();
  setupQRCode();
  void loadFeedbackConfiguration();
  void registerAppWorker();
  await configureBackend();
  setModeBadge();
  await refreshPaymentCapabilities();
  if (memory.mode === "firebase") await connectFirestoreListeners();
}

void start().catch((error) => {
  memory.mode = "error";
  memory.backendError = error.message;
  setModeBadge();
  console.error("Crave2Bite could not finish starting up.", error);
  showToast("The canteen couldn't finish loading. Please refresh the page and try again.", true);
});
