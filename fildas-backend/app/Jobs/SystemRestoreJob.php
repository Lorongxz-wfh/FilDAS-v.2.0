<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use App\Models\Notification;
use ZipArchive;

class SystemRestoreJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1800; // 30 minutes
    private $filename;
    private $path;
    private $actorId;
    private $officeId;
    private $backupDir = 'backups';

    public function __construct($filename, $path, $actorId, $officeId)
    {
        $this->filename = $filename;
        $this->path = $path;
        $this->actorId = $actorId;
        $this->officeId = $officeId;
    }

    public function handle()
    {
        ini_set('memory_limit', '2048M');
        set_time_limit(1800);

        $disk = Storage::disk(config('filesystems.default') === 's3' ? 's3' : 'local');
        $tempZip = tempnam(sys_get_temp_dir(), 'rest_bg_');
        
        Log::info("Async Restore Started", ['file' => $this->filename]);

        try {
            // 1. Download to local disk
            $readStream = $disk->readStream($this->path);
            $writeStream = fopen($tempZip, 'w+');
            stream_copy_to_stream($readStream, $writeStream);
            fclose($readStream);
            fclose($writeStream);

            $tempExtractDir = storage_path('app/temp/restore_bg_' . time());
            if (!is_dir($tempExtractDir)) {
                mkdir($tempExtractDir, 0755, true);
            }

            $zip = new ZipArchive();
            if ($zip->open($tempZip) === true) {
                
                // Full Restore Detection
                $isFull = $zip->statName('database_snapshot.sql') !== false && 
                         $zip->statName('document_collection.zip') !== false;

                if ($isFull) {
                    // Extract DB
                    $tempSql = $tempExtractDir . '/database_snapshot.sql';
                    $zip->extractTo($tempExtractDir, ['database_snapshot.sql']);
                    $this->runSqlRestore($tempSql);
                    @unlink($tempSql);

                    // Extract Docs
                    $tempDocZip = $tempExtractDir . '/document_collection.zip';
                    $zip->extractTo($tempExtractDir, ['document_collection.zip']);
                    $this->internalRestoreDocuments($tempDocZip);
                    @unlink($tempDocZip);
                } else {
                    // Normal ZIP
                    $zip->extractTo($tempExtractDir);
                    $extractedFiles = scandir($tempExtractDir);
                    foreach ($extractedFiles as $f) {
                        if (str_ends_with($f, '.sql') || str_ends_with($f, '.sqlite')) {
                            $this->runSqlRestore($tempExtractDir . '/' . $f);
                            break;
                        }
                    }
                }
                $zip->close();
            }

            // Cleanup
            @unlink($tempZip);
            File::deleteDirectory($tempExtractDir);

            $actor = User::find($this->actorId);
            $this->notifyAdminsOfCompletion($actor, $this->filename);
            
            Log::info("Async Restore Completed Successfully", ['file' => $this->filename]);

        } catch (\Throwable $e) {
            Log::error("Async Restore Failed", ['file' => $this->filename, 'error' => $e->getMessage()]);
            @unlink($tempZip);
        }
    }

    private function runSqlRestore($sqlPath)
    {
        $dbConnection = config('database.default');
        
        // Wipe tables first
        $this->wipeApplicationTables();

        if ($dbConnection === 'sqlite' && str_ends_with($sqlPath, '.sqlite')) {
            copy($sqlPath, config('database.connections.sqlite.database'));
            return;
        }

        if ($dbConnection === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        } elseif ($dbConnection === 'pgsql') {
            DB::statement('SET session_replication_role = \'replica\'');
        }

        $handle = fopen($sqlPath, "r");
        $query = "";
        if ($handle) {
            while (($line = fgets($handle)) !== false) {
                $trimmedLine = trim($line);
                if (empty($trimmedLine) || str_starts_with($trimmedLine, '--') || str_starts_with($trimmedLine, '/*')) continue;
                
                $query .= $line;
                if (str_ends_with($trimmedLine, ';')) {
                    try {
                        DB::unprepared($query);
                    } catch (\Throwable $e) {}
                    $query = "";
                }
            }
            fclose($handle);
        }

        if ($dbConnection === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } elseif ($dbConnection === 'pgsql') {
            DB::statement('SET session_replication_role = \'origin\'');
        }
    }

    private function wipeApplicationTables()
    {
        $dbConnection = config('database.default');
        $isMysql = in_array($dbConnection, ['mysql', 'mariadb'], true);
        $isPgsql = $dbConnection === 'pgsql';

        $skipTables = ['migrations', 'jobs', 'failed_jobs', 'cache', 'cache_locks', 'telescope_entries', 'telescope_entries_tags', 'telescope_monitoring'];

        if ($isMysql) {
            $tables = DB::select('SHOW TABLES');
            $tableNames = array_map(fn($t) => array_values((array)$t)[0], $tables);
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        } elseif ($isPgsql) {
            $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
            $tableNames = array_column($tables, 'tablename');
            DB::statement('SET session_replication_role = \'replica\'');
        } else {
            $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            $tableNames = array_column($tables, 'name');
        }

        foreach ($tableNames as $table) {
            if (in_array($table, $skipTables)) continue;
            try {
                if ($isMysql) DB::statement("DROP TABLE IF EXISTS `{$table}`");
                elseif ($isPgsql) DB::statement("DROP TABLE IF EXISTS \"{$table}\" CASCADE");
                else DB::statement("DROP TABLE IF EXISTS `{$table}`");
            } catch (\Throwable $e) {}
        }

        if ($isMysql) DB::statement('SET FOREIGN_KEY_CHECKS=1');
        elseif ($isPgsql) DB::statement('SET session_replication_role = \'origin\'');
    }

    private function internalRestoreDocuments($zipPath)
    {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) !== true) return;

        $extractDir = storage_path('app/temp/restore_docs_' . time());
        mkdir($extractDir, 0755, true);
        $zip->extractTo($extractDir);
        $zip->close();

        $manifestPath = $extractDir . '/manifest.json';
        if (file_exists($manifestPath)) {
            $manifest = json_decode(file_get_contents($manifestPath), true);
            foreach ($manifest as $entryName => $originalPath) {
                $localSource = $extractDir . '/' . $entryName;
                if (file_exists($localSource)) {
                    $stream = fopen($localSource, 'r');
                    Storage::disk(config('filesystems.default'))->put($originalPath, $stream);
                    if (is_resource($stream)) fclose($stream);
                }
            }
        }
        File::deleteDirectory($extractDir);
    }

    private function notifyAdminsOfCompletion($actor, $filename)
    {
        $admins = User::whereHas('role', function ($q) {
            $q->whereIn('name', ['admin', 'sysadmin']);
        })->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'event'   => 'admin.system_restored',
                'title'   => 'System Restore Completed',
                'body'    => "The restoration of {$filename} has finished successfully.",
                'meta'    => ['actor' => $actor->full_name, 'file' => $filename]
            ]);
            
            try {
                Mail::to($admin->email)->queue(new \App\Mail\WorkflowNotificationMail(
                    recipientName: $admin->full_name,
                    notifTitle: 'System Restore Success',
                    notifBody: "The background restoration task for {$filename} has completed. Please refresh your browser to see the restored state.",
                    documentTitle: 'System Integrity',
                    documentStatus: 'SUCCESS',
                    isReject: false,
                    actorName: $actor->full_name,
                    documentId: null,
                    appUrl: config('app.url'),
                    appName: config('app.name', 'FilDAS'),
                    cardLabel: 'Restore'
                ));
            } catch (\Throwable $e) {}
        }
    }
}
