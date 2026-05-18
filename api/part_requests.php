<?php

require_once __DIR__ . '/logger.php';

header('Content-Type: application/json; charset=utf-8');

$partRequestsFile = __DIR__ . '/../data/part_requests.json';
$partsFile = __DIR__ . '/../data/parts.json';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    sendJson(readJson($partRequestsFile));
}

if ($method === 'PATCH') {
    requireAdmin();

    $data = json_decode(file_get_contents('php://input'), true);
    $requestId = (int)($data['id'] ?? 0);

    if ($requestId <= 0) {
        sendJson(['error' => 'Неверный номер заявки'], 422);
    }

    $requests = readJson($partRequestsFile);
    $parts = readJson($partsFile);

    foreach ($requests as &$request) {
        if ((int)$request['id'] !== $requestId) {
            continue;
        }

        $ids = array_column($parts, 'id');
        $nextId = $ids ? max($ids) + 1 : 1;
        $newPart = [
            'id' => $nextId,
            'name' => $request['name'],
            'aliases' => [mb_strtolower($request['name'])],
            'note' => 'Добавлено из заявки пользователя.'
        ];

        $parts[] = $newPart;
        $request['status'] = 'Добавлена';

        if (!saveJson($partsFile, $parts) || !saveJson($partRequestsFile, $requests)) {
            sendJson(['error' => 'Не удалось сохранить изменения'], 500);
        }

        writeLog('Деталь добавлена в справочник', $newPart['name']);
        sendJson([
            'request' => $request,
            'part' => $newPart
        ]);
    }

    sendJson(['error' => 'Заявка не найдена'], 404);
}

sendJson(['error' => 'Метод не поддерживается'], 405);

function readJson(string $file): array
{
    if (!file_exists($file)) {
        return [];
    }

    $content = file_get_contents($file);
    $data = json_decode($content, true);

    return is_array($data) ? $data : [];
}

function saveJson(string $file, array $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        return false;
    }

    return file_put_contents($file, $json) !== false;
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAdmin(): void
{
    $role = $_SERVER['HTTP_X_USER_ROLE'] ?? '';

    if ($role !== 'admin') {
        sendJson(['error' => 'Действие доступно только администратору'], 403);
    }
}
