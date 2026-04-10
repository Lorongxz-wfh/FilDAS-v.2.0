<?php
/**
 * FilDAS Restoration Lifeboat
 * This script runs OUTSIDE of Laravel to remain stable during DB wipes.
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$lockFile = '/tmp/fildas_restore/active.lock';
$statusFile = '/tmp/fildas_restore/status.json';

// 1. Check if we are physically locked
if (!file_exists($lockFile)) {
    echo json_encode([
        'status' => 'idle',
        'message' => 'System idle.',
        'progress' => 0
    ]);
    exit;
}

// 2. Try to read the last known progress from the cache file
if (file_exists($statusFile)) {
    $data = file_get_contents($statusFile);
    if ($data) {
        echo $data;
        exit;
    }
}

// 3. Fallback if lock exists but cache is transiently missing
echo json_encode([
    'status' => 'running',
    'message' => 'Engine active (Transacting core)...',
    'progress' => 50
]);
