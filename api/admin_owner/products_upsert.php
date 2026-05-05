<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_owner_auth();

$body = read_json_body();
$id = (int)($body['id'] ?? 0);
$name = trim((string)($body['name'] ?? ''));
$description = trim((string)($body['description'] ?? ''));
$price = (float)($body['priceUsdt'] ?? 0);
$imagePath = trim((string)($body['imagePath'] ?? ''));
$commissionMode = strtolower(trim((string)($body['commissionMode'] ?? 'both')));

if ($name === '' || $price <= 0) {
  json_response(['ok' => false, 'error' => 'Product name and positive price required'], 400);
}
if (!in_array($commissionMode, ['buy', 'sell', 'both'], true)) {
  json_response(['ok' => false, 'error' => 'Invalid commission mode'], 400);
}

$pdo = db();
if ($id > 0) {
  $stmt = $pdo->prepare('
    UPDATE products
    SET name = ?, description = ?, price_usdt = ?, image_path = ?, commission_mode = ?
    WHERE id = ?
  ');
  $stmt->execute([$name, $description, $price, $imagePath, $commissionMode, $id]);
  json_response(['ok' => true, 'id' => $id, 'action' => 'updated']);
}

$stmt = $pdo->prepare('
  INSERT INTO products (name, description, price_usdt, image_path, commission_mode)
  VALUES (?, ?, ?, ?, ?)
');
$stmt->execute([$name, $description, $price, $imagePath, $commissionMode]);
$newId = (int)$pdo->lastInsertId();

json_response(['ok' => true, 'id' => $newId, 'action' => 'created']);

