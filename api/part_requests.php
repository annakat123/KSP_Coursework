<?php

header('Content-Type: application/json; charset=utf-8');

$file = __DIR__ . '/../data/part_requests.json';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!file_exists($file)) {
    echo json_encode([], JSON_UNESCAPED_UNICODE);
    exit;
}

$content = file_get_contents($file);
$requests = json_decode($content, true);

echo json_encode(is_array($requests) ? $requests : [], JSON_UNESCAPED_UNICODE);
