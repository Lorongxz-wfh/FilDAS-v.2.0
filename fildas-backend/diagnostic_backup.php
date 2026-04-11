<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

$diskName = env('FILESYSTEM_BACKUP_DISK', 's3');
$filename = 'backups_database_fildas-full-snapshot-2026-04-10_142508_db_only.zip';
$disk = Storage::disk($diskName);

echo "--- BACKUP DIAGNOSTIC ---\n";
echo "Disk: $diskName\n";
echo "Target: $filename\n\n";

if (!$disk->exists($filename)) {
    echo "ERROR: Backup file $filename not found on disk!\n";
    echo "Listing available files in root:\n";
    try {
        $files = $disk->files();
        foreach ($files as $f) {
            echo "  - $f (" . number_format($disk->size($f) / 1024, 2) . " KB)\n";
        }
    } catch (\Exception $e) {
        echo "Could not list files: " . $e->getMessage() . "\n";
    }
    exit(1);
}

$size = $disk->size($filename);
echo "File Size: " . number_format($size / 1024, 2) . " KB (" . $size . " bytes)\n";

if ($size < 1000) {
    echo "WARNING: File size is extremely small. Backup is likely empty.\n";
}

echo "Attempting to inspect SQL content...\n";

$tempZip = storage_path('app/temp_inspect.zip');
$tempExtractDir = storage_path('app/temp_extract_' . time());

File::put($tempZip, $disk->get($filename));

$zip = new ZipArchive;
if ($zip->open($tempZip) === TRUE) {
    echo "ZIP opened successfully. Files inside:\n";
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        echo "  - $name (" . number_format($zip->statIndex($i)['size'] / 1024, 2) . " KB)\n";
        
        if (str_ends_with($name, '.sql')) {
            $sqlContent = $zip->getFromIndex($i);
            
            // Diagnostics
            $userCount = substr_count(strtolower($sqlContent), 'insert into "users"');
            $officeCount = substr_count(strtolower($sqlContent), 'insert into "offices"');
            $docCount = substr_count(strtolower($sqlContent), 'insert into "documents"');
            
            echo "\n--- SQL CONTENT COUNTS ---\n";
            echo "Users to Restore: $userCount\n";
            echo "Offices to Restore: $officeCount\n";
            echo "Documents to Restore: $docCount\n";
            
            if ($userCount <= 1) {
                echo "\nCRITICAL: The backup file only contains $userCount user(s). The data you are looking for is NOT in this snapshot.\n";
            }
        }
    }
    $zip->close();
} else {
    echo "ERROR: Could not open ZIP file.\n";
}

@unlink($tempZip);
if (is_dir($tempExtractDir)) File::deleteDirectory($tempExtractDir);
