<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$body = read_json_body();
$email = strtolower(trim((string)($body['email'] ?? '')));
$password = (string)($body['password'] ?? '');

if ($email === '' || $password === '') {
  json_response(['ok' => false, 'error' => 'Missing email or password'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || !password_verify($password, (string)$row['password_hash'])) {
  json_response(['ok' => false, 'error' => 'Invalid credentials'], 401);
}

$userId = (int)$row['id'];
start_session();
$_SESSION['user_id'] = $userId;

json_response(['ok' => true, 'user' => get_user_by_id($userId), 'wallet' => get_wallet($userId)]);

