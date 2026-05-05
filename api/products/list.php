<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

$pdo = db();
$rows = $pdo->query('SELECT id, name, description, price_usdt, image_path, commission_mode, created_at FROM products ORDER BY id ASC')
  ->fetchAll();

json_response(['ok' => true, 'products' => $rows]);

