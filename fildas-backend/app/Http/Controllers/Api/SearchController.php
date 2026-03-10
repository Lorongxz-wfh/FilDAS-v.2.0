<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\User;
use App\Models\Office;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $q = trim((string) ($request->query('q', '')));

        if (strlen($q) < 2) {
            return response()->json([
                'documents' => [],
                'users'     => [],
                'offices'   => [],
            ]);
        }

        $like = "%{$q}%";
        $op = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $actor    = $request->user();
        $roleName = strtolower(trim((string) ($actor?->role?->name ?? '')));
        $isAdmin  = in_array($roleName, ['admin', 'sysadmin'], true);

        // Documents — title / description match
        $documents = Document::query()
            ->where(function ($query) use ($like, $op) {
                $query->where('title', $op, $like)
                    ->orWhere('description', $op, $like);
            })
            ->limit(6)
            ->get(['id', 'title', 'description'])
            ->map(fn($d) => [
                'type'        => 'document',
                'id'          => $d->id,
                'title'       => $d->title,
                'description' => $d->description,
                'url'         => "/documents/{$d->id}",
            ]);

        // Users — admin only
        $users = collect();
        if ($isAdmin) {
            $users = User::query()
                ->where(function ($query) use ($like, $op) {
                    $query->where('first_name', $op, $like)
                        ->orWhere('last_name', $op, $like)
                        ->orWhere('email', $op, $like);
                })
                ->with('role')
                ->limit(5)
                ->get(['id', 'first_name', 'last_name', 'email', 'role_id'])
                ->map(fn($u) => [
                    'type'  => 'user',
                    'id'    => $u->id,
                    'title' => trim("{$u->first_name} {$u->last_name}"),
                    'description' => $u->email,
                    'meta'  => strtolower($u->role?->name ?? ''),
                    'url'   => "/user-manager",
                ]);
        }

        // Offices
        $offices = Office::query()
            ->where(function ($query) use ($like, $op) {
                $query->where('name', $op, $like)
                    ->orWhere('code', $op, $like);
            })
            ->limit(5)
            ->get(['id', 'name', 'code'])
            ->map(fn($o) => [
                'type'        => 'office',
                'id'          => $o->id,
                'title'       => $o->name,
                'description' => $o->code,
                'url'         => "/office-manager",
            ]);

        return response()->json([
            'documents' => $documents->values(),
            'users'     => $users->values(),
            'offices'   => $offices->values(),
        ]);
    }
}
