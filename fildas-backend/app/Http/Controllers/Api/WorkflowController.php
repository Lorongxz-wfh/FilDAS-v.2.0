<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentVersion;
use App\Models\WorkflowTask;
use App\Models\DocumentMessage;
use App\Models\Notification;
use App\Models\User;
use App\Services\OfficeHierarchyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkflowController extends Controller
{

    private function officeIdByCode(string $code): ?int
    {
        return \App\Models\Office::where('code', $code)->value('id');
    }

    private function qaOfficeId(): ?int
    {
        return $this->officeIdByCode('QA');
    }

    private function presidentOfficeId(): ?int
    {
        return $this->officeIdByCode('PO');
    }

    private function officeMini(?\App\Models\Office $o): ?array
    {
        if (!$o) return null;
        return ['id' => $o->id, 'name' => $o->name, 'code' => $o->code];
    }

    private function nextCustomOfficeId(int $versionId, string $phase, ?int $currentOfficeId): ?int
    {
        $rows = DB::table('document_route_steps')
            ->where('document_version_id', $versionId)
            ->where('phase', $phase)
            ->orderBy('step_order')
            ->get(['office_id', 'step_order']);

        if ($rows->isEmpty()) return null;

        $list = $rows->map(fn($r) => (int) $r->office_id)->values()->all();

        // If current office is in the list, advance to next; else start at first.
        $idx = null;
        if ($currentOfficeId) {
            $found = array_search((int) $currentOfficeId, $list, true);
            if ($found !== false) $idx = (int) $found;
        }

        $nextIndex = ($idx === null) ? 0 : ($idx + 1);

        return $list[$nextIndex] ?? null;
    }

    private function customOfficeList(int $versionId): array
    {
        $rows = DB::table('document_route_steps')
            ->where('document_version_id', $versionId)
            ->orderBy('step_order')
            ->limit(5)
            ->get(['office_id', 'step_order']);

        if ($rows->isEmpty()) return [];

        $list = $rows->map(fn($r) => (int) $r->office_id)->values()->all();

        // De-dupe while preserving order
        $seen = [];
        $out = [];
        foreach ($list as $oid) {
            if (!$oid) continue;
            if (isset($seen[$oid])) continue;
            $seen[$oid] = true;
            $out[] = (int) $oid;
        }

        return $out;
    }

    private function notifyOfficeUsers(
        ?int $officeId,
        int $actorUserId,
        DocumentVersion $version,
        string $event,
        string $title,
        ?string $body = null,
        ?array $meta = null
    ): void {
        if (!$officeId) return;

        // Notify only office heads for office-level steps; otherwise notify all in office.
        $q = User::query()->where('office_id', $officeId);

        $step = (string) (($meta['step'] ?? ''));

        // office review/approval should go to office head only
        $officeHeadOnlySteps = [
            // Default routing office-head steps (keep this list tight + consistent)
            'office_review',
            'office_approval',
            'office_head_review',
            'office_review_office',
            'office_approval_office',
        ];

        if (in_array($step, $officeHeadOnlySteps, true)) {
            $q->whereHas('role', fn($r) => $r->where('name', 'office_head'));
        }

        $users = $q->get(['id']);

        foreach ($users as $u) {
            // Optional: don't notify the actor themselves.
            if ((int) $u->id === (int) $actorUserId) continue;

            Notification::create([
                'user_id' => $u->id,
                'document_id' => $version->document_id,
                'document_version_id' => $version->id,
                'event' => $event,
                'title' => $title,
                'body' => $body,
                'meta' => $meta,
                'read_at' => null,
            ]);
        }
    }

    private function notifyOfficesUsers(
        array $officeIds,
        int $actorUserId,
        DocumentVersion $version,
        string $event,
        string $title,
        ?string $body = null,
        ?array $meta = null
    ): void {
        $unique = collect($officeIds)->filter()->map(fn($x) => (int) $x)->unique()->values()->all();
        foreach ($unique as $oid) {
            $this->notifyOfficeUsers($oid, $actorUserId, $version, $event, $title, $body, $meta);
        }
    }

    // GET /api/document-versions/{version}/tasks
    public function tasks(DocumentVersion $version)
    {
        $user = request()->user();
        $userOfficeId = $user?->office_id;

        if (!$userOfficeId) {
            return response()->json(['message' => 'Your account has no office assigned.'], 422);
        }

        $tasks = WorkflowTask::query()
            ->where('document_version_id', $version->id)
            ->orderByDesc('id')
            ->get();

        $hasAny = $tasks->count() > 0;

        // Invariant: tasks should be created by DocumentController@store() or by workflow actions.
        // Do NOT auto-create tasks here, because it can overwrite the intended starter flow (office vs QA).
        // If there are no tasks, return empty list; frontend should handle "no tasks yet".


        // RBAC after invariant is satisfied
        $qaOfficeId = $this->qaOfficeId();
        $presOfficeId = $this->presidentOfficeId();

        $canSeeAll =
            ((int) $userOfficeId === (int) $qaOfficeId) ||
            ((int) $userOfficeId === (int) $presOfficeId) ||
            (strtolower(trim((string) ($user?->role?->name ?? ''))) === 'admin');


        if (!$canSeeAll) {
            $hasOfficeTask = $tasks->first(function ($t) use ($userOfficeId) {
                return (int) $t->assigned_office_id === (int) $userOfficeId;
            });

            if (!$hasOfficeTask) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        return response()->json($tasks);
    }

    // GET /api/document-versions/{version}/route-steps
    public function routeSteps(DocumentVersion $version)
    {
        $user = request()->user();
        $userOfficeId = $user?->office_id;

        if (!$userOfficeId) {
            return response()->json(['message' => 'Your account has no office assigned.'], 422);
        }

        // Same visibility rule as tasks(): if you can see tasks, you can see route steps
        $qaOfficeId = $this->qaOfficeId();
        $presOfficeId = $this->presidentOfficeId();

        $canSeeAll =
            ((int) $userOfficeId === (int) $qaOfficeId) ||
            ((int) $userOfficeId === (int) $presOfficeId) ||
            (strtolower(trim((string) ($user?->role?->name ?? ''))) === 'admin');

        if (!$canSeeAll) {
            $hasOfficeTask = WorkflowTask::query()
                ->where('document_version_id', $version->id)
                ->where('assigned_office_id', $userOfficeId)
                ->exists();

            if (!$hasOfficeTask) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $rows = DB::table('document_route_steps')
            ->where('document_version_id', $version->id)
            ->orderBy('phase')
            ->orderBy('step_order')
            ->get(['phase', 'step_order', 'office_id']);

        return response()->json([
            'document_version_id' => $version->id,
            'steps' => $rows,
        ]);
    }


    // POST /api/document-versions/{version}/actions
    public function action(Request $request, DocumentVersion $version)
    {
        return DB::transaction(
            function () use ($request, $version) {
                $data = $request->validate([

                    'action' => 'required|string',
                    'note' => 'nullable|string',
                    'office_id' => 'nullable|integer|exists:offices,id', // keep temporarily for backward-compat
                    'review_office_id' => 'nullable|integer|exists:offices,id',

                    // NEW: for QA to set at distribution time (YYYY-MM-DD)
                    'effective_date' => 'nullable|date',
                ]);

                $currentTask = WorkflowTask::query()
                    ->where('document_version_id', $version->id)
                    ->where('status', 'open')
                    ->orderByDesc('id')
                    ->first();

                $user = $request->user();
                $userOfficeId = $user?->office_id;

                // For audit logs
                $fromStatus = $version->status;


                if (!$userOfficeId) {
                    return response()->json(['message' => 'Your account has no office assigned.'], 422);
                }

                if (!$currentTask) {
                    return response()->json(['message' => 'No open task found for this version.'], 422);
                }

                \Illuminate\Support\Facades\Gate::authorize('act', $currentTask);


                $flow = (string) ($version->workflow_type ?? 'qa');

                // Custom flow is enabled if any route steps exist for this version.
                // (We treat the office list as one ordered list; review+approval reuse the same list.)
                $customList = $this->customOfficeList((int) $version->id);
                $isCustom = !empty($customList);

                // Originator/creator-basis for custom flow:
                // - QA-start: QA office is the creator (final checks + registration + distribution)
                // - Office-start: owner office is the creator (for now, it also registers/distributes)
                $ownerOfficeId = (int) ($version->document()->value('owner_office_id') ?? 0);
                $qaOfficeIdForCreator = (int) ($this->qaOfficeId() ?? 0);

                $creatorOfficeId = ($flow === 'qa')
                    ? $qaOfficeIdForCreator
                    : $ownerOfficeId;


                // Custom flow should still display STANDARD statuses in the UI,
                // but routing (who acts next) is driven by the task.step + assigned_office_id.
                $customStatusByStep = [
                    'draft' => 'Draft',

                    // Review loop across custom offices (office-specific string computed below)
                    'custom_review_office' => 'For Office Review',
                    'custom_review_back_to_originator' => 'For Creator Check',

                    // Approval loop across custom offices (office-specific string computed below)
                    'custom_approval_office' => 'For Office Approval',
                    'custom_approval_back_to_originator' => 'For Creator Final',

                    // Creator handles these in custom flow
                    'custom_registration' => 'For Registration',
                    'custom_distribution' => 'For Distribution',

                    'distributed' => 'Distributed',
                ];



                $mapQa = [
                    // Review (QA-start)
                    'SEND_TO_OFFICE_REVIEW' => [
                        'status' => 'For Office Review',
                        'phase' => 'review',
                        'step' => 'office_review',
                    ],
                    'FORWARD_TO_VP_REVIEW' => [
                        'status' => 'For VP Review',
                        'phase' => 'review',
                        'step' => 'vp_review',
                    ],
                    'VP_SEND_BACK_TO_QA_FINAL_CHECK' => [
                        'status' => 'For QA Final Check',
                        'phase' => 'review',
                        'step' => 'qafinalcheck',
                    ],
                    'START_OFFICE_APPROVAL' => [
                        'status' => 'For Office Approval',
                        'phase' => 'approval',
                        'step' => 'office_approval',
                    ],
                    'FORWARD_TO_VP_APPROVAL' => [
                        'status' => 'For VP Approval',
                        'phase' => 'approval',
                        'step' => 'vp_approval',
                    ],
                    'FORWARD_TO_PRESIDENT_APPROVAL' => [
                        'status' => 'For President Approval',
                        'phase' => 'approval',
                        'step' => 'pres_approval',
                    ],
                    'FORWARD_TO_QA_REGISTRATION' => [
                        'status' => 'For QA Registration',
                        'phase' => 'registration',
                        'step' => 'qa_registration',
                    ],
                    'FORWARD_TO_QA_DISTRIBUTION' => [
                        'status' => 'For QA Distribution',
                        'phase' => 'registration',
                        'step' => 'qa_distribution',
                    ],
                    'MARK_DISTRIBUTED' => [
                        'status' => 'Distributed',
                        'phase' => 'registration',
                        'step' => 'distributed',
                    ],
                    'RETURN_TO_QA_EDIT' => [
                        'status' => 'Draft',
                        'phase' => 'review',
                        'step' => 'draft',
                        'return' => true,
                    ],
                ];

                $mapOffice = [
                    // Review (Office-start)
                    // NOTE: Office draft creation should set workflow_type='office' (we’ll wire that next).
                    'FORWARD_TO_OFFICE_HEAD_REVIEW' => [
                        'status' => 'For Office Head Review',
                        'phase' => 'review',
                        'step' => 'office_head_review',
                    ],
                    'FORWARD_TO_VP_REVIEW' => [
                        'status' => 'For VP Review (Office)',
                        'phase' => 'review',
                        'step' => 'vp_review_office',
                    ],
                    'VP_FORWARD_TO_QA_APPROVAL' => [
                        'status' => 'For QA Approval (Office)',
                        'phase' => 'review',
                        'step' => 'qa_approval_office',
                    ],

                    // Approval (still distinct to avoid ambiguity)
                    'START_OFFICE_APPROVAL' => [
                        'status' => 'For Office Approval (Office)',
                        'phase' => 'approval',
                        'step' => 'office_approval_office',
                    ],
                    'FORWARD_TO_VP_APPROVAL' => [
                        'status' => 'For VP Approval (Office)',
                        'phase' => 'approval',
                        'step' => 'vp_approval_office',
                    ],
                    'FORWARD_TO_PRESIDENT_APPROVAL' => [
                        'status' => 'For President Approval (Office)',
                        'phase' => 'approval',
                        'step' => 'pres_approval_office',
                    ],
                    'FORWARD_TO_QA_REGISTRATION' => [
                        'status' => 'For QA Registration (Office)',
                        'phase' => 'registration',
                        'step' => 'qa_registration_office',
                    ],
                    'FORWARD_TO_QA_DISTRIBUTION' => [
                        'status' => 'For QA Distribution (Office)',
                        'phase' => 'registration',
                        'step' => 'qa_distribution_office',
                    ],
                    'MARK_DISTRIBUTED' => [
                        'status' => 'Distributed',
                        'phase' => 'registration',
                        'step' => 'distributed',
                    ],

                    'RETURN_TO_OFFICE_EDIT' => [
                        'status' => 'Office Draft',
                        'phase' => 'review',
                        'step' => 'office_draft',
                        'return' => true,
                    ],

                ];

                $map = $flow === 'office' ? $mapOffice : $mapQa;

                // Accept frontend action codes (no underscores) by normalizing to backend keys.
                $actionRaw = strtoupper(trim((string) ($data['action'] ?? '')));

                $aliases = [
                    // QA-start (frontend => backend)
                    'SENDTOOFFICEREVIEW' => 'SEND_TO_OFFICE_REVIEW',
                    'FORWARDTOVPREVIEW' => 'FORWARD_TO_VP_REVIEW',
                    'VPSENDBACKTOQAFINALCHECK' => 'VP_SEND_BACK_TO_QA_FINAL_CHECK',
                    'STARTOFFICEAPPROVAL' => 'START_OFFICE_APPROVAL',
                    'FORWARDTOVPAPPROVAL' => 'FORWARD_TO_VP_APPROVAL',
                    'FORWARDTOPRESIDENTAPPROVAL' => 'FORWARD_TO_PRESIDENT_APPROVAL',
                    'FORWARDTOQAREGISTRATION' => 'FORWARD_TO_QA_REGISTRATION',
                    'FORWARDTOQADISTRIBUTION' => 'FORWARD_TO_QA_DISTRIBUTION',
                    'MARKDISTRIBUTED' => 'MARK_DISTRIBUTED',
                    'RETURNTOQAEDIT' => 'RETURN_TO_QA_EDIT',

                    // Office-start (frontend => backend)
                    'FORWARDTOOFFICEHEADREVIEW' => 'FORWARD_TO_OFFICE_HEAD_REVIEW',
                    'VPFORWARDTOQAAPPROVAL' => 'VP_FORWARD_TO_QA_APPROVAL',
                    'RETURNTOOFFICEEDIT' => 'RETURN_TO_OFFICE_EDIT',
                ];

                $actionKey = $aliases[$actionRaw] ?? $actionRaw;

                if (!isset($map[$actionKey])) {
                    return response()->json([
                        'message' => 'Unknown action.',
                        'action_received' => $actionRaw,
                        'action_mapped' => $actionKey,
                    ], 422);
                }

                $target = $map[$actionKey];

                // Keep downstream code working (notifications/meta checks use $data['action'])
                $data['action'] = $actionKey;


                // Custom flow: reinterpret actions.
                // - Any "return" action returns to originator for editing (note required).
                // - Any forward/approve action advances to the next custom step.
                if ($isCustom) {
                    $isReturnAction = !empty($target['return']);

                    if ($isReturnAction) {
                        $target = [
                            'status' => 'Draft', // keep Draft as edit state, but assigned to originator (not QA)
                            'phase' => 'review', // IMPORTANT: workflow_tasks.phase enum doesn't allow 'draft'
                            'step' => 'draft',
                            'return' => true,
                        ];
                    } else {
                        // We'll compute the exact next custom step later using currentTask->step + list position.
                        // Put placeholders for now.
                        $target = [
                            'status' => $version->status, // will be overwritten
                            'phase' => $currentTask->phase ?? 'review',
                            'step' => $currentTask->step ?? 'draft',
                        ];
                    }
                }

                $hasCustomReviewRouteAny = DB::table('document_route_steps')
                    ->where('document_version_id', $version->id)
                    ->where('phase', 'review')
                    ->exists();

                if ($data['action'] === 'SEND_TO_OFFICE_REVIEW' && !$hasCustomReviewRouteAny) {
                    // Prefer explicit review_office_id; fallback to office_id; final fallback to the doc's owner_office_id
                    $docModel = $version->document()->first();

                    $pickedOfficeId =
                        (int) ($data['review_office_id'] ?? 0) ? (int) $data['review_office_id']
                        : ((int) ($data['office_id'] ?? 0) ? (int) $data['office_id']
                            : (int) ($docModel?->owner_office_id ?? 0));

                    if ($pickedOfficeId <= 0) {
                        return response()->json(['message' => 'review_office_id (or doc owner office) is required to send to office review.'], 422);
                    }

                    if ($docModel) {
                        $docModel->review_office_id = $pickedOfficeId;
                        $docModel->save();
                    }
                }



                // If this is a return action, require note BEFORE mutating anything
                if (!empty($target['return'])) {
                    $note = trim((string) ($data['note'] ?? ''));
                    if ($note === '') {
                        return response()->json(['message' => 'Return note is required.'], 422);
                    }
                }


                // QA-flow guards should not apply to custom routing
                if (!$isCustom) {
                    // QA-flow only: enforce VP -> QA final check before approval phase
                    if ($flow === 'qa' && $version->status === 'For VP Review' && $data['action'] === 'START_OFFICE_APPROVAL') {
                        return response()->json(['message' => 'VP must send back to QA for final check before approval phase.'], 422);
                    }

                    if ($flow === 'qa' && $version->status === 'For QA Final Check' && $data['action'] !== 'START_OFFICE_APPROVAL' && $data['action'] !== 'RETURN_TO_QA_EDIT') {
                        return response()->json(['message' => 'QA final check: only start approval or return to QA edit.'], 422);
                    }
                }


                // Close previous open task (if any)
                $closingStatus = !empty($target['return']) ? 'returned' : 'completed';

                WorkflowTask::query()
                    ->where('document_version_id', $version->id)
                    ->where('status', 'open')
                    ->update([
                        'status' => $closingStatus,
                        'completed_at' => now(),
                    ]);


                // Create new task (assigned_* can be refined later)
                $doc = $version->document()->with(['ownerOffice', 'reviewOffice.parentOffice'])->first();

                // QA-flow uses review_office_id; Office-flow uses owner_office_id.
                $officeOfficeId = $doc?->review_office_id ?? $doc?->owner_office_id;

                // VP assignment is resolved later using OfficeHierarchyService + cluster_kind='vp'.
                // (Do not use direct parent_office_id here; org depth can be > 1.)
                $vpOfficeId = null;


                $qaOfficeId = $this->qaOfficeId();
                $presOfficeId = $this->presidentOfficeId();

                // 1) Compute default assignment using your existing logic
                $assignedOfficeId = match ($target['step']) {
                    // QA flow
                    'draft' => $qaOfficeId,
                    'office_review', 'office_approval' => $officeOfficeId,
                    'vp_review', 'vp_approval' => null, // resolved later via OfficeHierarchyService
                    'pres_approval' => $presOfficeId,
                    'qafinalcheck', 'qa_registration', 'qa_distribution', 'distributed' => $qaOfficeId,

                    // Office-start flow
                    'office_draft' => $officeOfficeId,
                    'office_head_review' => $officeOfficeId, // notifyOfficeUsers() filters office_head
                    'vp_review_office' => null, // resolved later via OfficeHierarchyService
                    'qa_approval_office' => $qaOfficeId,

                    // If you keep Office-flow approval statuses
                    'office_approval_office' => $officeOfficeId,
                    'vp_approval_office' => null, // resolved later via OfficeHierarchyService
                    'pres_approval_office' => $presOfficeId,
                    'qa_registration_office', 'qa_distribution_office' => $qaOfficeId,

                    default => null,
                };

                // 2) Custom routing engine (authoritative)
                if ($isCustom) {
                    $curStep = (string) ($currentTask?->step ?? 'draft');
                    $curOffice = (int) ($currentTask?->assigned_office_id ?? 0);
                    $isReturn = !empty($target['return']);

                    if ($isReturn) {
                        // Return for edit: always originator
                        $assignedOfficeId = $creatorOfficeId > 0 ? $creatorOfficeId : $assignedOfficeId;
                        $target['step'] = 'draft';
                        $target['phase'] = 'review'; // IMPORTANT: workflow_tasks.phase enum doesn't allow 'draft'
                        $target['status'] = 'Draft';
                    } else {
                        // Advance
                        $nextStep = null;
                        $nextOfficeId = null;

                        // Helper: next office in list given current office
                        $idx = array_search($curOffice, $customList, true);
                        $nextOfficeInList = ($idx === false) ? ($customList[0] ?? null) : ($customList[$idx + 1] ?? null);

                        if ($curStep === 'draft') {
                            $nextStep = 'custom_review_office';
                            $nextOfficeId = $customList[0] ?? null;
                        } elseif ($curStep === 'custom_review_office') {
                            if ($nextOfficeInList) {
                                $nextStep = 'custom_review_office';
                                $nextOfficeId = $nextOfficeInList;
                            } else {
                                $nextStep = 'custom_review_back_to_originator';
                                $nextOfficeId = $creatorOfficeId ?: null;
                            }
                        } elseif ($curStep === 'custom_review_back_to_originator') {
                            $nextStep = 'custom_approval_office';
                            $nextOfficeId = $customList[0] ?? null;
                        } elseif ($curStep === 'custom_approval_office') {
                            if ($nextOfficeInList) {
                                $nextStep = 'custom_approval_office';
                                $nextOfficeId = $nextOfficeInList;
                            } else {
                                $nextStep = 'custom_approval_back_to_originator';
                                $nextOfficeId = $creatorOfficeId ?: null;
                            }
                        } elseif ($curStep === 'custom_approval_back_to_originator') {
                            $nextStep = 'custom_registration';
                            $nextOfficeId = $creatorOfficeId ?: null;
                        } elseif ($curStep === 'custom_registration') {
                            $nextStep = 'custom_distribution';
                            $nextOfficeId = $creatorOfficeId ?: null;
                        } elseif ($curStep === 'custom_distribution') {
                            $nextStep = 'distributed';
                            $nextOfficeId = $creatorOfficeId ?: null; // final; assigned office doesn't matter much
                        } else {
                            // Unknown custom state: land safely on originator Draft
                            $nextStep = 'draft';
                            $nextOfficeId = $creatorOfficeId ?: null;
                        }

                        if ($nextOfficeId) $assignedOfficeId = $nextOfficeId;

                        $target['step'] = $nextStep;
                        $target['phase'] = match ($nextStep) {
                            'draft' => 'review', // IMPORTANT: keep enum-valid value
                            'custom_review_office', 'custom_review_back_to_originator' => 'review',
                            'custom_approval_office', 'custom_approval_back_to_originator' => 'approval',
                            'custom_registration', 'custom_distribution' => 'registration',
                            'distributed' => 'registration', // IMPORTANT: phase enum doesn't include 'distributed'
                            default => 'review',
                        };


                        if ($nextStep === 'custom_review_office') {
                            $code = \App\Models\Office::where('id', (int) $assignedOfficeId)->value('code');
                            $target['status'] = $code ? ("For {$code} Review") : 'For Office Review';
                        } elseif ($nextStep === 'custom_approval_office') {
                            $code = \App\Models\Office::where('id', (int) $assignedOfficeId)->value('code');
                            $target['status'] = $code ? ("For {$code} Approval") : 'For Office Approval';
                        } else {
                            $target['status'] = $customStatusByStep[$nextStep] ?? $version->status;
                        }
                    }
                }

                // half

                // Role/user-specific assignment (enforce "VP itself" and "President itself")
                $assignedRoleId = null;
                $assignedUserId = null;

                $hier = resolve(OfficeHierarchyService::class);

                $vpRoleId = $hier->roleId('vp');
                $presRoleId = $hier->roleId('president');

                // Compute office that represents the VP cluster head for this doc's "office" basis
                $basisOfficeId = (int) ($officeOfficeId ?? 0);
                $vpOffice = $hier->findVpOfficeForOfficeId($basisOfficeId);
                $presOffice = $hier->findPresidentOffice();

                if (in_array($target['step'], ['vp_review', 'vp_approval', 'vp_review_office', 'vp_approval_office'], true)) {
                    if (!$vpOffice) {
                        return response()->json(['message' => 'VP office not found for this office (check office parent hierarchy + cluster_kind).'], 422);
                    }

                    $assignedOfficeId = (int) $vpOffice->id;
                    $assignedRoleId = $vpRoleId;

                    $vpUser = $hier->findSingleActiveUser((int) $vpOffice->id, 'vp');
                    if (!$vpUser) {
                        return response()->json(['message' => 'No VP user found for the VP office. Create a user with role=vp assigned to that VP office.'], 422);
                    }
                    $assignedUserId = (int) $vpUser->id;
                }

                if (in_array($target['step'], ['pres_approval', 'pres_approval_office'], true)) {
                    if (!$presOffice) {
                        return response()->json(['message' => 'President office not found (cluster_kind=president).'], 422);
                    }

                    $assignedOfficeId = (int) $presOffice->id;
                    $assignedRoleId = $presRoleId;

                    $presUser = $hier->findSingleActiveUser((int) $presOffice->id, 'president');
                    if (!$presUser) {
                        return response()->json(['message' => 'No President user found for the President office. Create a user with role=president assigned to PO.'], 422);
                    }
                    $assignedUserId = (int) $presUser->id;
                }

                // Resolve target office model (used by notifications + response payload)
                $targetOffice = null;
                if (!empty($assignedOfficeId)) {
                    $targetOffice = \App\Models\Office::find((int) $assignedOfficeId);
                }


                // Phase-aware message generator (panel requirement)
                $actionVerb = match ($target['phase']) {
                    'review' => 'Accepted and forwarded',
                    'approval' => 'Approved and sent',
                    'registration' => 'Forwarded',
                    default => 'Forwarded',
                };

                if (!empty($target['return'])) {
                    $actionVerb = 'Returned';
                }

                $officeLabel = $targetOffice
                    ? ($targetOffice->name . ' (' . $targetOffice->code . ')')
                    : 'the next office';

                $actionMessage = !empty($target['return'])
                    ? ($isCustom ? 'Return to originator for editing?' : ($flow === 'office' ? 'Return to Office draft for editing?' : 'Return to QA for editing?'))
                    : ($actionVerb . ' to ' . $officeLabel . '. Proceed?');



                $isFinal = ($target['step'] === 'distributed' || $target['status'] === 'Distributed');

                // Create notifications for the office that will receive / act next.
                // This is the missing piece why Inbox is empty.
                $actorName = trim(($user?->first_name ?? '') . ' ' . ($user?->last_name ?? ''));
                $actorName = $actorName !== '' ? $actorName : 'Someone';

                $notifTitle = 'Document requires action';
                $notifBody =
                    ($doc?->title ?? 'A document')
                    . ' is now ' . $target['status']
                    . ($targetOffice ? (' • Assigned to ' . $targetOffice->code) : '')
                    . ' • By ' . $actorName;


                $this->notifyOfficeUsers(
                    $assignedOfficeId,
                    (int) $request->user()->id,
                    $version,
                    'workflow.assigned',
                    $notifTitle,
                    $notifBody,
                    [
                        'action' => $data['action'],
                        'from_status' => $fromStatus,
                        'to_status' => $target['status'],
                        'phase' => $target['phase'] ?? null,
                        'step' => $target['step'] ?? null,
                        'target_office_id' => $assignedOfficeId,
                    ]
                );

                WorkflowTask::create([
                    'document_version_id' => $version->id,
                    'phase' => $target['phase'],
                    'step' => $target['step'],
                    'status' => $isFinal ? 'completed' : 'open',
                    'opened_at' => now(),
                    'completed_at' => $isFinal ? now() : null,
                    'assigned_office_id' => $assignedOfficeId,
                    'assigned_role_id' => $assignedRoleId,
                    'assigned_user_id' => $assignedUserId,
                ]);

                // Update the version status for UI
                $version->status = $target['status'];
                $version->save();
                if ($target['status'] === 'Distributed') {
                    // Always set distributed_at once
                    if (!$version->distributed_at) {
                        $version->distributed_at = now();
                    }

                    // Actor can set effective_date at distribution; if not provided and still null, default to today
                    $incomingEffective = $data['effective_date'] ?? null;

                    if ($incomingEffective) {
                        $version->effective_date = $incomingEffective; // expects YYYY-MM-DD
                    } elseif (!$version->effective_date) {
                        $version->effective_date = now()->toDateString();
                    }

                    $version->save();
                }

                if ($target['status'] === 'Distributed') {
                    $doc = $version->document()->first();
                    if ($doc) {
                        $doc->description = $version->description;
                        $doc->save();
                    }
                }

                if ($target['status'] === 'Distributed') {
                    $officeIdsToNotify = [
                        $doc?->owner_office_id,
                        $doc?->review_office_id,
                    ];

                    $this->notifyOfficesUsers(
                        $officeIdsToNotify,
                        (int) $request->user()->id,
                        $version,
                        'workflow.distributed',
                        'Document distributed',
                        ($doc?->title ?? 'A document') . ' has been distributed as an official version.',
                        [
                            'action' => $data['action'],
                            'from_status' => $fromStatus,
                            'to_status' => $version->status,
                            'version_number' => $version->version_number,
                        ]
                    );
                }


                // If QA is registering this version, it becomes the official one.
                // If it's a revision, supersede any previously Distributed version of the same document.
                if ($target['status'] === 'For Registration' || $target['status'] === 'For QA Registration') {
                    $docId = $version->document_id;

                    // Supersede older distributed versions (keep history, but mark as superseded)
                    DocumentVersion::query()
                        ->where('document_id', $docId)
                        ->where('id', '!=', $version->id)
                        ->where('status', 'Distributed')
                        ->update([
                            'status' => 'Superseded',
                            'superseded_at' => now(),
                        ]);


                    // Optional: if you have a registered_at column, set it here.
                    // $version->registered_at = now();
                    // $version->save();
                }


                if (!empty($target['return'])) {
                    $note = trim((string) ($data['note'] ?? ''));


                    DocumentMessage::create([
                        'document_version_id' => $version->id,
                        'sender_user_id' => $request->user()->id,
                        'type' => 'return_note',
                        'message' => $note,
                    ]);

                    $returnTargetOfficeId = ($flow === 'office') ? $officeOfficeId : $qaOfficeId;

                    // Custom flow: returns always go back to creator office
                    $hasAnyCustomRoute = DB::table('document_route_steps')
                        ->where('document_version_id', $version->id)
                        ->exists();

                    if ($hasAnyCustomRoute && !empty($doc?->owner_office_id)) {
                        $returnTargetOfficeId = (int) $doc->owner_office_id;
                    }

                    $this->notifyOfficeUsers(
                        $returnTargetOfficeId,
                        (int) $request->user()->id,
                        $version,
                        'workflow.returned',
                        'Returned for editing',
                        ($doc?->title ?? 'A document')
                            . ($hasAnyCustomRoute
                                ? ' was returned to the creator office for editing. Note: '
                                : ($flow === 'office'
                                    ? ' was returned to the Office for editing. Note: '
                                    : ' was returned to QA for editing. Note: '))
                            . $note,

                        [
                            'action' => $data['action'],
                            'from_status' => $fromStatus,
                            'to_status' => $target['status'],
                            'note' => $note,
                        ]
                    );


                    \App\Models\ActivityLog::create([
                        'document_id' => $version->document_id,
                        'document_version_id' => $version->id,
                        'actor_user_id' => $request->user()->id,
                        'actor_office_id' => $request->user()->office_id,
                        'target_office_id' => $assignedOfficeId,
                        'event' => 'message.posted',
                        'label' => 'Posted a return note',
                        'meta' => [
                            'type' => 'return_note',
                            'from_status' => $fromStatus,
                            'to_status' => $version->status,
                            'action' => $data['action'],
                        ],
                    ]);
                }

                \App\Models\ActivityLog::create([
                    'document_id' => $version->document_id,
                    'document_version_id' => $version->id,
                    'actor_user_id' => $request->user()->id,
                    'actor_office_id' => $request->user()->office_id,
                    'target_office_id' => $assignedOfficeId,
                    'event' => 'workflow.action',
                    'label' => !empty($target['return'])
                        ? ($flow === 'office' ? 'Returned to Office for editing' : 'Returned to QA for editing')
                        : ($actionVerb . ' to ' . $officeLabel),
                    'meta' => [
                        'action' => $data['action'],
                        'note' => $data['note'] ?? null,
                        'from_status' => $fromStatus,
                        'to_status' => $version->status,
                        'phase' => $target['phase'] ?? null,
                        'step' => $target['step'] ?? null,
                        'workflow_task_id' => $currentTask?->id,
                    ],
                ]);

                return response()->json([
                    'message' => 'Workflow updated.',
                    'version' => $version->fresh(),
                    'action_message' => $actionMessage,
                    'target_office' => $this->officeMini($targetOffice),
                ]);
            }
        );
    }

    // GET /api/work-queue
    public function workQueue(Request $request)
    {
        $user = $request->user();
        $userOfficeId = $user?->office_id;

        if (!$userOfficeId) {
            return response()->json(['message' => 'Your account has no office assigned.'], 422);
        }

        $qaOfficeId = $this->qaOfficeId();
        $isQaOffice = ((int) $userOfficeId === (int) $qaOfficeId);

        // 1) Tasks requiring my action (always)
        $assignedTasks = WorkflowTask::query()
            ->where('status', 'open')
            ->where('assigned_office_id', $userOfficeId)
            ->with(['version.document.ownerOffice'])
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $assigned = $assignedTasks->map(function ($t) {
            return [
                'task' => $t,
                'version' => $t->version,
                'document' => $t->version?->document,
                'can_act' => true,
            ];
        })->values();

        // 2) QA monitoring (view-only)
        $monitoring = collect();

        if ($isQaOffice) {
            $monitorVersions = DocumentVersion::query()
                ->whereHas('document', function ($q) use ($user) {
                    $q->where('created_by', $user->id);
                })
                ->with([
                    'document.ownerOffice',
                    'tasks' => function ($q) {
                        $q->orderByDesc('id');
                    },
                ])
                ->orderByDesc('id')
                ->limit(50)
                ->get();

            $monitoring = $monitorVersions->map(function ($v) use ($userOfficeId) {
                $openTask = $v->tasks->firstWhere('status', 'open');

                // If it’s assigned to QA, it belongs in “Assigned to me”
                if ($openTask && (int) $openTask->assigned_office_id === (int) $userOfficeId) {
                    return null;
                }

                return [
                    'task' => $openTask,
                    'version' => $v,
                    'document' => $v->document,
                    'can_act' => false,
                ];
            })->filter()->values();
        }

        return response()->json([
            'assigned' => $assigned,
            'monitoring' => $monitoring,
        ]);
    }
}
