<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$userId = (int)($body['userId'] ?? 0);
$name = trim((string)($body['name'] ?? ''));
$email = strtolower(trim((string)($body['email'] ?? '')));
$phone = trim((string)($body['phone'] ?? ''));
$status = strtolower(trim((string)($body['status'] ?? 'active')));
$isAdmin = (int)($body['isAdmin'] ?? 0) === 1 ? 1 : 0;

if ($userId <= 0 || $name === '' || $email === '' || $phone === '') {
  json_response(['ok' => false, 'error' => 'Invalid user payload'], 400);
}
if (!in_array($status, ['active', 'frozen', 'blocked'], true)) {
  json_response(['ok' => false, 'error' => 'Invalid account status'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('
  UPDATE users
  SET name = ?, email = ?, phone = ?, status = ?, is_admin = ?
  WHERE id = ?
');
$stmt->execute([$name, $email, $phone, $status, $isAdmin, $userId]);

json_response(['ok' => true]);

