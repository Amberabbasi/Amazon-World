<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$userId = (int)($body['userId'] ?? 0);
$newPassword = (string)($body['newPassword'] ?? '');

if ($userId <= 0 || strlen($newPassword) < 6) {
  json_response(['ok' => false, 'error' => 'Invalid password payload (min 6 chars)'], 400);
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$pdo = db();
$stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$stmt->execute([$hash, $userId]);

json_response(['ok' => true]);

