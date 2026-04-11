<?php

$zipPath = 'C:\Users\Lorongxz\Downloads\backups_database_fildas-full-snapshot-2026-04-10_142508_db_only.zip';

echo "--- LOCAL BACKUP AUDIT ---\n";
echo "ZIP: $zipPath\n";

if (!file_exists($zipPath)) {
    echo "ERROR: File not found.\n";
    exit(1);
}

$zip = new ZipArchive;
if ($zip->open($zipPath) === TRUE) {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (str_ends_with($name, '.sql')) {
            echo "Inspecting: $name\n";
            $sql = $zip->getFromIndex($i);
            
            $users = substr_count($sql, 'INSERT INTO "users"');
            $offices = substr_count($sql, 'INSERT INTO "offices"');
            $docs = substr_count($sql, 'INSERT INTO "documents"');
            $versionLog = substr_count($sql, 'INSERT INTO "document_versions"');

            echo "  - Users expected:     $users\n";
            echo "  - Offices expected:   $offices\n";
            echo "  - Documents expected: $docs\n";
            echo "  - Versions expected:  $versionLog\n";
            
            if ($users > 0) {
                echo "\nSUCCESS: The data IS present in the backup. The issue is in the RESTORATION engine.\n";
            } else {
                echo "\nFAILED: The backup itself is EMPTY. You need a different snapshot.\n";
            }
        }
    }
    $zip->close();
} else {
    echo "ERROR: Failed to open ZIP.\n";
}
