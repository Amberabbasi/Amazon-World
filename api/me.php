<?php
declare(strict_types=1);

require_once __DIR__ . '/utils.php';

$userId = require_auth();
$user = get_user_by_id($userId);
$wallet = get_wallet($userId);

$pdo = db();
$stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM bought_products WHERE user_id = ?');
$stmt->execute([$userId]);
$boughtCount = (int)($stmt->fetch()['c'] ?? 0);

json_response([
  'ok' => true,
  'user' => $user,
  'wallet' => $wallet,
  'boughtCount' => $boughtCount
]);

