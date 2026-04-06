<?php
use App\Http\Controllers\Api\Admin\SystemBackupController;
use Illuminate\Http\Request;
use App\Models\User;

$user = User::whereHas('role', function($q) { $q->where('name', 'admin'); })->first();
if (!$user) {
    echo "No admin user found for testing\n";
    exit;
}

$request = Request::create('/api/admin/system/backups', 'POST');
$request->setUserResolver(fn() => $user);

$controller = new SystemBackupController();
try {
    echo "Triggering snapshot...\n";
    $response = $controller->store($request);
    echo "Response: " . $response->getStatusCode() . "\n";
    echo "Body: " . $response->getContent() . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "In " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
