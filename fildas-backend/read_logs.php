<?php
$logPath = storage_path('logs/laravel.log');
if (file_exists($logPath)) {
    echo "LOG FOUND:\n";
    // Get last 1000 characters
    $size = filesize($logPath);
    $start = max(0, $size - 10000);
    echo file_get_contents($logPath, false, null, $start);
} else {
    echo "LOG NOT FOUND at " . $logPath . "\n";
}
