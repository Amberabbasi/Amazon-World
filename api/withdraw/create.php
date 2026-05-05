<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$userId = require_auth();
$user = get_user_by_id($userId);
require_active_user($user);

$wallet = get_wallet($userId);
$creditScore = (int)$wallet['credit_score'];
if ($creditScore !== 100) {
  json_response(['ok' => false, 'error' => 'Withdraw blocked. Credit score must be 100'], 403);
}

$body = read_json_body();
$amount = (float)($body['amountUsdt'] ?? 0);
$address = trim((string)($body['address'] ?? ''));
$network = 'USDT-TRC20';

if ($amount <= 0) json_response(['ok' => false, 'error' => 'Invalid amount'], 400);
if ($address === '') json_response(['ok' => false, 'error' => 'Withdrawal address required'], 400);

$balance = (float)$wallet['balance_usdt'];
if ($balance < 100) json_response(['ok' => false, 'error' => 'Withdraw rejected. Balance must be at least 100 USDT'], 400);
if ($amount > $balance) json_response(['ok' => false, 'error' => 'Insufficient balance'], 400);

$pdo = db();
$pdo->beginTransaction();
try {
  $pdo->prepare('INSERT INTO withdraw_requests (user_id, amount_usdt, address, network, status) VALUES (?, ?, ?, ?, ?)')
    ->execute([$userId, $amount, $address, $network, 'pending']);

  $pdo->prepare('UPDATE wallets SET balance_usdt = balance_usdt - ?, updated_at = NOW() WHERE user_id = ?')
    ->execute([$amount, $userId]);

  $pdo->prepare('INSERT INTO transactions (user_id, type, product_id, amount_usdt, my_commission_usdt, platform_commission_usdt, net_balance_impact_usdt) VALUES (?, ?, NULL, ?, 0, 0, ?)')
    ->execute([$userId, 'withdraw', $amount, -$amount]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Withdraw failed'], 500);
}

json_response(['ok' => true, 'wallet' => get_wallet($userId)]);

