<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';

$body = read_json_body();
$email = strtolower(trim((string)($body['email'] ?? '')));
$password = (string)($body['password'] ?? '');

if ($email === '' || $password === '') {
  json_response(['ok' => false, 'error' => 'Email and password are required'], 400);
}

if ($email !== strtolower(OWNER_PANEL_EMAIL) || $password !== OWNER_PANEL_PASSWORD) {
  json_response(['ok' => false, 'error' => 'Invalid owner credentials'], 401);
}

owner_session_start();
$_SESSION['owner_admin'] = true;
$_SESSION['owner_email'] = OWNER_PANEL_EMAIL;

json_response(['ok' => true, 'owner' => OWNER_PANEL_EMAIL]);

