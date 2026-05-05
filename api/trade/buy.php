<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$userId = require_auth();
$user = get_user_by_id($userId);
require_active_user($user);

$body = read_json_body();
$productId = (int)($body['productId'] ?? 0);

if ($productId <= 0) json_response(['ok' => false, 'error' => 'Invalid product'], 400);

$pdo = db();
$stmt = $pdo->prepare('SELECT id, name, price_usdt, commission_mode FROM products WHERE id = ?');
$stmt->execute([$productId]);
$product = $stmt->fetch();
if (!$product) json_response(['ok' => false, 'error' => 'Product not found'], 404);

$wallet = get_wallet($userId);
$balance = (float)$wallet['balance_usdt'];
$price = (float)$product['price_usdt'];
$mode = (string)$product['commission_mode']; // buy|sell|both

$platformFee = $price * platform_commission_rate();
$myRate = commission_rate_buy($price);
$myCommission = ($mode === 'buy' || $mode === 'both') ? ($price * $myRate) : 0.0;

$balanceImpact = -$price - $platformFee + $myCommission;

if ($balance <= 0 || ($balance + $balanceImpact) < 0) {
  json_response(['ok' => false, 'error' => 'Insufficient balance'], 400);
}

$pdo->beginTransaction();
try {
  // Update wallet
  $pdo->prepare('UPDATE wallets SET balance_usdt = balance_usdt + ?, profit_usdt = profit_usdt + ?, updated_at = NOW() WHERE user_id = ?')
    ->execute([$balanceImpact, $myCommission, $userId]);

  // Owned item
  $pdo->prepare('INSERT INTO bought_products (user_id, product_id, buy_price_usdt, commission_mode) VALUES (?, ?, ?, ?)')
    ->execute([$userId, $productId, $price, $mode]);

  // Transaction log
  $pdo->prepare('INSERT INTO transactions (user_id, type, product_id, amount_usdt, my_commission_usdt, platform_commission_usdt, net_balance_impact_usdt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    ->execute([$userId, 'buy', $productId, $price, $myCommission, $platformFee, $balanceImpact]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Buy failed'], 500);
}

json_response([
  'ok' => true,
  'product' => $product,
  'myCommissionRate' => $myRate,
  'myCommission' => round($myCommission, 2),
  'platformCommission' => round($platformFee, 2),
  'balanceImpact' => round($balanceImpact, 2),
  'wallet' => get_wallet($userId)
]);

