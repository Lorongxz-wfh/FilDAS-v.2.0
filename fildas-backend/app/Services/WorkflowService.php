<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Document;
use App\Models\DocumentMessage;
use App\Models\DocumentVersion;
use App\Models\Notification;
use App\Models\Office;
use App\Models\User;
use App\Models\WorkflowTask;
use Illuminate\Support\Facades\DB;

class WorkflowService
{
    public function __construct(
        private OfficeHierarchyService $hierarchy,
    ) {}

    // ──────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Return list of action constants available to $user on $version right now.
     * Frontend uses this to render buttons.
     */
    public function getAvailableActions(DocumentVersion $version, User $user): array
    {
        $task = $this->openTask($version);
        if (!$task) return [];

        $userOfficeId = (int) ($user->office_id ?? 0);
        $taskOfficeId = (int) ($task->assigned_office_id ?? 0);

        // Must be assigned to this user's office
        if ($userOfficeId !== $taskOfficeId) return [];

        $flow    = $version->workflow_type;
        $routing = $version->routing_mode;
        $step    = $task->step;

        if ($routing === 'custom') {
            return $this->availableActionsCustom($step, $user);
        }

        return match ($flow) {
            'office' => $this->availableActionsOffice($step, $user),
            default  => $this->availableActionsQa($step, $user),
        };
    }

