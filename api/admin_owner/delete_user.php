<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$userId = (int)($body['userId'] ?? 0);

if ($userId <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid user id'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$userId]);

json_response(['ok' => true]);

