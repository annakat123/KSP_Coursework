<?php

header('Content-Type: application/json; charset=utf-8');

$partsFile = __DIR__ . '/../data/parts.json';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendJson(['error' => 'Метод не поддерживается'], 405);
}

$query = trim(mb_strtolower($_GET['q'] ?? ''));
$parts = readParts($partsFile);

if ($query === '') {
    sendJson($parts);
}

foreach ($parts as $part) {
    $names = array_merge([$part['name']], $part['aliases'] ?? []);

    foreach ($names as $name) {
        if (mb_strtolower($name) === $query) {
            sendJson([
                'found' => true,
                'part' => $part
            ]);
        }
    }
}

sendJson([
    'found' => false,
    'message' => 'Деталь не найдена в справочнике'
]);

function readParts(string $file): array
{
    if (!file_exists($file)) {
        return [];
    }

    $content = file_get_contents($file);
    $parts = json_decode($content, true);

    return is_array($parts) ? $parts : [];
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
