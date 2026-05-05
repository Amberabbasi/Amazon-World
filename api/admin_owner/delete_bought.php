<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$id = (int)($body['id'] ?? 0);
if ($id <= 0) {
  json_response(['ok' => false, 'error' => 'Invalid bought id'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('DELETE FROM bought_products WHERE id = ?');
$stmt->execute([$id]);

json_response(['ok' => true]);

