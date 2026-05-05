<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$userId = (int)($body['userId'] ?? 0);
$amount = (float)($body['amountUsdt'] ?? 0);
$note = trim((string)($body['note'] ?? 'Manual adjustment'));

if ($userId <= 0 || $amount == 0.0) {
  json_response(['ok' => false, 'error' => 'Invalid adjustment payload'], 400);
}

$pdo = db();
$pdo->beginTransaction();
try {
  $pdo->prepare('UPDATE wallets SET balance_usdt = balance_usdt + ?, updated_at = NOW() WHERE user_id = ?')
    ->execute([$amount, $userId]);

  $pdo->prepare('INSERT INTO transactions (user_id, type, product_id, amount_usdt, my_commission_usdt, platform_commission_usdt, net_balance_impact_usdt) VALUES (?, ?, NULL, ?, 0, 0, ?)')
    ->execute([$userId, 'adjustment', $amount, $amount]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Adjustment failed'], 500);
}

json_response(['ok' => true, 'note' => $note]);

