<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$id = (int)($body['id'] ?? 0);
$buyPrice = (float)($body['buyPriceUsdt'] ?? 0);
$commissionMode = strtolower(trim((string)($body['commissionMode'] ?? 'both')));

if ($id <= 0 || $buyPrice <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid bought product payload'], 400);
}
if (!in_array($commissionMode, ['buy', 'sell', 'both'], true)) {
  json_response(['ok' => false, 'error' => 'Invalid commission mode'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('
  UPDATE bought_products
  SET buy_price_usdt = ?, commission_mode = ?
  WHERE id = ?
');
$stmt->execute([$buyPrice, $commissionMode, $id]);

json_response(['ok' => true]);

