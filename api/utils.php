<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function json_response(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_SLASHES);
  exit;
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : [];
}

function start_session(): void {
  if (session_status() === PHP_SESSION_NONE) {
    session_start();
  }
}

function auth_user_id(): ?int {
  start_session();
  $id = $_SESSION['user_id'] ?? null;
  return is_int($id) ? $id : (is_numeric($id) ? (int)$id : null);
}

function require_auth(): int {
  $id = auth_user_id();
  if (!$id) json_response(['ok' => false, 'error' => 'Unauthorized'], 401);
  return $id;
}

function require_active_user(array $userRow): void {
  $status = $userRow['status'] ?? 'active';
  if ($status === 'frozen') json_response(['ok' => false, 'error' => 'Account is frozen'], 403);
  if ($status === 'blocked') json_response(['ok' => false, 'error' => 'Account is blocked'], 403);
}

function get_user_by_id(int $userId): array {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, name, email, phone, status, is_admin, created_at FROM users WHERE id = ?');
  $stmt->execute([$userId]);
  $row = $stmt->fetch();
  if (!$row) json_response(['ok' => false, 'error' => 'User not found'], 404);
  return $row;
}

function get_wallet(int $userId): array {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT user_id, balance_usdt, profit_usdt, credit_score, updated_at FROM wallets WHERE user_id = ?');
  $stmt->execute([$userId]);
  $row = $stmt->fetch();
  if (!$row) {
    $pdo->prepare('INSERT INTO wallets (user_id, balance_usdt, profit_usdt, credit_score) VALUES (?, 0, 0, 100)')
      ->execute([$userId]);
    return [
      'user_id' => $userId,
      'balance_usdt' => '0.00',
      'profit_usdt' => '0.00',
      'credit_score' => 100,
      'updated_at' => null
    ];
  }
  return $row;
}

function commission_rate_buy(float $price): float {
  return $price < 300 ? 0.10 : 0.20;
}

function commission_rate_sell(): float {
  return 0.10;
}

function platform_commission_rate(): float {
  return 0.01;
}

