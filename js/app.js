const STORAGE = {
  user: "aw_user",
  users: "aw_users",
  cart: "aw_cart",
  records: "aw_records",
  profile: "aw_profile",
  bought: "aw_bought_products"
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUser() {
  return readJson(STORAGE.user, null);
}

function setUser(user) {
  saveJson(STORAGE.user, user);
}

function getUserScopedKey(baseKey) {
  const user = getUser();
  const scope = user?.email ? user.email.toLowerCase() : "guest";
  return `${baseKey}::${scope}`;
}

function readUserScopedJson(baseKey, fallback) {
  const scopedKey = getUserScopedKey(baseKey);
  const scoped = readJson(scopedKey, null);
  if (scoped !== null) return scoped;

  // One-time migration: if old global key exists, copy into scoped key.
  const legacy = readJson(baseKey, null);
  if (legacy !== null) {
    saveJson(scopedKey, legacy);
    return legacy;
  }
  return fallback;
}

function saveUserScopedJson(baseKey, value) {
  saveJson(getUserScopedKey(baseKey), value);
}

function getUserScopedFlagKey(flagName) {
  return getUserScopedKey(`aw_flag_${flagName}`);
}

function getUsers() {
  return readJson(STORAGE.users, []);
}

function setUsers(users) {
  saveJson(STORAGE.users, users);
}

function findUserByEmail(email) {
  const users = getUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((item) => item.email.toLowerCase() === normalized) || null;
}

function getProfile() {
  const saved = readUserScopedJson(STORAGE.profile, null);
  if (!saved || !saved.initialized) {
    const freshProfile = {
      balance: 0,
      profit: 0,
      creditScore: 100,
      email: "",
      password: "",
      initialized: true
    };
    setProfile(freshProfile);
    return freshProfile;
  }
  return {
    balance: Number(saved.balance) || 0,
    profit: Number(saved.profit) || 0,
    creditScore:
      saved.creditScore === undefined || saved.creditScore === null
        ? 100
        : Number(saved.creditScore),
    email: saved.email || "",
    password: saved.password || "",
    accountStatus: saved.accountStatus || "active",
    initialized: true
  };
}

function setProfile(profile) {
  saveUserScopedJson(STORAGE.profile, profile);
}

function normalizeAccountStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "frozen" || normalized === "blocked") return normalized;
  return "active";
}

function getAccountStatus() {
  return normalizeAccountStatus(getProfile().accountStatus || "active");
}

function setAccountStatus(status) {
  const profile = getProfile();
  profile.accountStatus = normalizeAccountStatus(status);
  setProfile(profile);
  renderAccountStatus();
}

function renderAccountStatus() {
  const badge = document.getElementById("accountStatusBadge");
  const select = document.getElementById("accountStatusSelect");
  const status = getAccountStatus();
  if (badge) badge.textContent = status;
  if (select) select.value = status;
}

function enforceActiveStatusForAction(actionLabel) {
  const status = getAccountStatus();
  if (status === "active") return true;
  if (status === "frozen") {
    alert(`Account is frozen. ${actionLabel} is not allowed.`);
    return false;
  }
  alert(`Account is blocked. ${actionLabel} is not allowed.`);
  return false;
}