    /**
     * Apply an action. Wraps everything in a DB transaction.
     *
     * @throws \InvalidArgumentException on bad action
     * @throws \RuntimeException on guard failures
     */
    public function applyAction(
        DocumentVersion $version,
        User $user,
        string $action,
        ?string $note = null,
        ?string $effectiveDate = null,
    ): WorkflowTask {
        return DB::transaction(function () use ($version, $user, $action, $note, $effectiveDate) {
            $task = $this->openTask($version);

            if (!$task) {
                throw new \RuntimeException('No open task found for this version.');
            }

            // Reject is universal — handled first
            if ($action === WorkflowSteps::ACTION_REJECT) {
                if (!$note) throw new \RuntimeException('A note is required when rejecting.');
                return $this->applyReject($version, $task, $user, $note);
            }

            $flow    = $version->workflow_type;
            $routing = $version->routing_mode;

            if ($routing === 'custom') {
                return $this->applyCustomAction($version, $task, $user, $action, $note, $effectiveDate);
            }

            return match ($flow) {
                'office' => $this->applyOfficeAction($version, $task, $user, $action, $note, $effectiveDate),
                default  => $this->applyQaAction($version, $task, $user, $action, $note, $effectiveDate),
            };
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // AVAILABLE ACTIONS
    // ──────────────────────────────────────────────────────────────────────

    private function availableActionsQa(string $step, User $user): array
    {
        $actions = match ($step) {
            WorkflowSteps::STEP_QA_DRAFT           => [WorkflowSteps::ACTION_QA_SEND_TO_OFFICE_REVIEW],
            WorkflowSteps::STEP_QA_OFFICE_REVIEW   => [
                WorkflowSteps::ACTION_QA_OFFICE_FORWARD_TO_VP,
                WorkflowSteps::ACTION_QA_OFFICE_RETURN_TO_QA,
            ],
            WorkflowSteps::STEP_QA_VP_REVIEW       => [WorkflowSteps::ACTION_QA_VP_SEND_BACK_TO_QA],
            WorkflowSteps::STEP_QA_FINAL_CHECK     => [WorkflowSteps::ACTION_QA_START_OFFICE_APPROVAL],
            WorkflowSteps::STEP_QA_OFFICE_APPROVAL => [WorkflowSteps::ACTION_QA_OFFICE_FORWARD_TO_VP_APPR],
            WorkflowSteps::STEP_QA_VP_APPROVAL     => [WorkflowSteps::ACTION_QA_VP_FORWARD_TO_PRESIDENT],
            WorkflowSteps::STEP_QA_PRES_APPROVAL   => [WorkflowSteps::ACTION_QA_PRESIDENT_SEND_BACK_TO_QA],
            WorkflowSteps::STEP_QA_REGISTRATION    => [WorkflowSteps::ACTION_QA_REGISTER],
            WorkflowSteps::STEP_QA_DISTRIBUTION    => [WorkflowSteps::ACTION_QA_DISTRIBUTE],
            default => [],
        };

        // Reject available on all steps except draft (owner can just edit)
        // and distributed (terminal)
        if (!in_array($step, [
            WorkflowSteps::STEP_QA_DRAFT,
            WorkflowSteps::STEP_DISTRIBUTED,
        ], true)) {
            $actions[] = WorkflowSteps::ACTION_REJECT;
        }

        return $actions;
    }

    private function availableActionsOffice(string $step, User $user): array
    {
        $actions = match ($step) {
            WorkflowSteps::STEP_OFFICE_DRAFT       => [WorkflowSteps::ACTION_OFFICE_SEND_TO_HEAD],
            WorkflowSteps::STEP_OFFICE_HEAD_REVIEW => [
                WorkflowSteps::ACTION_OFFICE_HEAD_FORWARD_TO_VP,
                WorkflowSteps::ACTION_OFFICE_HEAD_RETURN_TO_STAFF,
            ],
            WorkflowSteps::STEP_OFFICE_VP_REVIEW   => [WorkflowSteps::ACTION_OFFICE_VP_SEND_BACK_TO_STAFF],
            WorkflowSteps::STEP_OFFICE_FINAL_CHECK => [WorkflowSteps::ACTION_OFFICE_SEND_TO_QA_APPROVAL],
            WorkflowSteps::STEP_OFFICE_QA_APPROVAL => [
                WorkflowSteps::ACTION_OFFICE_QA_APPROVE,
                WorkflowSteps::ACTION_OFFICE_QA_RETURN_TO_STAFF,
            ],
            WorkflowSteps::STEP_OFFICE_REGISTRATION => [WorkflowSteps::ACTION_OFFICE_REGISTER],
            WorkflowSteps::STEP_OFFICE_DISTRIBUTION => [WorkflowSteps::ACTION_OFFICE_DISTRIBUTE],
            default => [],
        };

        if (!in_array($step, [
            WorkflowSteps::STEP_OFFICE_DRAFT,
            WorkflowSteps::STEP_DISTRIBUTED,
        ], true)) {
            $actions[] = WorkflowSteps::ACTION_REJECT;
        }

        return $actions;
    }

    private function availableActionsCustom(string $step, User $user): array
    {
        $actions = match ($step) {
            WorkflowSteps::STEP_CUSTOM_DRAFT                  => [WorkflowSteps::ACTION_CUSTOM_FORWARD],
            WorkflowSteps::STEP_CUSTOM_OFFICE_REVIEW          => [WorkflowSteps::ACTION_CUSTOM_FORWARD],
            WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER          => [WorkflowSteps::ACTION_CUSTOM_START_APPROVAL],
            WorkflowSteps::STEP_CUSTOM_OFFICE_APPROVAL        => [WorkflowSteps::ACTION_CUSTOM_FORWARD],
            WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER_APPROVAL => [WorkflowSteps::ACTION_CUSTOM_REGISTER],
            WorkflowSteps::STEP_CUSTOM_REGISTRATION           => [WorkflowSteps::ACTION_CUSTOM_DISTRIBUTE],
            WorkflowSteps::STEP_CUSTOM_DISTRIBUTION           => [],
            default => [],
        };

        if (!in_array($step, [
            WorkflowSteps::STEP_CUSTOM_DRAFT,
            WorkflowSteps::STEP_DISTRIBUTED,
        ], true)) {
            $actions[] = WorkflowSteps::ACTION_REJECT;
        }

        return $actions;
    }

    // ──────────────────────────────────────────────────────────────────────
    // APPLY ACTIONS — QA FLOW
    // ──────────────────────────────────────────────────────────────────────

    private function applyQaAction(
        DocumentVersion $version,
        WorkflowTask $task,
        User $user,
        string $action,
        ?string $note,
        ?string $effectiveDate,
    ): WorkflowTask {
        $doc          = $this->doc($version);
        $qaOfficeId   = $this->qaOfficeId();
        $officeId     = (int) ($doc->review_office_id ?? 0);

        [$nextStep, $nextOfficeId, $nextRoleId, $nextUserId] = match ($action) {

            WorkflowSteps::ACTION_QA_SEND_TO_OFFICE_REVIEW => [
                WorkflowSteps::STEP_QA_OFFICE_REVIEW,
                $officeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_OFFICE_FORWARD_TO_VP => (function () use ($officeId) {
                [$vpOfficeId, $vpRoleId, $vpUserId] = $this->resolveVp($officeId);
                return [WorkflowSteps::STEP_QA_VP_REVIEW, $vpOfficeId, $vpRoleId, $vpUserId];
            })(),

            WorkflowSteps::ACTION_QA_OFFICE_RETURN_TO_QA => [
                WorkflowSteps::STEP_QA_DRAFT,
                $qaOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_VP_SEND_BACK_TO_QA => [
                WorkflowSteps::STEP_QA_FINAL_CHECK,
                $qaOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_START_OFFICE_APPROVAL => [
                WorkflowSteps::STEP_QA_OFFICE_APPROVAL,
                $officeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_OFFICE_FORWARD_TO_VP_APPR => (function () use ($officeId) {
                [$vpOfficeId, $vpRoleId, $vpUserId] = $this->resolveVp($officeId);
                return [WorkflowSteps::STEP_QA_VP_APPROVAL, $vpOfficeId, $vpRoleId, $vpUserId];
            })(),

            WorkflowSteps::ACTION_QA_VP_FORWARD_TO_PRESIDENT => (function () {
                [$presOfficeId, $presRoleId, $presUserId] = $this->resolvePresident();
                return [WorkflowSteps::STEP_QA_PRES_APPROVAL, $presOfficeId, $presRoleId, $presUserId];
            })(),

            WorkflowSteps::ACTION_QA_PRESIDENT_SEND_BACK_TO_QA => [
                WorkflowSteps::STEP_QA_REGISTRATION,
                $qaOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_REGISTER => [
                WorkflowSteps::STEP_QA_DISTRIBUTION,
                $qaOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_QA_DISTRIBUTE => [
                WorkflowSteps::STEP_DISTRIBUTED,
                $qaOfficeId,
                null,
                null,
            ],

            default => throw new \InvalidArgumentException("Unknown QA action: {$action}"),
        };

        return $this->transition(
            $version,
            $task,
            $user,
            $nextStep,
            $nextOfficeId,
            $nextRoleId,
            $nextUserId,
            $note,
            $effectiveDate,
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // APPLY ACTIONS — OFFICE FLOW
    // ──────────────────────────────────────────────────────────────────────

    private function applyOfficeAction(
        DocumentVersion $version,
        WorkflowTask $task,
        User $user,
        string $action,
        ?string $note,
        ?string $effectiveDate,
    ): WorkflowTask {
        $doc          = $this->doc($version);
        $ownerOfficeId = (int) ($doc->owner_office_id ?? 0);
        $qaOfficeId   = $this->qaOfficeId();

        [$nextStep, $nextOfficeId, $nextRoleId, $nextUserId] = match ($action) {

            WorkflowSteps::ACTION_OFFICE_SEND_TO_HEAD => [
                WorkflowSteps::STEP_OFFICE_HEAD_REVIEW,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_HEAD_FORWARD_TO_VP => (function () use ($ownerOfficeId) {
                [$vpOfficeId, $vpRoleId, $vpUserId] = $this->resolveVp($ownerOfficeId);
                return [WorkflowSteps::STEP_OFFICE_VP_REVIEW, $vpOfficeId, $vpRoleId, $vpUserId];
            })(),

            WorkflowSteps::ACTION_OFFICE_HEAD_RETURN_TO_STAFF => [
                WorkflowSteps::STEP_OFFICE_DRAFT,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_VP_SEND_BACK_TO_STAFF => [
                WorkflowSteps::STEP_OFFICE_FINAL_CHECK,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_SEND_TO_QA_APPROVAL => [
                WorkflowSteps::STEP_OFFICE_QA_APPROVAL,
                $qaOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_QA_RETURN_TO_STAFF => [
                WorkflowSteps::STEP_OFFICE_DRAFT,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_QA_APPROVE => [
                WorkflowSteps::STEP_OFFICE_REGISTRATION,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_REGISTER => [
                WorkflowSteps::STEP_OFFICE_DISTRIBUTION,
                $ownerOfficeId,
                null,
                null,
            ],

            WorkflowSteps::ACTION_OFFICE_DISTRIBUTE => [
                WorkflowSteps::STEP_DISTRIBUTED,
                $ownerOfficeId,
                null,
                null,
            ],

            default => throw new \InvalidArgumentException("Unknown Office action: {$action}"),
        };

        return $this->transition(
            $version,
            $task,
            $user,
            $nextStep,
            $nextOfficeId,
            $nextRoleId,
            $nextUserId,
            $note,
            $effectiveDate,
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // APPLY ACTIONS — CUSTOM FLOW
    // ──────────────────────────────────────────────────────────────────────

    private function applyCustomAction(
        DocumentVersion $version,
        WorkflowTask $task,
        User $user,
        string $action,
        ?string $note,
        ?string $effectiveDate,
    ): WorkflowTask {
        $doc           = $this->doc($version);
        $ownerOfficeId = (int) ($doc->owner_office_id ?? 0);
        $customList    = $this->customOfficeList((int) $version->id);
        $curStep       = $task->step;
        $curOfficeId   = (int) ($task->assigned_office_id ?? 0);

        // Find position in custom list
        $idx         = array_search($curOfficeId, $customList, true);
        $nextInList  = ($idx !== false && isset($customList[$idx + 1]))
            ? $customList[$idx + 1]
            : null;

        [$nextStep, $nextOfficeId] = match ($action) {

            WorkflowSteps::ACTION_CUSTOM_FORWARD => (function () use (
                $curStep,
                $nextInList,
                $ownerOfficeId,
                $customList
            ) {
                return match ($curStep) {
                    // Draft → first review office
                    WorkflowSteps::STEP_CUSTOM_DRAFT =>
                    [WorkflowSteps::STEP_CUSTOM_OFFICE_REVIEW, $customList[0] ?? $ownerOfficeId],

                    // Review office → next office OR back to owner
                    WorkflowSteps::STEP_CUSTOM_OFFICE_REVIEW =>
                    $nextInList
                        ? [WorkflowSteps::STEP_CUSTOM_OFFICE_REVIEW, $nextInList]
                        : [WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER, $ownerOfficeId],

                    // Approval office → next office OR back to owner
                    WorkflowSteps::STEP_CUSTOM_OFFICE_APPROVAL =>
                    $nextInList
                        ? [WorkflowSteps::STEP_CUSTOM_OFFICE_APPROVAL, $nextInList]
                        : [WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER_APPROVAL, $ownerOfficeId],

                    default => throw new \InvalidArgumentException("CUSTOM_FORWARD not valid at step: {$curStep}"),
                };
            })(),

            // Owner manually starts approval after review
            WorkflowSteps::ACTION_CUSTOM_START_APPROVAL => [
                WorkflowSteps::STEP_CUSTOM_OFFICE_APPROVAL,
                $customList[0] ?? $ownerOfficeId,
            ],

            WorkflowSteps::ACTION_CUSTOM_REGISTER => [
                WorkflowSteps::STEP_CUSTOM_REGISTRATION,
                $ownerOfficeId,
            ],

            WorkflowSteps::ACTION_CUSTOM_DISTRIBUTE => [
                WorkflowSteps::STEP_DISTRIBUTED,
                $ownerOfficeId,
            ],

            default => throw new \InvalidArgumentException("Unknown Custom action: {$action}"),
        };

        return $this->transition(
            $version,
            $task,
            $user,
            $nextStep,
            $nextOfficeId,
            null,
            null,
            $note,
            $effectiveDate,
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // UNIVERSAL REJECT
    // ──────────────────────────────────────────────────────────────────────

    private function applyReject(
        DocumentVersion $version,
        WorkflowTask $task,
        User $user,
        string $note,
    ): WorkflowTask {
        $doc           = $this->doc($version);
        $flow          = $version->workflow_type;
        $routing       = $version->routing_mode;

        // Owner office is always the reject target
        $ownerOfficeId = $routing === 'custom' || $flow === 'office'
            ? (int) ($doc->owner_office_id ?? 0)
            : $this->qaOfficeId();

        $draftStep = $flow === 'office'
            ? WorkflowSteps::STEP_OFFICE_DRAFT
            : WorkflowSteps::STEP_QA_DRAFT;

        if ($routing === 'custom') {
            $draftStep = WorkflowSteps::STEP_CUSTOM_DRAFT;
        }

        return $this->transition(
            $version,
            $task,
            $user,
            $draftStep,
            $ownerOfficeId,
            null,
            null,
            $note,
            null,
            isReject: true,
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // CORE TRANSITION — single place that writes to DB
    // ──────────────────────────────────────────────────────────────────────

    private function transition(
        DocumentVersion $version,
        WorkflowTask $currentTask,
        User $actor,
        string $nextStep,
        int $nextOfficeId,
        ?int $nextRoleId,
        ?int $nextUserId,
        ?string $note,
        ?string $effectiveDate,
        bool $isReject = false,
    ): WorkflowTask {
        $flow       = $version->workflow_type;
        $routing    = $version->routing_mode;
        $fromStatus = $version->status;
        $isFinal    = ($nextStep === WorkflowSteps::STEP_DISTRIBUTED);

        // Resolve office code for status label
        $nextOffice     = $nextOfficeId ? Office::find($nextOfficeId) : null;
        $nextOfficeCode = $nextOffice?->code;

        $nextStatus = WorkflowSteps::statusForStep(
            $routing === 'custom' ? 'custom' : $flow,
            $nextStep,
            $nextOfficeCode,
        );

        $nextPhase = WorkflowSteps::phaseForStep($nextStep);

        // 1. Close current task
        $currentTask->status       = $isReject ? 'rejected' : 'completed';
        $currentTask->completed_at = now();
        $currentTask->save();

        // 2. If returning to draft — cancel all other open tasks on this version
        if ($isReject || in_array($nextStep, [
            WorkflowSteps::STEP_QA_DRAFT,
            WorkflowSteps::STEP_OFFICE_DRAFT,
            WorkflowSteps::STEP_CUSTOM_DRAFT,
        ], true)) {
            WorkflowTask::where('document_version_id', $version->id)
                ->where('status', 'open')
                ->where('id', '!=', $currentTask->id)
                ->update(['status' => 'cancelled', 'completed_at' => now()]);
        }

        // 3. Create next task
        $newTask = WorkflowTask::create([
            'document_version_id' => $version->id,
            'phase'               => $nextPhase,
            'step'                => $nextStep,
            'status'              => $isFinal ? 'completed' : 'open',
            'opened_at'           => now(),
            'completed_at'        => $isFinal ? now() : null,
            'assigned_office_id'  => $nextOfficeId,
            'assigned_role_id'    => $nextRoleId,
            'assigned_user_id'    => $nextUserId,
        ]);

        // 4. Update version status
        $version->status = $nextStatus;

        if ($isFinal) {
            $version->distributed_at = $version->distributed_at ?? now();
            $version->effective_date = $effectiveDate
                ?? $version->effective_date
                ?? now()->toDateString();

            // Supersede older distributed versions
            DocumentVersion::where('document_id', $version->document_id)
                ->where('id', '!=', $version->id)
                ->where('status', 'Distributed')
                ->update(['status' => 'Superseded', 'superseded_at' => now()]);
        }

        $version->save();

        // 5. Post return/reject note as message
        if ($note && ($isReject || in_array($nextStep, [
            WorkflowSteps::STEP_QA_DRAFT,
            WorkflowSteps::STEP_OFFICE_DRAFT,
            WorkflowSteps::STEP_CUSTOM_DRAFT,
        ], true))) {
            DocumentMessage::create([
                'document_version_id' => $version->id,
                'sender_user_id'      => $actor->id,
                'type'                => $isReject ? 'reject_note' : 'return_note',
                'message'             => $note,
            ]);
        }

        // 6. Notifications
        $this->notify($nextOfficeId, $actor, $version, $nextStatus, $isReject);

        // 7. Activity log
        $this->log($version, $actor, $nextOfficeId, $fromStatus, $nextStatus, $nextStep, $nextPhase, $note, $isReject);

        return $newTask;
    }

    // ──────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────

    private function openTask(DocumentVersion $version): ?WorkflowTask
    {
        return WorkflowTask::where('document_version_id', $version->id)
            ->where('status', 'open')
            ->orderByDesc('id')
            ->first();
    }

    private function doc(DocumentVersion $version): Document
    {
        return $version->document ?? $version->load('document')->document;
    }

    private function qaOfficeId(): int
    {
        return (int) Office::where('code', 'QA')->value('id');
    }

    private function customOfficeList(int $versionId): array
    {
        return DB::table('document_route_steps')
            ->where('document_version_id', $versionId)
            ->where('phase', 'review')
            ->orderBy('step_order')
            ->pluck('office_id')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /** @return array{int, ?int, ?int} [officeId, roleId, userId] */
    private function resolveVp(int $basisOfficeId): array
    {
        $vpOffice = $this->hierarchy->findVpOfficeForOfficeId($basisOfficeId);

        if (!$vpOffice) {
            throw new \RuntimeException('VP office not found for this office. Check office parent hierarchy.');
        }

        $roleId = $this->hierarchy->roleId('vp');
        $user   = $this->hierarchy->findSingleActiveUser((int) $vpOffice->id, 'vp');

        if (!$user) {
            throw new \RuntimeException('No VP user found for VP office ' . $vpOffice->code . '.');
        }

        return [(int) $vpOffice->id, $roleId, (int) $user->id];
    }

    /** @return array{int, ?int, ?int} [officeId, roleId, userId] */
    private function resolvePresident(): array
    {
        $presOffice = $this->hierarchy->findPresidentOffice();

        if (!$presOffice) {
            throw new \RuntimeException('President office not found.');
        }

        $roleId = $this->hierarchy->roleId('president');
        $user   = $this->hierarchy->findSingleActiveUser((int) $presOffice->id, 'president');

        if (!$user) {
            throw new \RuntimeException('No President user found for President office.');
        }

        return [(int) $presOffice->id, $roleId, (int) $user->id];
    }

    private function notify(
        int $officeId,
        User $actor,
        DocumentVersion $version,
        string $toStatus,
        bool $isReject,
    ): void {
        $doc       = $this->doc($version);
        $actorName = trim($actor->first_name . ' ' . $actor->last_name) ?: 'Someone';
        $office    = $officeId ? Office::find($officeId) : null;

        $title = $isReject
            ? 'Document returned for editing'
            : 'Document requires your action';

        $body = ($doc->title ?? 'A document')
            . ' is now ' . $toStatus
            . ($office ? ' • Assigned to ' . $office->code : '')
            . ' • By ' . $actorName;

        $users = User::where('office_id', $officeId)->get(['id']);

        foreach ($users as $u) {
            if ((int) $u->id === (int) $actor->id) continue;

            Notification::create([
                'user_id'             => $u->id,
                'document_id'         => $version->document_id,
                'document_version_id' => $version->id,
                'event'               => $isReject ? 'workflow.rejected' : 'workflow.assigned',
                'title'               => $title,
                'body'                => $body,
                'meta'                => ['to_status' => $toStatus],
                'read_at'             => null,
            ]);
        }
    }

    private function log(
        DocumentVersion $version,
        User $actor,
        int $targetOfficeId,
        string $fromStatus,
        string $toStatus,
        string $step,
        string $phase,
        ?string $note,
        bool $isReject,
    ): void {
        [$event, $label] = $this->resolveEventAndLabel($step, $toStatus, $isReject);

        ActivityLog::create([
            'document_id'         => $version->document_id,
            'document_version_id' => $version->id,
            'actor_user_id'       => $actor->id,
            'actor_office_id'     => $actor->office_id,
            'target_office_id'    => $targetOfficeId,
            'event'               => $event,
            'label'               => $label,
            'meta'                => [
                'from_status' => $fromStatus,
                'to_status'   => $toStatus,
                'phase'       => $phase,
                'step'        => $step,
                'note'        => $note,
            ],
        ]);
    }

    private function resolveEventAndLabel(string $step, string $toStatus, bool $isReject): array
    {
        if ($isReject) {
            return ['workflow.rejected', 'Rejected — returned to draft'];
        }

        return match ($step) {
            // QA flow
            WorkflowSteps::STEP_QA_DRAFT           => ['workflow.returned_to_draft',    'Returned to QA draft'],
            WorkflowSteps::STEP_QA_OFFICE_REVIEW   => ['workflow.sent_to_review',        'Sent to office for review'],
            WorkflowSteps::STEP_QA_VP_REVIEW       => ['workflow.forwarded_to_vp',       'Forwarded to VP for review'],
            WorkflowSteps::STEP_QA_FINAL_CHECK     => ['workflow.returned_for_check',    'VP sent back to QA for final check'],
            WorkflowSteps::STEP_QA_OFFICE_APPROVAL => ['workflow.sent_to_approval',      'Sent to office for approval'],
            WorkflowSteps::STEP_QA_VP_APPROVAL     => ['workflow.forwarded_to_vp',       'Forwarded to VP for approval'],
            WorkflowSteps::STEP_QA_PRES_APPROVAL   => ['workflow.forwarded_to_president', 'Forwarded to President for approval'],
            WorkflowSteps::STEP_QA_REGISTRATION    => ['workflow.sent_to_registration',  'President approved — sent to QA for registration'],
            WorkflowSteps::STEP_QA_DISTRIBUTION    => ['workflow.registered',            'Document registered'],

            // Office flow
            WorkflowSteps::STEP_OFFICE_DRAFT        => ['workflow.returned_to_draft',    'Returned to office draft'],
            WorkflowSteps::STEP_OFFICE_HEAD_REVIEW  => ['workflow.sent_to_review',       'Sent to office head for review'],
            WorkflowSteps::STEP_OFFICE_VP_REVIEW    => ['workflow.forwarded_to_vp',      'Forwarded to VP for review'],
            WorkflowSteps::STEP_OFFICE_FINAL_CHECK  => ['workflow.returned_for_check',   'VP sent back to office for final check'],
            WorkflowSteps::STEP_OFFICE_QA_APPROVAL  => ['workflow.sent_to_approval',     'Sent to QA for approval'],
            WorkflowSteps::STEP_OFFICE_REGISTRATION => ['workflow.sent_to_registration', 'QA approved — sent to office for registration'],
            WorkflowSteps::STEP_OFFICE_DISTRIBUTION => ['workflow.registered',           'Document registered'],

            // Custom flow
            WorkflowSteps::STEP_CUSTOM_DRAFT                  => ['workflow.returned_to_draft',    'Returned to owner draft'],
            WorkflowSteps::STEP_CUSTOM_OFFICE_REVIEW          => ['workflow.sent_to_review',        'Forwarded for review'],
            WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER          => ['workflow.returned_for_check',    'Review complete — returned to owner'],
            WorkflowSteps::STEP_CUSTOM_OFFICE_APPROVAL        => ['workflow.sent_to_approval',      'Forwarded for approval'],
            WorkflowSteps::STEP_CUSTOM_BACK_TO_OWNER_APPROVAL => ['workflow.returned_for_check',    'Approval complete — returned to owner'],
            WorkflowSteps::STEP_CUSTOM_REGISTRATION           => ['workflow.sent_to_registration',  'Sent for registration'],

            // Terminal
            WorkflowSteps::STEP_DISTRIBUTED => ['workflow.distributed', 'Document distributed'],

            default => ['workflow.action', "Advanced to {$toStatus}"],
        };
    }
}
