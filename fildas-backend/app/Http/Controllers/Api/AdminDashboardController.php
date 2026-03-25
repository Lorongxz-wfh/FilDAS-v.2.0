<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Document;
use App\Models\User;
use App\Models\Office;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function stats(Request $request)
    {
        // User counts
        $totalUsers     = User::count();
        $activeUsers    = User::whereNull('disabled_at')->count();
        $onlineUsers    = User::whereNull('disabled_at')
            ->whereNotNull('last_active_at')
            ->where('last_active_at', '>=', now()->subMinutes(30))
            ->count();

        // Users by role
        $usersByRole = User::query()
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->selectRaw('roles.name as role, COUNT(users.id) as count')
            ->groupBy('roles.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn($r) => ['role' => $r->role, 'count' => (int) $r->count])
            ->values();

        // Office counts
        $totalOffices  = Office::count();
        $activeOffices = Office::whereNull('deleted_at')->count();

        // Document totals (global, no scope filter)
        $totalDocuments     = Document::count();
        $distributedDocuments = Document::whereHas(
            'latestVersion',
            fn($v) =>
            $v->where('status', 'Distributed')
        )->count();
        $inProgressDocuments = Document::whereHas(
            'latestVersion',
            fn($v) =>
            $v->whereNotIn('status', ['Distributed', 'Cancelled', 'Superseded', 'Draft', 'Office Draft'])
        )->count();

        // Document phase breakdown (for admin dashboard chart)
        $docsByPhase = [
            'draft'        => Document::whereHas('latestVersion', fn($q) => $q->whereIn('status', ['Draft', 'Office Draft']))->count(),
            'review'       => Document::whereHas('latestVersion', fn($q) => $q->where('status', 'like', '%Review%')->orWhere('status', 'like', '%Check%'))->count(),
            'approval'     => Document::whereHas('latestVersion', fn($q) => $q->where('status', 'like', '%Approval%'))->count(),
            'finalization' => Document::whereHas('latestVersion', fn($q) => $q->where(function ($r) { $r->where('status', 'like', '%Registration%')->orWhere('status', 'like', '%Distribution%'); }))->count(),
            'distributed'  => $distributedDocuments,
        ];

        // Recent user registrations (last 8)
        $recentUsers = User::query()
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->leftJoin('offices', 'users.office_id', '=', 'offices.id')
            ->select(
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.email',
                'users.created_at',
                'users.disabled_at',
                'roles.name as role',
                'offices.name as office_name'
            )
            ->orderByDesc('users.created_at')
            ->limit(8)
            ->get()
            ->map(fn($u) => [
                'id'          => $u->id,
            'name'        => trim($u->first_name . ' ' . $u->last_name),
            'email'       => $u->email,
            'role'        => $u->role,
            'office_name' => $u->office_name,
            'is_active'   => is_null($u->disabled_at),
            'created_at'  => $u->created_at,
            ]);

        // Activity volume — last 6 months (monthly counts)
        $driver = config('database.default');
        $dateTrunc = $driver === 'pgsql'
            ? "TO_CHAR(created_at, 'YYYY-MM')"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $activitySeries = ActivityLog::query()
            ->selectRaw("{$dateTrunc} as label, COUNT(*) as count")
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupByRaw("{$dateTrunc}")
            ->orderBy('label')
            ->get()
            ->map(fn($r) => ['label' => $r->label, 'count' => (int) $r->count])
            ->values();

        // Fill all 6 months with zeros so the chart always shows 6 bars
        $activityMap    = $activitySeries->pluck('count', 'label');
        $activitySeries = collect(range(5, 0))
            ->map(fn($i) => now()->subMonths($i)->format('Y-m'))
            ->map(fn($m) => ['label' => $m, 'count' => $activityMap[$m] ?? 0])
            ->values();

        return response()->json([
            'users' => [
                'total'        => $totalUsers,
                'active'       => $activeUsers,
                'inactive'     => $totalUsers - $activeUsers,
                'online'       => $onlineUsers,
                'by_role'      => $usersByRole,
                'recent'       => $recentUsers,
            ],
            'offices' => [
                'total'  => $totalOffices,
                'active' => $activeOffices,
            ],
            'documents' => [
                'total'       => $totalDocuments,
                'distributed' => $distributedDocuments,
                'in_progress' => $inProgressDocuments,
                'by_phase'    => $docsByPhase,
            ],
            'activity_series' => $activitySeries,
        ]);
    }
}
