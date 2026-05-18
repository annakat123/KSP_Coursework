<?php

require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/logger.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    sendJson(readRequests());
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        sendJson(['error' => 'Некорректные данные'], 400);
    }

    $clientName = trim($data['clientName'] ?? '');
    $vehicle = trim($data['vehicle'] ?? '');
    $description = trim($data['description'] ?? '');
    $errors = [];

    // Проверка почти такая же, как на фронте.
    if (mb_strlen($clientName) < 3) {
        $errors[] = 'Укажите ФИО заявителя';
    }

    if (mb_strlen($vehicle) < 2) {
        $errors[] = 'Укажите машину или технику';
    }

    if (mb_strlen($description) < 10) {
        $errors[] = 'Описание проблемы слишком короткое';
    }

    if ($errors) {
        sendJson(['errors' => $errors], 422);
    }

    $requests = readRequests();
    $ids = array_column($requests, 'id');
    $nextId = $ids ? max($ids) + 1 : 1;

    $newRequest = [
        'id' => $nextId,
        'date' => date('d.m.Y'),
        'clientName' => $clientName,
        'phone' => trim($data['phone'] ?? ''),
        'vehicle' => $vehicle,
        'plateNumber' => trim($data['plateNumber'] ?? ''),
        'partName' => trim($data['partName'] ?? ''),
        'problemType' => trim($data['problemType'] ?? 'other'),
        'problem' => $description,
        'status' => 'Новая'
    ];

    $requests[] = $newRequest;

    if (!saveRequests($requests)) {
        sendJson(['error' => 'Не удалось сохранить заявку'], 500);
    }

    writeLog('Создана заявка', '№' . $newRequest['id'] . ', техника: ' . $newRequest['vehicle']);
    sendJson($newRequest, 201);
}

if ($method === 'PATCH') {
    requireAdmin();

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        sendJson(['error' => 'Некорректные данные'], 400);
    }

    $requestId = (int)($data['id'] ?? 0);
    $newStatus = trim($data['status'] ?? '');
    $allowedStatuses = ['Новая', 'Не хватает данных', 'Принято'];

    if ($requestId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
        sendJson(['error' => 'Неверный статус заявки'], 422);
    }

    $requests = readRequests();

    foreach ($requests as &$request) {
        if ((int)$request['id'] === $requestId) {
            $request['status'] = $newStatus;

            if (!saveRequests($requests)) {
                sendJson(['error' => 'Не удалось обновить заявку'], 500);
            }

            writeLog('Изменен статус заявки', '№' . $requestId . ', статус: ' . $newStatus);
            sendJson($request);
        }
    }

    sendJson(['error' => 'Заявка не найдена'], 404);
}

sendJson(['error' => 'Метод не поддерживается'], 405);

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
