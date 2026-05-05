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

// Ensure user owns it
$stmt = $pdo->prepare('SELECT id, commission_mode FROM bought_products WHERE user_id = ? AND product_id = ? ORDER BY id ASC LIMIT 1');
$stmt->execute([$userId, $productId]);
$owned = $stmt->fetch();
if (!$owned) json_response(['ok' => false, 'error' => 'Product not found in bought list'], 400);

$stmt = $pdo->prepare('SELECT id, name, price_usdt, commission_mode FROM products WHERE id = ?');
$stmt->execute([$productId]);
$product = $stmt->fetch();
if (!$product) json_response(['ok' => false, 'error' => 'Product not found'], 404);

$price = (float)$product['price_usdt'];
$mode = (string)$owned['commission_mode']; // buy|sell|both (stored at buy time)

$platformFee = $price * platform_commission_rate();
$sellRate = commission_rate_sell();
$myCommission = ($mode === 'sell' || $mode === 'both') ? ($price * $sellRate) : 0.0;
$balanceImpact = $price - $platformFee + $myCommission;

$pdo->beginTransaction();
try {
  // Remove owned item
  $pdo->prepare('DELETE FROM bought_products WHERE id = ?')->execute([(int)$owned['id']]);

  // Update wallet
  $pdo->prepare('UPDATE wallets SET balance_usdt = balance_usdt + ?, profit_usdt = profit_usdt + ?, updated_at = NOW() WHERE user_id = ?')
    ->execute([$balanceImpact, $myCommission, $userId]);

  // Transaction log
  $pdo->prepare('INSERT INTO transactions (user_id, type, product_id, amount_usdt, my_commission_usdt, platform_commission_usdt, net_balance_impact_usdt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    ->execute([$userId, 'sell', $productId, $price, $myCommission, $platformFee, $balanceImpact]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Sell failed'], 500);
}

json_response([
  'ok' => true,
  'product' => $product,
  'myCommissionRate' => $sellRate,
  'myCommission' => round($myCommission, 2),
  'platformCommission' => round($platformFee, 2),
  'balanceImpact' => round($balanceImpact, 2),
  'wallet' => get_wallet($userId)
]);

