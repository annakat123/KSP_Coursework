<?php

require_once __DIR__ . '/logger.php';

header('Content-Type: application/json; charset=utf-8');

$partsFile = __DIR__ . '/../data/parts.json';
$partRequestsFile = __DIR__ . '/../data/part_requests.json';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['name'] ?? '');

    if ($name === '') {
        sendJson(['error' => 'Название детали не заполнено'], 422);
    }

    $requests = readParts($partRequestsFile);
    $ids = array_column($requests, 'id');
    $nextId = $ids ? max($ids) + 1 : 1;

    $newRequest = [
        'id' => $nextId,
        'name' => $name,
        'date' => date('d.m.Y'),
        'status' => 'Новая'
    ];

    $requests[] = $newRequest;

    if (!saveJson($partRequestsFile, $requests)) {
        sendJson(['error' => 'Не удалось сохранить деталь'], 500);
    }

    writeLog('Предложена новая деталь', $name);
    sendJson($newRequest, 201);
}

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
        if (isPartNameMatched($name, $query)) {
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

function saveJson(string $file, array $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        return false;
    }

    return file_put_contents($file, $json) !== false;
}

function isPartNameMatched(string $name, string $query): bool
{
    $name = mb_strtolower($name);
    $query = mb_strtolower($query);

    if ($name === $query || str_contains($name, $query) || str_contains($query, $name)) {
        return true;
    }

    $words = explode(' ', $query);

    foreach ($words as $word) {
        if ($word !== '' && !str_contains($name, $word)) {
            return false;
        }
    }

    return true;
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
