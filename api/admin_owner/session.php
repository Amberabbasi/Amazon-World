<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';

owner_session_start();

json_response([
  'ok' => true,
  'authenticated' => is_owner_authenticated(),
  'owner' => $_SESSION['owner_email'] ?? null
]);

