<?php

use App\Models\User;
use App\Http\Controllers\Api\DocumentRequestController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

try {
    $user = User::whereHas('role', function($q) { $q->where('name', 'admin'); })->first();
    if (!$user) {
        echo "No admin user found.\n";
        exit;
    }

    Auth::login($user);
    $request = Request::create('/api/document-requests', 'GET', [
        'per_page' => 10,
        'page' => 1,
        'sort_by' => 'created_at',
        'sort_dir' => 'desc'
    ]);
    
    // Simulate the controller call
    $controller = app(DocumentRequestController::class);
    $response = $controller->index($request);
    
    echo "Success! Status Code: " . $response->getStatusCode() . "\n";
    print_r(json_decode($response->getContent(), true));

} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . " LINE: " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
