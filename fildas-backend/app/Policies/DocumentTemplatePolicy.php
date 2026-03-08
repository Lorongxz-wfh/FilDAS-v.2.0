<?php

namespace App\Policies;

use App\Models\DocumentTemplate;
use App\Models\User;

class DocumentTemplatePolicy
{
    // ── View ─────────────────────────────────────────────────

    /**
     * Any authenticated user can list templates.
     * Filtering by office is handled in the controller query, not here.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DocumentTemplate $template): bool
    {
        return $this->canSee($user, $template);
    }

    // ── Create ───────────────────────────────────────────────

    public function create(User $user): bool
    {
        return true; // all authenticated users can upload
    }

    // ── Delete ───────────────────────────────────────────────

    /**
     * Admin  → can delete any template.
     * Others → can only delete their own uploads.
     */
    public function delete(User $user, DocumentTemplate $template): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        return $template->uploaded_by === $user->id;
    }

    // ── Download ─────────────────────────────────────────────

    public function download(User $user, DocumentTemplate $template): bool
    {
        return $this->canSee($user, $template);
    }

    // ── Private helpers ──────────────────────────────────────

    /**
     * A user can see a template if:
     *   - it is global (office_id = null), OR
     *   - it belongs to the user's own office
     */
    private function canSee(User $user, DocumentTemplate $template): bool
    {
        if ($template->isGlobal()) {
            return true;
        }

        return $template->office_id === $user->office_id;
    }

    private function isAdmin(User $user): bool
    {
        $role = strtolower((string) ($user->role?->name ?? $user->role ?? ''));
        return $role === 'admin';
    }
}
