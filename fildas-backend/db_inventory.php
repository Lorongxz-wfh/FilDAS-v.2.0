<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "--- PRODUCTION DATABASE INVENTORY ---\n";

$tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");

foreach ($tables as $table) {
    $name = $table->table_name;
    try {
        $count = DB::table($name)->count();
        echo str_pad($name, 30) . ": $count rows\n";
    } catch (\Exception $e) {
        echo str_pad($name, 30) . ": ERROR (" . $e->getMessage() . ")\n";
    }
}
