<?php

use App\Models\User;
use App\Models\Office;
use App\Http\Controllers\Api\DocumentRequestController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

try {
    // Find or create an admin user with an office for testing
    $office = Office::first();
    if (!$office) {
        $office = Office::create(['name' => 'Test Office', 'code' => 'TEST']);
    }

    $user = User::whereHas('role', function($q) { $q->where('name', 'admin'); })->first();
    if (!$user) {
        // Fallback to any user
        $user = User::first();
    }
    
    if (!$user) {
        echo "No user found.\n";
        exit;
    }

    // Ensure user has office
    if (!$user->office_id) {
        $user->office_id = $office->id;
        $user->save();
    }

    Auth::login($user);
    
    // Manually set up the request because Request::create might not populate everything exactly as expected for role checks
    $request = new Request([
        'per_page' => 10,
        'page' => 1,
        'sort_by' => 'created_at',
        'sort_dir' => 'desc'
    ]);
    $request->setUserResolver(fn() => $user);

    echo "Testing as User ID: " . $user->id . " Role: " . ($user->role->name ?? 'unknown') . "\n";
    
    $controller = app(DocumentRequestController::class);
    $response = $controller->index($request);
    
    echo "Status Code: " . $response->getStatusCode() . "\n";
    if ($response->getStatusCode() !== 200) {
        echo "Response Content: " . $response->getContent() . "\n";
    } else {
        $data = json_decode($response->getContent(), true);
        echo "Found " . count($data['data']) . " requests.\n";
        // print_r($data['data']);
    }

} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . " LINE: " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
