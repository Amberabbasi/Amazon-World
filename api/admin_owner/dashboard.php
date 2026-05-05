<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$pdo = db();

$users = $pdo->query("
  SELECT
    u.id, u.name, u.email, u.phone, u.status, u.is_admin, u.created_at,
    w.balance_usdt, w.profit_usdt, w.credit_score, w.updated_at
  FROM users u
  LEFT JOIN wallets w ON w.user_id = u.id
  ORDER BY u.id DESC
")->fetchAll();

$transactions = $pdo->query("
  SELECT
    t.id, t.user_id, u.email, t.type, t.product_id, t.amount_usdt,
    t.my_commission_usdt, t.platform_commission_usdt, t.net_balance_impact_usdt, t.created_at
  FROM transactions t
  LEFT JOIN users u ON u.id = t.user_id
  ORDER BY t.id DESC
  LIMIT 250
")->fetchAll();

$withdraws = $pdo->query("
  SELECT
    wr.id, wr.user_id, u.email, wr.amount_usdt, wr.address, wr.network, wr.status, wr.created_at
  FROM withdraw_requests wr
  LEFT JOIN users u ON u.id = wr.user_id
  ORDER BY wr.id DESC
  LIMIT 250
")->fetchAll();

$bought = $pdo->query("
  SELECT
    bp.id, bp.user_id, u.email, bp.product_id, p.name AS product_name,
    bp.buy_price_usdt, bp.commission_mode, bp.bought_at
  FROM bought_products bp
  LEFT JOIN users u ON u.id = bp.user_id
  LEFT JOIN products p ON p.id = bp.product_id
  ORDER BY bp.id DESC
  LIMIT 250
")->fetchAll();

$products = $pdo->query("
  SELECT id, name, description, price_usdt, image_path, commission_mode, created_at
  FROM products
  ORDER BY id DESC
  LIMIT 500
")->fetchAll();

json_response([
  'ok' => true,
  'users' => $users,
  'transactions' => $transactions,
  'withdraws' => $withdraws,
  'boughtProducts' => $bought,
  'products' => $products
]);

