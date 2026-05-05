<?php
declare(strict_types=1);

// Hostinger shared hosting friendly config:
// Put this file in: public_html/api/config.php
//
// Update these values from Hostinger hPanel -> MySQL Databases
const DB_HOST = 'localhost';
const DB_NAME = 'amazonworld';
const DB_USER = 'amazonworld_user';
const DB_PASS = 'CHANGE_ME';
const DB_CHARSET = 'utf8mb4';

function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
  $pdo = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  return $pdo;
}

