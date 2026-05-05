<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$body = read_json_body();
$name = trim((string)($body['name'] ?? ''));
$email = strtolower(trim((string)($body['email'] ?? '')));
$phone = trim((string)($body['phone'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($name === '' || $email === '' || $phone === '' || $password === '') {
  json_response(['ok' => false, 'error' => 'Missing required fields'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  json_response(['ok' => false, 'error' => 'Invalid email'], 400);
}

$pdo = db();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
  json_response(['ok' => false, 'error' => 'Email already registered'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$pdo->beginTransaction();
try {
  $pdo->prepare('INSERT INTO users (name, email, phone, password_hash, status, is_admin) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$name, $email, $phone, $hash, 'active', 0]);
  $userId = (int)$pdo->lastInsertId();

  // Fresh wallet state for new user
  $pdo->prepare('INSERT INTO wallets (user_id, balance_usdt, profit_usdt, credit_score) VALUES (?, 0, 0, 100)')
    ->execute([$userId]);

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Signup failed'], 500);
}

start_session();
$_SESSION['user_id'] = $userId;

json_response(['ok' => true, 'user' => get_user_by_id($userId), 'wallet' => get_wallet($userId)]);

