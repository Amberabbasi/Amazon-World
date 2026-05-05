<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$withdrawId = (int)($body['withdrawId'] ?? 0);
$status = strtolower(trim((string)($body['status'] ?? 'pending')));

if ($withdrawId <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid withdraw id'], 400);
}
if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
  json_response(['ok' => false, 'error' => 'Invalid withdraw status'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('UPDATE withdraw_requests SET status = ? WHERE id = ?');
$stmt->execute([$status, $withdrawId]);

json_response(['ok' => true]);

