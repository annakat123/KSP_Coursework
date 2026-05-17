<?php

require_once __DIR__ . '/logger.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!file_exists(APP_LOG_FILE)) {
    echo json_encode([], JSON_UNESCAPED_UNICODE);
    exit;
}

$lines = file(APP_LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$lines = array_slice($lines ?: [], -50);

echo json_encode(array_reverse($lines), JSON_UNESCAPED_UNICODE);
