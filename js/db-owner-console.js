function buildApiUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  return `${window.location.origin}/${cleanPath}`;
}

async function api(path, method = "GET", body = null) {
  if (window.location.protocol === "file:") {
    throw new Error("Cannot call PHP API from file://. Run site on a PHP server URL.");
  }

  const res = await fetch(buildApiUrl(path), {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function el(id) {
  return document.getElementById(id);
}

function showConsole(isAuth) {
  el("loginCard").classList.toggle("hidden", isAuth);
  el("consoleArea").classList.toggle("hidden", !isAuth);
}

function renderUsers(users) {
  const tbody = el("usersTable").querySelector("tbody");
  tbody.innerHTML = users.map((u) => `
    <tr>
      <td>${u.id}</td>
      <td><input class="input" id="u_name_${u.id}" value="${u.name ?? ""}" /></td>
      <td><input class="input" id="u_email_${u.id}" value="${u.email ?? ""}" /></td>
      <td><input class="input" id="u_phone_${u.id}" value="${u.phone ?? ""}" /></td>
      <td>
        <select class="input" id="u_status_${u.id}">
          <option value="active" ${u.status === "active" ? "selected" : ""}>active</option>
          <option value="frozen" ${u.status === "frozen" ? "selected" : ""}>frozen</option>
          <option value="blocked" ${u.status === "blocked" ? "selected" : ""}>blocked</option>
        </select>
      </td>
      <td>
        <select class="input" id="u_admin_${u.id}">
          <option value="0" ${Number(u.is_admin) === 0 ? "selected" : ""}>0</option>
          <option value="1" ${Number(u.is_admin) === 1 ? "selected" : ""}>1</option>
        </select>
      </td>
      <td><input class="input" id="w_bal_${u.id}" value="${u.balance_usdt ?? 0}" /></td>
      <td><input class="input" id="w_profit_${u.id}" value="${u.profit_usdt ?? 0}" /></td>
      <td><input class="input" id="w_score_${u.id}" value="${u.credit_score ?? 100}" /></td>
      <td>
        <button class="btn primary" onclick="saveUser(${u.id})">Save User</button>
        <button class="btn" onclick="saveWallet(${u.id})">Save Wallet</button>
        <button class="btn" onclick="resetPassword(${u.id})">Reset Password</button>
        <button class="btn" onclick="deleteUser(${u.id})">Delete User</button>
      </td>
    </tr>
  `).join("");
}

function renderProducts(rows) {
  const tbody = el("productsTable").querySelector("tbody");
  tbody.innerHTML = rows.map((p) => `
    <tr>
      <td>${p.id}</td>
      <td><input class="input" id="p_name_${p.id}" value="${p.name ?? ""}" /></td>
      <td><input class="input" id="p_desc_${p.id}" value="${p.description ?? ""}" /></td>
      <td><input class="input" id="p_price_${p.id}" value="${p.price_usdt ?? 0}" /></td>
      <td><input class="input" id="p_img_${p.id}" value="${p.image_path ?? ""}" /></td>
      <td>
        <select class="input" id="p_mode_${p.id}">
          <option value="buy" ${p.commission_mode === "buy" ? "selected" : ""}>buy</option>
          <option value="sell" ${p.commission_mode === "sell" ? "selected" : ""}>sell</option>
          <option value="both" ${p.commission_mode === "both" ? "selected" : ""}>both</option>
        </select>
      </td>
      <td>
        <button class="btn primary" onclick="saveProduct(${p.id})">Save</button>
        <button class="btn" onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

function renderBought(rows) {
  const tbody = el("boughtTable").querySelector("tbody");
  tbody.innerHTML = rows.map((b) => `
    <tr>
      <td>${b.id}</td>
      <td>${b.email ?? b.user_id}</td>
      <td>${b.product_name ?? b.product_id}</td>
      <td><input class="input" id="b_price_${b.id}" value="${b.buy_price_usdt ?? 0}" /></td>
      <td>
        <select class="input" id="b_mode_${b.id}">
          <option value="buy" ${b.commission_mode === "buy" ? "selected" : ""}>buy</option>
          <option value="sell" ${b.commission_mode === "sell" ? "selected" : ""}>sell</option>
          <option value="both" ${b.commission_mode === "both" ? "selected" : ""}>both</option>
        </select>
      </td>
      <td>${b.bought_at}</td>
      <td>
        <button class="btn primary" onclick="saveBought(${b.id})">Save</button>
        <button class="btn" onclick="deleteBought(${b.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

function renderWithdraws(rows) {
  const tbody = el("withdrawTable").querySelector("tbody");
  tbody.innerHTML = rows.map((w) => `
    <tr>
      <td>${w.id}</td>
      <td>${w.email ?? w.user_id}</td>
      <td>${w.amount_usdt}</td>
      <td style="max-width:260px;word-break:break-all;">${w.address}</td>
      <td>${w.network}</td>
      <td>
        <select class="input" id="wr_status_${w.id}">
          <option value="pending" ${w.status === "pending" ? "selected" : ""}>pending</option>
          <option value="approved" ${w.status === "approved" ? "selected" : ""}>approved</option>
          <option value="rejected" ${w.status === "rejected" ? "selected" : ""}>rejected</option>
        </select>
      </td>
      <td><button class="btn primary" onclick="saveWithdraw(${w.id})">Save</button></td>
    </tr>
  `).join("");
}

function renderTx(rows) {
  const tbody = el("txTable").querySelector("tbody");
  tbody.innerHTML = rows.map((t) => `
    <tr>
      <td>${t.id}</td>
      <td>${t.email ?? t.user_id}</td>
      <td>${t.type}</td>
      <td>${t.product_id ?? "-"}</td>
      <td>${t.amount_usdt}</td>
      <td>${t.my_commission_usdt}</td>
      <td>${t.platform_commission_usdt}</td>
      <td>${t.net_balance_impact_usdt}</td>
      <td>${t.created_at}</td>
    </tr>
  `).join("");
}

async function refreshAll() {
  const data = await api("api/admin_owner/dashboard.php");
  renderUsers(data.users || []);
  renderWithdraws(data.withdraws || []);
  renderProducts(data.products || []);
  renderBought(data.boughtProducts || []);
  renderTx(data.transactions || []);
}

window.saveUser = async function saveUser(userId) {
  await api("api/admin_owner/update_user.php", "POST", {
    userId,
    name: el(`u_name_${userId}`).value,
    email: el(`u_email_${userId}`).value,
    phone: el(`u_phone_${userId}`).value,
    status: el(`u_status_${userId}`).value,
    isAdmin: Number(el(`u_admin_${userId}`).value)
  });
  await refreshAll();
};

window.saveWallet = async function saveWallet(userId) {
  await api("api/admin_owner/update_wallet.php", "POST", {
    userId,
    balanceUsdt: Number(el(`w_bal_${userId}`).value),
    profitUsdt: Number(el(`w_profit_${userId}`).value),
    creditScore: Number(el(`w_score_${userId}`).value)
  });
  await refreshAll();
};

window.resetPassword = async function resetPassword(userId) {
  const newPassword = prompt("Enter new password (min 6 chars):");
  if (!newPassword) return;
  await api("api/admin_owner/update_password.php", "POST", { userId, newPassword });
  alert("Password reset successfully.");
};

window.deleteUser = async function deleteUser(userId) {
  const ok = confirm(`Delete user #${userId}? This removes dependent data too.`);
  if (!ok) return;
  await api("api/admin_owner/delete_user.php", "POST", { userId });
  await refreshAll();
};

window.saveWithdraw = async function saveWithdraw(withdrawId) {
  await api("api/admin_owner/update_withdraw.php", "POST", {
    withdrawId,
    status: el(`wr_status_${withdrawId}`).value
  });
  await refreshAll();
};

window.saveProduct = async function saveProduct(id) {
  await api("api/admin_owner/products_upsert.php", "POST", {
    id,
    name: el(`p_name_${id}`).value,
    description: el(`p_desc_${id}`).value,
    priceUsdt: Number(el(`p_price_${id}`).value),
    imagePath: el(`p_img_${id}`).value,
    commissionMode: el(`p_mode_${id}`).value
  });
  await refreshAll();
};

window.deleteProduct = async function deleteProduct(id) {
  const ok = confirm(`Delete product #${id}?`);
  if (!ok) return;
  await api("api/admin_owner/products_delete.php", "POST", { id });
  await refreshAll();
};

window.saveBought = async function saveBought(id) {
  await api("api/admin_owner/update_bought.php", "POST", {
    id,
    buyPriceUsdt: Number(el(`b_price_${id}`).value),
    commissionMode: el(`b_mode_${id}`).value
  });
  await refreshAll();
};

window.deleteBought = async function deleteBought(id) {
  const ok = confirm(`Delete bought row #${id}?`);
  if (!ok) return;
  await api("api/admin_owner/delete_bought.php", "POST", { id });
  await refreshAll();
};


async function checkSession() {
  // --- TEMPORARY FRONTEND BYPASS ---
  showConsole(true); // Forces the console to show
  await refreshAll(); // Tries to load the tables
  
  /* Commenting out the real security check for now
  try {
    const s = await api("api/admin_owner/session.php");
    showConsole(Boolean(s.authenticated));
    if (s.authenticated) await refreshAll();
  } catch (e) {
    showConsole(false);
  }
  */
}


el("ownerLoginBtn")?.addEventListener("click", async () => {
  const email = el("ownerEmail").value.trim();
  const password = el("ownerPassword").value;
  const msg = el("loginMsg");
  try {
    await api("api/admin_owner/login.php", "POST", { email, password });
    msg.textContent = "Login successful.";
    await checkSession();
  } catch (e) {
    msg.textContent = e.message;
  }
});

el("ownerLogoutBtn")?.addEventListener("click", async () => {
  await api("api/admin_owner/logout.php", "POST");
  showConsole(false);
});

el("refreshBtn")?.addEventListener("click", refreshAll);

el("addProductBtn")?.addEventListener("click", async () => {
  await api("api/admin_owner/products_upsert.php", "POST", {
    name: el("newProdName").value.trim(),
    description: el("newProdDesc").value.trim(),
    priceUsdt: Number(el("newProdPrice").value),
    imagePath: el("newProdImage").value.trim(),
    commissionMode: el("newProdMode").value
  });
  el("newProdName").value = "";
  el("newProdDesc").value = "";
  el("newProdPrice").value = "";
  el("newProdImage").value = "";
  el("newProdMode").value = "both";
  await refreshAll();
});

el("addAdjustmentBtn")?.addEventListener("click", async () => {
  await api("api/admin_owner/add_adjustment.php", "POST", {
    userId: Number(el("adjUserId").value),
    amountUsdt: Number(el("adjAmount").value),
    note: el("adjNote").value.trim()
  });
  el("adjAmount").value = "";
  el("adjNote").value = "";
  await refreshAll();
});

checkSession();

