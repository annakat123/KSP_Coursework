<?php

require_once __DIR__ . '/storage.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'error' => 'Метод не поддерживается'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Пока API только отдает список заявок.
echo json_encode(readRequests(), JSON_UNESCAPED_UNICODE);
