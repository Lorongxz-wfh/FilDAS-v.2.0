<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\OfficeController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\DocumentMessageController;
use App\Http\Controllers\Api\PreviewController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\DocumentRequestController;
use App\Http\Controllers\Api\DocumentRequestFileController;




// Auth
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Workflow
    Route::get('/document-versions/{version}/tasks', [WorkflowController::class, 'tasks']);
    Route::post('/document-versions/{version}/actions', [WorkflowController::class, 'action']);
    Route::get('/work-queue', [WorkflowController::class, 'workQueue']);
    Route::get('/document-versions/{version}/route-steps', [WorkflowController::class, 'routeSteps']);


    // Messages / comments
    Route::get('/document-versions/{version}/messages', [DocumentMessageController::class, 'index']);
    Route::post('/document-versions/{version}/messages', [DocumentMessageController::class, 'store']);

    Route::patch('document-versions/{version}', [DocumentController::class, 'updateVersion'])
        ->middleware('can:updateDraft,version');

    // Activity logging (read actions)
    Route::post('/activity/opened-version', [ActivityLogController::class, 'openedVersion']);

    // Activity history feed
    Route::get('/activity', [ActivityLogController::class, 'index']);

    // Reports (QA only for now)
    Route::get('/reports/approval', [\App\Http\Controllers\Api\ReportsController::class, 'approval']);

    // Legacy: "compliance" (kept for backward compatibility)
    Route::get('/reports/compliance', [\App\Http\Controllers\Api\ReportsController::class, 'compliance']);

    // ADMIN routes
    Route::middleware('admin')->group(function () {
        Route::get('/admin/users', [\App\Http\Controllers\Api\UserController::class, 'index']);
        Route::post('/admin/users', [\App\Http\Controllers\Api\UserController::class, 'store']);
        Route::patch('/admin/users/{user}', [\App\Http\Controllers\Api\UserController::class, 'update']);

        Route::patch('/admin/users/{user}/disable', [\App\Http\Controllers\Api\UserController::class, 'disable']);
        Route::patch('/admin/users/{user}/enable', [\App\Http\Controllers\Api\UserController::class, 'enable']);
        Route::delete('/admin/users/{user}', [\App\Http\Controllers\Api\UserController::class, 'destroy']);

        Route::get('/admin/roles', [\App\Http\Controllers\Api\UserController::class, 'roles']);
        Route::get('/admin/offices', [\App\Http\Controllers\Api\AdminOfficeController::class, 'index']);
        Route::post('/admin/offices', [\App\Http\Controllers\Api\AdminOfficeController::class, 'store']);
        Route::patch('/admin/offices/{office}', [\App\Http\Controllers\Api\AdminOfficeController::class, 'update']);
        Route::delete('/admin/offices/{office}', [\App\Http\Controllers\Api\AdminOfficeController::class, 'destroy']);
        Route::patch('/admin/offices/{office}/restore', [\App\Http\Controllers\Api\AdminOfficeController::class, 'restore']);
    });

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);

    // Document requests (QA creates; offices submit; QA reviews)
    Route::get('/document-requests', [DocumentRequestController::class, 'index']); // QA/SYSADMIN/ADMIN (controller enforces)
    Route::post('/document-requests', [DocumentRequestController::class, 'store']); // QA/SYSADMIN/ADMIN
    Route::get('/document-requests/inbox', [DocumentRequestController::class, 'inbox']); // office users
    Route::get('/document-requests/{request}', [DocumentRequestController::class, 'show']); // QA/SYSADMIN/ADMIN or recipient office
    Route::post('/document-requests/{request}/recipients/{recipient}/submit', [DocumentRequestController::class, 'submit']); // recipient office
    Route::post('/document-request-submissions/{submission}/review', [DocumentRequestController::class, 'review']); // QA/SYSADMIN/ADMIN

    // Document request file signed links (AUTHENTICATED -> returns signed URL)
    Route::get('/document-requests/{request}/example/preview-link', [DocumentRequestFileController::class, 'requestExamplePreviewLink']);
    Route::get('/document-requests/{request}/example/download-link', [DocumentRequestFileController::class, 'requestExampleDownloadLink']);

    Route::get('/document-request-submission-files/{file}/preview-link', [DocumentRequestFileController::class, 'submissionFilePreviewLink']);
    Route::get('/document-request-submission-files/{file}/download-link', [DocumentRequestFileController::class, 'submissionFileDownloadLink']);


    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    Route::get('/documents/{document}/tags', [DocumentController::class, 'getTags']);
    Route::put('/documents/{document}/tags', [DocumentController::class, 'setTags']);
});

// Public reads
Route::get('/offices', [OfficeController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::controller(DocumentController::class)->group(function () {
        // Reads (AUTHENTICATED)
        Route::get('/documents/stats', 'stats');
        Route::get('/documents', 'index');
        Route::get('/documents/{document}', 'show');

        Route::get('/documents/{document}/versions', 'versions');
        Route::get('/document-versions/{version}', 'showVersion');
        Route::get('/document-versions/{version}/preview-link', 'previewLink')
            ->middleware('can:preview,version');

        // Public but signature-protected: iframe loads this URL directly.
        Route::get('/document-versions/{version}/download', 'downloadVersion')
            ->middleware('can:download,version');

        // Writes
        Route::post('/documents', 'store');
        Route::patch('/documents/{document}', 'update');
        Route::post('/document-versions/{version}/replace-file', 'replaceFile')
            ->middleware('can:replaceFile,version');
        Route::post('/documents/{document}/revision', 'createRevision');
        Route::post('/document-versions/{version}/cancel', 'cancelRevision')
            ->middleware('can:cancel,version');
        Route::delete('/document-versions/{version}', 'destroyVersion')
            ->middleware('can:destroy,version');

        Route::get('/documents/{document}/shares', 'getShares');
        Route::post('/documents/{document}/shares', 'setShares');
    });

    // Temp previews (AUTHENTICATED)
    Route::post('/previews', [PreviewController::class, 'store']);
    Route::delete('/previews/{year}/{preview}', [PreviewController::class, 'destroy']);
});

Route::get('/document-versions/{version}/preview', [DocumentController::class, 'previewSigned'])
    ->name('document-versions.preview')
    ->middleware('signed'); // signed URL includes uid; access is checked in controller via policy

Route::get('/previews/{year}/{preview}/preview', [PreviewController::class, 'previewSigned'])
    ->name('previews.preview')
    ->middleware('signed');

// New naming (signed)
Route::get('/document-requests/{request}/example/preview', [DocumentRequestFileController::class, 'requestExamplePreviewSigned'])
    ->name('document-requests.example.preview')
    ->middleware('signed');

Route::get('/document-requests/{request}/example/download', [DocumentRequestFileController::class, 'requestExampleDownloadSigned'])
    ->name('document-requests.example.download')
    ->middleware('signed');

Route::get('/document-request-submission-files/{file}/preview', [DocumentRequestFileController::class, 'submissionFilePreviewSigned'])
    ->name('document-request-submission-files.preview')
    ->middleware('signed');

Route::get('/document-request-submission-files/{file}/download', [DocumentRequestFileController::class, 'submissionFileDownloadSigned'])
    ->name('document-request-submission-files.download')
    ->middleware('signed');
