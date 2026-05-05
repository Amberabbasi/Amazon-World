<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

// IMPORTANT:
// Change these before production deployment.
const OWNER_PANEL_EMAIL = 'adminowner@amazonworld.site';
const OWNER_PANEL_PASSWORD = 'Owner#2026';

function owner_session_start(): void {
  start_session();
}

function is_owner_authenticated(): bool {
  owner_session_start();
  return isset($_SESSION['owner_admin']) && $_SESSION['owner_admin'] === true;
}

function require_owner_auth(): void {
  if (!is_owner_authenticated()) {
    json_response(['ok' => false, 'error' => 'Owner authentication required'], 401);
  }
}

