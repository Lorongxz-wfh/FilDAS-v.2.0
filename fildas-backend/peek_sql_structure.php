<?php

$zipPath = 'C:\Users\Lorongxz\Downloads\backups_database_fildas-full-snapshot-2026-04-10_142508_db_only.zip';

$zip = new ZipArchive;
if ($zip->open($zipPath) === TRUE) {
    $sql = $zip->getFromName('database_snapshot.sql');
    
    echo "--- SQL STRUCTURE PEEK ---\n\n";

    // Find first user insert
    if (preg_match('/INSERT INTO "users"[\s\S]+?;/', $sql, $matches)) {
        echo "SAMPLE USER INSERT:\n" . $matches[0] . "\n\n";
    }

    // Find first office insert
    if (preg_match('/INSERT INTO "offices"[\s\S]+?;/', $sql, $matches)) {
        echo "SAMPLE OFFICE INSERT:\n" . $matches[0] . "\n\n";
    }

    $zip->close();
}
