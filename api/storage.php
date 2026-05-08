<?php

require_once __DIR__ . '/config.php';

function readRequests(): array
{
    if (!file_exists(REQUESTS_FILE)) {
        return [];
    }

    $content = file_get_contents(REQUESTS_FILE);

    if ($content === false || trim($content) === '') {
        return [];
    }

    $requests = json_decode($content, true);

    // Если JSON сломался, лучше вернуть пустой список.
    if (!is_array($requests)) {
        return [];
    }

    return $requests;
}

function saveRequests(array $requests): bool
{
    $json = json_encode($requests, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        return false;
    }

    return file_put_contents(REQUESTS_FILE, $json) !== false;
}
