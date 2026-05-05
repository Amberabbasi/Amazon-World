<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$userId = require_auth();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $stmt = $pdo->prepare('SELECT status FROM users WHERE id = ?');
  $stmt->execute([$userId]);
  $row = $stmt->fetch();
  if (!$row) json_response(['ok' => false, 'error' => 'User not found'], 404);
  json_response(['ok' => true, 'status' => $row['status']]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $body = read_json_body();
  $status = strtolower(trim((string)($body['status'] ?? 'active')));
  if (!in_array($status, ['active', 'frozen', 'blocked'], true)) {
    json_response(['ok' => false, 'error' => 'Invalid status'], 400);
  }

  $stmt = $pdo->prepare('UPDATE users SET status = ? WHERE id = ?');
  $stmt->execute([$status, $userId]);
  json_response(['ok' => true, 'status' => $status]);
}

json_response(['ok' => false, 'error' => 'Method not allowed'], 405);

