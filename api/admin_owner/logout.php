<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';

owner_session_start();
unset($_SESSION['owner_admin'], $_SESSION['owner_email']);

json_response(['ok' => true]);

