<?php

const APP_LOG_FILE = __DIR__ . '/../logs/app.log';

function writeLog(string $action, string $details = ''): void
{
    $line = date('Y-m-d H:i:s') . ' | ' . $action;

    if ($details !== '') {
        $line .= ' | ' . $details;
    }

    file_put_contents(APP_LOG_FILE, $line . PHP_EOL, FILE_APPEND);
}
