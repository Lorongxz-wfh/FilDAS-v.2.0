<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AnnouncementController extends Controller
{
    // All authenticated users — active announcements only
    public function index(): JsonResponse
    {
        $announcements = Announcement::with('creator:id,first_name,middle_name,last_name,suffix')
            ->active()
            ->ordered()
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'title'        => $a->title,
                'body'         => $a->body,
                'type'         => $a->type,
                'is_pinned'    => $a->is_pinned,
                'expires_at'   => $a->expires_at?->toISOString(),
                'created_at'   => $a->created_at->toISOString(),
                'created_by'   => $a->creator->full_name ?? 'QA',
            ]);

        return response()->json($announcements);
    }

    // All announcements ever — for the full list page
    public function all(): JsonResponse
    {
        $announcements = Announcement::with('creator:id,first_name,middle_name,last_name,suffix')
            ->ordered()
            ->paginate(20);

        return response()->json([
            'data' => collect($announcements->items())->map(fn($a) => [
                'id'           => $a->id,
                'title'        => $a->title,
                'body'         => $a->body,
                'type'         => $a->type,
                'is_pinned'    => $a->is_pinned,
                'is_archived'  => $a->archived_at !== null,
                'expires_at'   => $a->expires_at?->toISOString(),
                'archived_at'  => $a->archived_at?->toISOString(),
                'created_at'   => $a->created_at->toISOString(),
                'created_by'   => $a->creator->full_name ?? 'QA',
            ]),
            'meta' => [
                'current_page' => $announcements->currentPage(),
                'last_page'    => $announcements->lastPage(),
                'total'        => $announcements->total(),
            ],
        ]);
    }

    // QA + Admin only
    public function store(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        $data = $request->validate([
            'title'      => 'required|string|max:255',
            'body'       => 'required|string|max:2000',
            'type'       => 'required|in:info,warning,urgent',
            'is_pinned'  => 'boolean',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $announcement = Announcement::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        $announcement->load('creator:id,first_name,middle_name,last_name,suffix');

        return response()->json([
            'id'           => $announcement->id,
            'title'        => $announcement->title,
            'body'         => $announcement->body,
            'type'         => $announcement->type,
            'is_pinned'    => $announcement->is_pinned,
            'expires_at'   => $announcement->expires_at?->toISOString(),
            'created_at'   => $announcement->created_at->toISOString(),
            'created_by'   => $announcement->creator->full_name ?? 'QA',
        ], 201);
    }

    // QA + Admin only
    public function archive(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorizeRole($request);
        $announcement->update(['archived_at' => now()]);
        return response()->json(['message' => 'Archived.']);
    }

    // QA + Admin only
    public function unarchive(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorizeRole($request);
        $announcement->update(['archived_at' => null]);
        return response()->json(['message' => 'Unarchived.']);
    }

    // QA + Admin only
    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorizeRole($request);
        $announcement->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    private function authorizeRole(Request $request): void
    {
        $roleName = $request->user()->role?->name ?? '';
        if (!in_array(strtolower($roleName), ['admin', 'qa', 'sysadmin'])) {
            abort(403, 'Unauthorized.');
        }
    }
}