async function syncAccountStatusFromBackend() {
  try {
    const response = await fetch("api/account/status.php", {
      method: "GET",
      credentials: "include"
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload?.ok && payload.status) {
      setAccountStatus(payload.status);
    }
  } catch (err) {
    // Ignore backend sync errors for local/offline mode.
  }
}

function logout() {
  localStorage.removeItem(STORAGE.user);
  window.location.href = "login.html";
}

function getCart() {
  return readUserScopedJson(STORAGE.cart, []);
}

function setCart(items) {
  saveUserScopedJson(STORAGE.cart, items);
  refreshCartCount();
}

function getRecords() {
  return readUserScopedJson(STORAGE.records, []);
}

function setRecords(records) {
  saveUserScopedJson(STORAGE.records, records);
}

function getBoughtProducts() {
  return readUserScopedJson(STORAGE.bought, []);
}

function setBoughtProducts(products) {
  saveUserScopedJson(STORAGE.bought, products);
}

function toMoney(value) {
  return Number(value).toFixed(2);
}

let pendingBuy = null;
let pendingSell = null;

function getMyCommissionRate(price) {
  const amount = Number(price);
  return amount < 300 ? 0.1 : 0.2;
}

function getSellCommissionRate() {
  return 0.1;
}

function shouldApplyCommission(mode, action) {
  if (mode === "both") return true;
  return mode === action;
}

function getCommissionAmount(price, mode, action) {
  if (!shouldApplyCommission(mode, action)) return 0;
  if (action === "sell") return Number(price) * getSellCommissionRate();
  return Number(price) * getMyCommissionRate(price);
}

function getPlatformCommissionAmount(price) {
  return Number(price) * 0.01;
}

function refreshCartCount() {
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = getCart().length;
}

function renderUser() {
  const user = getUser();
  const nodes = document.querySelectorAll("[data-user-name]");
  nodes.forEach((node) => {
    node.textContent = user?.name || user?.email || "Guest";
  });
}

function requireLogin() {
  const needsAuth = document.body.dataset.auth === "required";
  if (needsAuth && !getUser()) {
    window.location.href = "login.html";
  }
}

function addRecord(type, product, price) {
  const records = getRecords();
  records.unshift({
    type,
    product,
    price,
    date: new Date().toLocaleString()
  });
  setRecords(records);
}

function addSimpleRecord(type, product, price) {
  addRecord(type, product, Number(price));
  renderRecords();
  renderProfileRecords();
  renderBoughtProducts();
}

function addToCart(product, price) {
  const cart = getCart();
  cart.push({ product, price });
  setCart(cart);
  alert(`${product} added to cart.`);
}

function buyNow(product, price, commissionMode = "both") {
  if (!enforceActiveStatusForAction("Buying")) return;
  const itemPrice = Number(price);
  const currentProfile = getProfile();
  if (currentProfile.balance <= 0) {
    alert("Insufficient balance.");
    return;
  }
  const bought = getBoughtProducts();
  bought.unshift({
    product,
    price: itemPrice,
    commissionMode,
    date: new Date().toLocaleString()
  });
  setBoughtProducts(bought);
  const commissionRate = getMyCommissionRate(itemPrice);
  const profitEarned = getCommissionAmount(itemPrice, commissionMode, "buy");
  const platformCommission = getPlatformCommissionAmount(itemPrice);
  const buyBalanceImpact = -itemPrice - platformCommission + profitEarned;
  const profile = getProfile();
  if (profile.balance + buyBalanceImpact < 0) {
    alert("Insufficient balance.");
    return;
  }
  profile.profit += profitEarned;
  profile.balance += buyBalanceImpact;
  setProfile(profile);
  renderProfileStats();
  addSimpleRecord("Bought", product, itemPrice);
  alert(
    `Order confirmed for ${product}. Balance changed by $${toMoney(
      buyBalanceImpact
    )}. Profit added: $${toMoney(profitEarned)} (${Math.round(commissionRate * 100)}%).`
  );
}

function ensureBuyModalExists() {
  if (document.getElementById("buyConfirmModal")) return;
  const modal = document.createElement("div");
  modal.id = "buyConfirmModal";
  modal.className = "modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "buyConfirmTitle");
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-head">
        <h3 id="buyConfirmTitle">Confirm Product Purchase</h3>
      </div>
      <div class="list" style="margin-top: 0.8rem;">
        <div class="list-item"><span>Product</span><strong id="buyProductName">-</strong></div>
        <div class="list-item"><span>Total Order Amount</span><strong id="buyTotalAmount">$0.00</strong></div>
        <div class="list-item"><span id="buyMyCommissionLabel">My Commission (10%)</span><strong id="buyMyCommission">$0.00</strong></div>
        <div class="list-item"><span>Platform Commission (1%)</span><strong id="buyPlatformCommission">$0.00</strong></div>
      </div>
      <div class="actions" style="margin-top: 1rem;">
        <button class="btn primary" id="confirmBuySubmit" type="button">Submit</button>
        <button class="btn" id="confirmBuyCancel" type="button">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function ensureSellModalExists() {
  if (document.getElementById("sellConfirmModal")) return;
  const modal = document.createElement("div");
  modal.id = "sellConfirmModal";
  modal.className = "modal hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "sellConfirmTitle");
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-head">
        <h3 id="sellConfirmTitle">Confirm Product Sale</h3>
      </div>
      <div class="list" style="margin-top: 0.8rem;">
        <div class="list-item"><span>Product</span><strong id="sellProductName">-</strong></div>
        <div class="list-item"><span>Total Order Amount</span><strong id="sellTotalAmount">$0.00</strong></div>
        <div class="list-item"><span id="sellMyCommissionLabel">My Commission (10%)</span><strong id="sellMyCommission">$0.00</strong></div>
        <div class="list-item"><span>Platform Commission (1%)</span><strong id="sellPlatformCommission">$0.00</strong></div>
      </div>
      <div class="actions" style="margin-top: 1rem;">
        <button class="btn primary" id="confirmSellSubmit" type="button">Submit</button>
        <button class="btn" id="confirmSellCancel" type="button">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openBuyModal(product, price, commissionMode = "both") {
  ensureBuyModalExists();
  const total = Number(price);
  const commissionRate = getSellCommissionRate();
  const myCommission = getCommissionAmount(total, commissionMode, "buy");
  const platformCommission = getPlatformCommissionAmount(total);
  pendingBuy = { product, price: total, commissionMode };
  const productNode = document.getElementById("buyProductName");
  const totalNode = document.getElementById("buyTotalAmount");
  const myNode = document.getElementById("buyMyCommission");
  const platformNode = document.getElementById("buyPlatformCommission");
  const myLabelNode = document.getElementById("buyMyCommissionLabel");
  const modal = document.getElementById("buyConfirmModal");
  if (productNode) productNode.textContent = product;
  if (totalNode) totalNode.textContent = `$${toMoney(total)}`;
  if (myLabelNode) {
    myLabelNode.textContent = shouldApplyCommission(commissionMode, "buy")
      ? `My Commission (${Math.round(commissionRate * 100)}%)`
      : "My Commission (No buy commission)";
  }
  if (myNode) myNode.textContent = `$${toMoney(myCommission)}`;
  if (platformNode) platformNode.textContent = `$${toMoney(platformCommission)}`;
  if (modal) modal.classList.remove("hidden");
}

function closeBuyModal() {
  const modal = document.getElementById("buyConfirmModal");
  if (modal) modal.classList.add("hidden");
  pendingBuy = null;
}

function openSellModal(product, price) {
  ensureSellModalExists();
  const total = Number(price);
  const bought = getBoughtProducts();
  const ownedItem = bought.find((item) => item.product === product);
  const commissionMode = ownedItem?.commissionMode || "buy";
  const commissionRate = getMyCommissionRate(total);
  const myCommission = getCommissionAmount(total, commissionMode, "sell");
  const platformCommission = total * 0.01;
  pendingSell = { product, price: total };
  const productNode = document.getElementById("sellProductName");
  const totalNode = document.getElementById("sellTotalAmount");
  const myNode = document.getElementById("sellMyCommission");
  const platformNode = document.getElementById("sellPlatformCommission");
  const myLabelNode = document.getElementById("sellMyCommissionLabel");
  const modal = document.getElementById("sellConfirmModal");
  if (productNode) productNode.textContent = product;
  if (totalNode) totalNode.textContent = `$${toMoney(total)}`;
  if (myLabelNode) {
    myLabelNode.textContent = shouldApplyCommission(commissionMode, "sell")
      ? `My Commission (${Math.round(commissionRate * 100)}%)`
      : "My Commission (No sell commission)";
  }
  if (myNode) myNode.textContent = `$${toMoney(myCommission)}`;
  if (platformNode) platformNode.textContent = `$${toMoney(platformCommission)}`;
  if (modal) modal.classList.remove("hidden");
}

function closeSellModal() {
  const modal = document.getElementById("sellConfirmModal");
  if (modal) modal.classList.add("hidden");
  pendingSell = null;
}

function sellNow(product, price) {
  if (!enforceActiveStatusForAction("Selling")) return;
  const itemPrice = Number(price);
  const bought = getBoughtProducts();
  const index = bought.findIndex((item) => item.product === product);
  if (index === -1) {
    alert(`You can only sell a product that exists in Bought Products.`);
    return;
  }
  const soldItem = bought[index];
  bought.splice(index, 1);
  setBoughtProducts(bought);
  const profile = getProfile();
  const platformCommission = getPlatformCommissionAmount(itemPrice);
  const sellCommission = getCommissionAmount(
    itemPrice,
    soldItem?.commissionMode || "both",
    "sell"
  );
  const sellBalanceImpact = itemPrice - platformCommission + sellCommission;
  profile.profit += sellCommission;
  profile.balance += sellBalanceImpact;
  setProfile(profile);
  renderProfileStats();
  addSimpleRecord("Sold", product, itemPrice);
  alert(
    `${product} removed from Bought Products and marked as sold. Balance changed by $${toMoney(
      sellBalanceImpact
    )}.`
  );
}

function clearCart() {
  setCart([]);
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const totalNode = document.getElementById("cartTotal");
  if (!cartList || !totalNode) return;

  const cart = getCart();
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    total += Number(item.price);
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <span>${item.product} - $${Number(item.price).toFixed(2)}</span>
      <button class="btn small danger" data-remove-index="${index}">Remove</button>
    `;
    cartList.appendChild(row);
  });

  if (cart.length === 0) {
    cartList.innerHTML = `<p class="muted">Your cart is empty.</p>`;
  }
  totalNode.textContent = total.toFixed(2);
  refreshCartCount();
}

function renderRecords() {
  const wrap = document.getElementById("recordList");
  if (!wrap) return;
  const records = getRecords();
  if (records.length === 0) {
    wrap.innerHTML = `<p class="muted">No transaction history yet.</p>`;
    return;
  }
  wrap.innerHTML = records
    .map(
      (item) => `
      <div class="list-item">
        <span><strong>${item.type}</strong>: ${item.product} ($${Number(item.price).toFixed(2)})</span>
        <span class="muted">${item.date}</span>
      </div>
    `
    )
    .join("");
}

function switchProfilePanel(targetId) {
  document.querySelectorAll(".profile-panel").forEach((panel) => {
    panel.classList.remove("active-panel");
  });
  const target = document.getElementById(targetId);
  if (target) target.classList.add("active-panel");
}

function renderProfileStats() {
  const balanceNode = document.getElementById("profileBalance");
  const profitNode = document.getElementById("profileProfit");
  const creditNode = document.getElementById("profileCreditScore");
  if (!balanceNode || !profitNode) return;
  const profile = getProfile();
  balanceNode.textContent = `USD ${toMoney(profile.balance)}`;
  profitNode.textContent = `USD ${toMoney(profile.profit)}`;
  if (creditNode) creditNode.textContent = `${profile.creditScore}`;
}

async function fetchCreditScoreFromBackend() {
  const profile = getProfile();
  return new Promise((resolve) => {
    setTimeout(() => resolve(profile.creditScore), 150);
  });
}

function renderProfileRecords() {
  const wrap = document.getElementById("profileRecordList");
  if (!wrap) return;
  const records = getRecords().slice(0, 5);
  if (records.length === 0) {
    wrap.innerHTML = `<p class="muted">No activity yet.</p>`;
    return;
  }
  wrap.innerHTML = records
    .map(
      (item) => `
      <div class="list-item">
        <strong>${item.type}: ${item.product}</strong>
        <span class="muted">$${toMoney(item.price)} • ${item.date}</span>
      </div>
    `
    )
    .join("");
}

function renderBoughtProducts() {
  const boughtWrap = document.getElementById("boughtList");
  const boughtCount = document.getElementById("boughtCount");
  if (!boughtWrap && !boughtCount) return;

  const bought = getBoughtProducts();

  if (boughtCount) boughtCount.textContent = bought.length;

  if (boughtWrap) {
    boughtWrap.innerHTML = bought.length
      ? bought
          .slice(0, 8)
          .map(
            (item) => `
          <div class="list-item">
            <strong>${item.product}</strong>
            <span class="muted">$${toMoney(item.price)} • ${item.date}</span>
          </div>
        `
          )
          .join("")
      : `<p class="muted">No bought products yet.</p>`;
  }
}

function openWithdrawModal() {
  const modal = document.getElementById("withdrawModal");
  if (modal) modal.classList.remove("hidden");
}

function closeWithdrawModal() {
  const modal = document.getElementById("withdrawModal");
  if (modal) modal.classList.add("hidden");
}

function toggleWithdrawMethodFields() {
  // Withdraw is crypto-only (USDT-TRC20). No method toggling needed.
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  if (btn.dataset.addCart) {
    addToCart(btn.dataset.product, btn.dataset.price);
    renderCart();
  }
  if (btn.dataset.buy) {
    if (!enforceActiveStatusForAction("Buying")) return;
    openBuyModal(btn.dataset.product, btn.dataset.price, btn.dataset.commission || "both");
  }
  if (btn.dataset.sell) {
    if (!enforceActiveStatusForAction("Selling")) return;
    openSellModal(btn.dataset.product, btn.dataset.price);
  }
  if (btn.dataset.removeIndex) {
    const cart = getCart();
    cart.splice(Number(btn.dataset.removeIndex), 1);
    setCart(cart);
    renderCart();
  }
  if (btn.id === "clearCartBtn") {
    clearCart();
  }
  if (btn.id === "logoutBtn" || btn.dataset.logout) {
    logout();
  }
  if (btn.dataset.panelTarget) {
    switchProfilePanel(btn.dataset.panelTarget);
  }
  if (btn.dataset.depositStatic) {
    switchProfilePanel("depositPanel");
    alert("Deposit button is visible only and not active right now.");
  }
  if (btn.dataset.withdrawPopup) {
    switchProfilePanel("withdrawPanel");
    openWithdrawModal();
  }
  if (btn.id === "closeWithdrawModal") {
    closeWithdrawModal();
  }
  if (btn.id === "confirmBuyCancel") {
    closeBuyModal();
  }
  if (btn.id === "confirmBuySubmit") {
    if (!pendingBuy) return;
    const profile = getProfile();
    if (profile.balance <= 0) {
      alert("Insufficient balance.");
      return;
    }
    buyNow(pendingBuy.product, pendingBuy.price, pendingBuy.commissionMode || "both");
    closeBuyModal();
  }
  if (btn.id === "confirmSellCancel") {
    closeSellModal();
  }
  if (btn.id === "confirmSellSubmit") {
    if (!pendingSell) return;
    sellNow(pendingSell.product, pendingSell.price);
    closeSellModal();
  }
  if (btn.dataset.supportMsg) {
    const response = document.getElementById("supportResponse");
    if (response) {
      response.style.display = "block";
      response.textContent = `Support received: "${btn.dataset.supportMsg}"`;
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  renderUser();
  refreshCartCount();
  renderCart();
  renderRecords();
  renderProfileStats();
  renderProfileRecords();
  renderBoughtProducts();
  renderAccountStatus();
  syncAccountStatusFromBackend();

  // One-time per-user reset to zero (balance & profit)
  if (document.getElementById("profileBalance") && document.getElementById("profileProfit")) {
    const flagKey = getUserScopedFlagKey("wallet_zeroed");
    if (!localStorage.getItem(flagKey)) {
      const profile = getProfile();
      profile.balance = 0;
      profile.profit = 0;
      setProfile(profile);
      localStorage.setItem(flagKey, "1");
      renderProfileStats();
    }
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail")?.value.trim();
      const password = document.getElementById("loginPassword")?.value;
      if (!email || !password) return;
      const user = findUserByEmail(email);
      if (!user || user.password !== password) {
        alert("Invalid email or password.");
        return;
      }
      setUser(user);
      window.location.href = "home.html";
    });
  }

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName")?.value.trim();
      const email = document.getElementById("signupEmail")?.value.trim();
      const countryCode = document.getElementById("signupCountryCode")?.value;
      const localNumber = document.getElementById("signupNumberLocal")?.value.trim();
      const password = document.getElementById("signupPassword")?.value;
      const confirmPassword = document.getElementById("signupConfirmPassword")?.value;
      if (!name || !email || !countryCode || !localNumber || !password || !confirmPassword) {
        alert("Please fill all signup fields.");
        return;
      }
      if (password !== confirmPassword) {
        alert("Password and confirm password do not match.");
        return;
      }
      const number = `${countryCode} ${localNumber}`;
      if (findUserByEmail(email)) {
        alert("Email already registered. Please login.");
        return;
      }
      const users = getUsers();
      const newUser = {
        name,
        email: email.toLowerCase(),
        number,
        password
      };
      users.push(newUser);
      setUsers(users);
      setUser(newUser);
      // Fresh user state: everything starts from zero/empty
      setProfile({
        balance: 0,
        profit: 0,
        creditScore: 100,
        email: newUser.email,
        password: newUser.password,
        initialized: true
      });
      setBoughtProducts([]);
      setCart([]);
      setRecords([]);
      alert("Signup successful. Welcome to AmazonWorld!");
      window.location.href = "home.html";
    });
  }

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    const user = getUser();
    const profile = getProfile();
    const displayNameInput = document.getElementById("displayNameInput");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    if (displayNameInput) displayNameInput.value = user?.name || "";
    if (emailInput) emailInput.value = user?.email || profile.email || "";
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newName = displayNameInput?.value.trim();
      const newEmail = emailInput?.value.trim();
      const newPassword = passwordInput?.value.trim();
      const oldEmail = user?.email || "";
      const currentUser = getUser();
      if (currentUser && newName) {
        currentUser.name = newName;
      }
      if (currentUser && newEmail) {
        currentUser.email = newEmail.toLowerCase();
      }
      if (currentUser && newPassword) {
        currentUser.password = newPassword;
      }
      if (currentUser) {
        setUser(currentUser);
        const users = getUsers();
        const index = users.findIndex(
          (item) => item.email === oldEmail || item.email === currentUser.email
        );
        if (index !== -1) {
          users[index] = currentUser;
          setUsers(users);
        }
      }
      const latestProfile = getProfile();
      latestProfile.email = newEmail || latestProfile.email;
      if (newPassword) latestProfile.password = newPassword;
      setProfile(latestProfile);
      renderUser();
      renderAccountStatus();
      alert("Profile and security settings updated.");
    });
  }

  const withdrawPopupForm = document.getElementById("withdrawPopupForm");
  if (withdrawPopupForm) {
    withdrawPopupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById("withdrawPopupAmount")?.value);
      const cryptoAddress = document.getElementById("cryptoAddress")?.value.trim();
      const profile = getProfile();
      if (!enforceActiveStatusForAction("Withdraw")) return;

      if (!amount || amount <= 0) {
        alert("Please enter a valid amount in USDT.");
        return;
      }
      if (!cryptoAddress) {
        alert("Please enter withdrawal address for USDT (TRC20).");
        return;
      }
      if (amount > profile.balance) {
        alert("Insufficient balance.");
        return;
      }
      if (profile.balance < 100) {
        alert("Withdraw rejected. Total balance must be at least 100 USDT.");
        return;
      }
      const backendCreditScore = await fetchCreditScoreFromBackend();
      if (backendCreditScore !== 100) {
        alert(
          `Withdraw blocked. Credit score must be exactly 100 (current: ${backendCreditScore}).`
        );
        return;
      }

      profile.balance -= amount;
      setProfile(profile);
      const methodLabel = `Crypto (USDT-TRC20)`;
      addSimpleRecord("Withdraw", methodLabel, amount);
      renderProfileStats();
      withdrawPopupForm.reset();
      closeWithdrawModal();
      alert(`Withdraw successful via ${methodLabel}: ${toMoney(amount)} USDT`);
    });
  }

  ensureBuyModalExists();
  ensureSellModalExists();
});
