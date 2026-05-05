<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$userId = (int)($body['userId'] ?? 0);
$balance = (float)($body['balanceUsdt'] ?? 0);
$profit = (float)($body['profitUsdt'] ?? 0);
$creditScore = (int)($body['creditScore'] ?? 100);

if ($userId <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid user id'], 400);
}

if ($creditScore < 0 || $creditScore > 1000) {
  json_response(['ok' => false, 'error' => 'Credit score out of range'], 400);
}

$pdo = db();
$pdo->prepare('
  INSERT INTO wallets (user_id, balance_usdt, profit_usdt, credit_score, updated_at)
  VALUES (?, ?, ?, ?, NOW())
  ON DUPLICATE KEY UPDATE
    balance_usdt = VALUES(balance_usdt),
    profit_usdt = VALUES(profit_usdt),
    credit_score = VALUES(credit_score),
    updated_at = NOW()
')->execute([$userId, $balance, $profit, $creditScore]);

json_response(['ok' => true]);

