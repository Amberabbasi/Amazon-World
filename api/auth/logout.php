<?php
declare(strict_types=1);

require_once __DIR__ . '/../utils.php';

start_session();
$_SESSION = [];
session_destroy();

json_response(['ok' => true]);

