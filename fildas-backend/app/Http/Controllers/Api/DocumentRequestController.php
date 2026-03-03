<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\User;
use App\Services\DocumentRequests\DocumentRequestFileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class DocumentRequestController extends Controller
{
    public function __construct(private DocumentRequestFileService $files) {}

    private function roleName(Request $request): string
    {
        $user = $request->user();

        // Support multiple user schemas:
        // - users.role (string) or users.role_name (string)
        // - users.role_id with relationship role()->name
        // - role loaded as relation (role->name)
        $raw =
            // Prefer relationship name if it exists
            (optional($user?->role)->name ?? null) ??
            // Fallback to string columns if your schema uses them
            ($user?->role_name ?? null) ??
            ($user?->role ?? null) ??
            '';


        return strtolower(trim((string) $raw));
    }



    private function assertQaOrSysadmin(Request $request): void
    {
        $role = $this->roleName($request);
        if (!in_array($role, ['qa', 'sysadmin', 'admin'], true)) {
            abort(403, 'Forbidden.');
        }
    }


    // GET /api/document-requests (QA/SYSADMIN/ADMIN)
    public function index(Request $request)
    {

        // \Log::info('document-requests index auth debug', [
        //     'user_id' => $request->user()?->id,
        //     'office_id' => $request->user()?->office_id,
        //     'role_col' => $request->user()?->role ?? null,
        //     'role_name_col' => $request->user()?->role_name ?? null,
        //     'role_rel_name' => $request->user()?->role?->name ?? null,
        //     'roleName()' => $this->roleName($request),
        // ]);

        $this->assertQaOrSysadmin($request);

        $data = $request->validate([
            'status' => 'nullable|in:open,closed,cancelled',
            'q' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $perPage = (int) ($data['per_page'] ?? 25);

        $q = DB::table('document_requests')
            ->orderByDesc('id');

        if (!empty($data['status'])) {
            $q->where('status', $data['status']);
        }

        if (!empty($data['q'])) {
            $term = trim($data['q']);
            $q->where(function ($qq) use ($term) {
                $qq->where('title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        }

        return response()->json($q->paginate($perPage));
    }

    // GET /api/compliance-requests/inbox (office users)
    public function inbox(Request $request)
    {
        $user = $request->user();
        $officeId = (int) ($user?->office_id ?? 0);
        if ($officeId <= 0) {
            return response()->json(['message' => 'Your account has no office assigned.'], 422);
        }

        $data = $request->validate([
            'q' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);
        $perPage = (int) ($data['per_page'] ?? 25);

        $q = DB::table('document_requests as r')
            ->join('document_request_recipients as rr', 'rr.request_id', '=', 'r.id')
            ->where('rr.office_id', $officeId)
            ->orderByDesc('r.id')
            ->select([
                'r.*',
                'rr.id as recipient_id',
                'rr.status as recipient_status',
                'rr.last_submitted_at',
                'rr.last_reviewed_at',
            ]);

        if (!empty($data['q'])) {
            $term = trim($data['q']);
            $q->where(function ($qq) use ($term) {
                $qq->where('r.title', 'like', "%{$term}%")
                    ->orWhere('r.description', 'like', "%{$term}%");
            });
        }

        return response()->json($q->paginate($perPage));
    }

    // GET /api/compliance-requests/{request}
    public function show(Request $request, int $requestId)
    {
        $user = $request->user();
        $role = $this->roleName($request);
        $officeId = (int) ($user?->office_id ?? 0);

        $row = DB::table('document_requests')->where('id', $requestId)->first();
        if (!$row) return response()->json(['message' => 'Not found'], 404);

        $isQa = in_array($role, ['qa', 'sysadmin', 'admin'], true);

        if (!$isQa) {
            if ($officeId <= 0) return response()->json(['message' => 'Forbidden.'], 403);

            $isRecipient = DB::table('document_request_recipients')
                ->where('request_id', $requestId)
                ->where('office_id', $officeId)
                ->exists();

            if (!$isRecipient) return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Path A bridge:
        // This endpoint should represent a single office per request.
        // For now, return exactly one recipient row:
        // - QA sees the only recipient
        // - Office user sees their own recipient row
        $recipientQ = DB::table('document_request_recipients as rr')
            ->join('offices as o', 'o.id', '=', 'rr.office_id')
            ->where('rr.request_id', $requestId)
            ->select([
                'rr.*',
                'o.name as office_name',
                'o.code as office_code',
            ]);

        if (!$isQa) {
            $recipientQ->where('rr.office_id', $officeId);
        }

        $recipient = $recipientQ->first();
        if (!$recipient) return response()->json(['message' => 'Recipient not found'], 404);

        // Attach office info directly on the request payload for the UI
        $requestPayload = (array) $row;
        $requestPayload['office_id'] = (int) ($recipient->office_id ?? 0);
        $requestPayload['office_name'] = $recipient->office_name ?? null;
        $requestPayload['office_code'] = $recipient->office_code ?? null;

        // Submission history (keep history): last 10 attempts for this recipient
        $submissions = DB::table('document_request_submissions as s')
            ->where('s.recipient_id', (int) $recipient->id)
            ->orderByDesc('s.attempt_no')
            ->orderByDesc('s.id')
            ->limit(10)
            ->get();

        $submissionIds = $submissions->pluck('id')->map(fn($v) => (int) $v)->values();

        $filesBySubmission = collect();
        if ($submissionIds->count() > 0) {
            $filesBySubmission = DB::table('document_request_submission_files as f')
                ->whereIn('f.submission_id', $submissionIds->all())
                ->orderBy('f.id')
                ->get()
                ->groupBy('submission_id');
        }

        $submissionsPayload = $submissions->map(function ($s) use ($filesBySubmission) {
            $files = ($filesBySubmission[(int) $s->id] ?? collect())->map(function ($f) {
                return [
                    'id' => (int) $f->id,
                    'original_filename' => $f->original_filename,
                    'file_path' => $f->file_path,
                    'preview_path' => $f->preview_path,
                    'mime' => $f->mime,
                    'size_bytes' => (int) ($f->size_bytes ?? 0),
                    'created_at' => $f->created_at,
                ];
            })->values();

            return [
                'id' => (int) $s->id,
                'recipient_id' => (int) $s->recipient_id,
                'attempt_no' => (int) ($s->attempt_no ?? 0),
                'status' => $s->status,
                'note' => $s->note,
                'submitted_by_user_id' => (int) ($s->submitted_by_user_id ?? 0),
                'qa_reviewed_by_user_id' => $s->qa_reviewed_by_user_id ? (int) $s->qa_reviewed_by_user_id : null,
                'qa_review_note' => $s->qa_review_note,
                'reviewed_at' => $s->reviewed_at,
                'created_at' => $s->created_at,
                'updated_at' => $s->updated_at,
                'files' => $files,
            ];
        })->values();


        // Latest submission for this recipient (if any)
        $latestSubmission = DB::table('document_request_submissions as s')
            ->where('s.recipient_id', (int) $recipient->id)
            ->orderByDesc('s.attempt_no')
            ->orderByDesc('s.id')
            ->first();

        $latestSubmissionPayload = null;

        if ($latestSubmission) {
            $files = DB::table('document_request_submission_files')
                ->where('submission_id', (int) $latestSubmission->id)
                ->orderBy('id')
                ->get()
                ->map(function ($f) {
                    return [
                        'id' => (int) $f->id,
                        'original_filename' => $f->original_filename,
                        'file_path' => $f->file_path,
                        'preview_path' => $f->preview_path,
                        'mime' => $f->mime,
                        'size_bytes' => (int) ($f->size_bytes ?? 0),
                        'created_at' => $f->created_at,
                    ];
                })
                ->values();

            $latestSubmissionPayload = [
                'id' => (int) $latestSubmission->id,
                'recipient_id' => (int) $latestSubmission->recipient_id,
                'attempt_no' => (int) ($latestSubmission->attempt_no ?? 0),
                'status' => $latestSubmission->status,
                'note' => $latestSubmission->note,
                'submitted_by_user_id' => (int) ($latestSubmission->submitted_by_user_id ?? 0),
                'qa_reviewed_by_user_id' => $latestSubmission->qa_reviewed_by_user_id ? (int) $latestSubmission->qa_reviewed_by_user_id : null,
                'qa_review_note' => $latestSubmission->qa_review_note,
                'reviewed_at' => $latestSubmission->reviewed_at,
                'created_at' => $latestSubmission->created_at,
                'updated_at' => $latestSubmission->updated_at,
                'files' => $files,
            ];
        }

        return response()->json([
            'request' => $requestPayload,
            'recipient' => $recipient,
            'latest_submission' => $latestSubmissionPayload,
            'submissions' => $submissionsPayload,
        ]);
    }

    // POST /api/compliance-requests (QA/SYSADMIN)
    public function store(Request $request)
    {
        $this->assertQaOrSysadmin($request);

        $data = $request->validate([
            'title' => 'required|string|max:180',
            'description' => 'nullable|string',
            'due_at' => 'nullable|date',

            'office_ids' => 'required|array|min:1|max:50',
            'office_ids.*' => 'integer|exists:offices,id',

            'example_file' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($request, $data, $user) {
            $now = now();

            $requestId = DB::table('document_requests')->insertGetId([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'due_at' => $data['due_at'] ?? null,
                'status' => 'open',
                'created_by_user_id' => $user->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Example file (optional)
            if ($request->hasFile('example_file')) {
                $payload = $this->files->saveRequestExampleFile($requestId, $request->file('example_file'));

                DB::table('document_requests')
                    ->where('id', $requestId)
                    ->update([
                        'example_original_filename' => $payload['original_filename'],
                        'example_file_path' => $payload['file_path'],
                        'example_preview_path' => $payload['preview_path'],
                        'updated_at' => now(),
                    ]);
            }

            // Recipients
            $officeIds = array_values(array_unique(array_map('intval', $data['office_ids'] ?? [])));
            foreach ($officeIds as $oid) {
                DB::table('document_request_recipients')->insert([
                    'request_id' => $requestId,
                    'office_id' => (int) $oid,
                    'status' => 'pending',
                    'last_submitted_at' => null,
                    'last_reviewed_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Activity log
            ActivityLog::create([
                'document_id' => null,
                'document_version_id' => null,
                'actor_user_id' => $user->id,
                'actor_office_id' => $user->office_id,
                'target_office_id' => null,
                'event' => 'document_request.created',
                'label' => 'Created a document request',
                'meta' => [
                    'document_request_id' => $requestId,
                    'office_ids' => $officeIds,
                    'due_at' => $data['due_at'] ?? null,
                ],
            ]);

            // Notifications: all users in each office (A)
            $users = User::query()
                ->whereIn('office_id', $officeIds)
                ->select(['id', 'office_id'])
                ->get();

            foreach ($users as $u) {
                Notification::create([
                    'user_id' => $u->id,
                    'document_id' => null,
                    'document_version_id' => null,
                    'event' => 'document_request.created',
                    'title' => 'New document request',
                    'body' => $data['title'],
                    'meta' => [
                        'document_request_id' => $requestId,
                        'office_id' => (int) $u->office_id,
                    ],
                    'read_at' => null,
                ]);
            }

            return response()->json([
                'message' => 'Document request created.',
                'id' => $requestId,
            ], 201);
        });
    }

    // POST /api/compliance-requests/{request}/recipients/{recipient}/submit
    public function submit(Request $request, int $requestId, int $recipientId)
    {
        $user = $request->user();
        $officeId = (int) ($user?->office_id ?? 0);
        if ($officeId <= 0) {
            return response()->json(['message' => 'Your account has no office assigned.'], 422);
        }

        $data = $request->validate([
            'note' => 'nullable|string|max:2000',
            'files' => 'required|array|min:1|max:5',
            'files.*' => 'file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
        ]);

        $req = DB::table('document_requests')->where('id', $requestId)->first();
        if (!$req) return response()->json(['message' => 'Not found'], 404);
        if (($req->status ?? '') !== 'open') {
            return response()->json(['message' => 'Request is not open.'], 422);
        }

        $recipient = DB::table('document_request_recipients')
            ->where('id', $recipientId)
            ->where('request_id', $requestId)
            ->first();

        if (!$recipient) return response()->json(['message' => 'Recipient not found'], 404);
        if ((int) ($recipient->office_id ?? 0) !== $officeId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return DB::transaction(function () use ($request, $data, $user, $officeId, $requestId, $recipientId) {
            $now = now();

            // attempt_no: next integer per recipient
            $attemptNo = (int) (DB::table('document_request_submissions')
                ->where('recipient_id', $recipientId)
                ->max('attempt_no') ?? 0) + 1;

            $submissionId = DB::table('document_request_submissions')->insertGetId([
                'recipient_id' => $recipientId,
                'attempt_no' => $attemptNo,
                'submitted_by_user_id' => $user->id,
                'note' => $data['note'] ?? null,
                'status' => 'submitted',
                'qa_reviewed_by_user_id' => null,
                'qa_review_note' => null,
                'reviewed_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $files = $request->file('files');
            $i = 1;
            foreach ($files as $f) {
                $payload = $this->files->saveSubmissionFile($submissionId, $f, $i);

                DB::table('document_request_submission_files')->insert([
                    'submission_id' => $submissionId,
                    'original_filename' => $payload['original_filename'],
                    'file_path' => $payload['file_path'],
                    'preview_path' => $payload['preview_path'],
                    'mime' => $payload['mime'],
                    'size_bytes' => $payload['size_bytes'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $i++;
            }

            // Update recipient status
            DB::table('document_request_recipients')
                ->where('id', $recipientId)
                ->update([
                    'status' => 'submitted',
                    'last_submitted_at' => $now,
                    'updated_at' => $now,
                ]);

            ActivityLog::create([
                'document_id' => null,
                'document_version_id' => null,
                'actor_user_id' => $user->id,
                'actor_office_id' => $officeId,
                'target_office_id' => null,
                'event' => 'document_request.submission.submitted',
                'label' => 'Submitted document request evidence',
                'meta' => [
                    'document_request_id' => $requestId,
                    'recipient_id' => $recipientId,
                    'submission_id' => $submissionId,
                    'attempt_no' => $attemptNo,
                ],
            ]);

            // Notify QA + SYSADMIN users
            $qaUsers = User::query()
                ->whereHas('role', function ($q) {
                    $q->whereIn('name', ['QA', 'SYSADMIN']);
                })
                ->select(['id', 'office_id'])
                ->get();

            foreach ($qaUsers as $u) {
                Notification::create([
                    'user_id' => $u->id,
                    'document_id' => null,
                    'document_version_id' => null,
                    'event' => 'document_request.submission.submitted',
                    'title' => 'Document request submission received',
                    'body' => 'An office submitted evidence for a document request.',
                    'meta' => [
                        'document_request_id' => $requestId,
                        'recipient_id' => $recipientId,
                        'submission_id' => $submissionId,
                        'from_office_id' => $officeId,
                    ],
                    'read_at' => null,
                ]);
            }

            return response()->json([
                'message' => 'Submission uploaded.',
                'submission_id' => $submissionId,
            ], 201);
        });
    }

    // POST /api/compliance-submissions/{submission}/review (QA/SYSADMIN)
    public function review(Request $request, int $submissionId)
    {
        $this->assertQaOrSysadmin($request);

        $data = $request->validate([
            'decision' => 'required|in:accepted,rejected',
            'note' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $now = now();

        $submission = DB::table('document_request_submissions')->where('id', $submissionId)->first();
        if (!$submission) return response()->json(['message' => 'Not found'], 404);
        if (($submission->status ?? '') !== 'submitted') {
            return response()->json(['message' => 'Submission is not in submitted status.'], 422);
        }

        $recipient = DB::table('document_request_recipients')->where('id', $submission->recipient_id)->first();
        if (!$recipient) return response()->json(['message' => 'Recipient not found'], 404);

        $requestRow = DB::table('document_requests')->where('id', $recipient->request_id)->first();

        return DB::transaction(function () use ($data, $user, $now, $submissionId, $submission, $recipient, $requestRow) {
            DB::table('document_request_submissions')->where('id', $submissionId)->update([
                'status' => $data['decision'],
                'qa_reviewed_by_user_id' => $user->id,
                'qa_review_note' => $data['note'] ?? null,
                'reviewed_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('document_request_recipients')->where('id', $recipient->id)->update([
                'status' => $data['decision'] === 'accepted' ? 'accepted' : 'rejected',
                'last_reviewed_at' => $now,
                'updated_at' => $now,
            ]);

            ActivityLog::create([
                'document_id' => null,
                'document_version_id' => null,
                'actor_user_id' => $user->id,
                'actor_office_id' => $user->office_id,
                'target_office_id' => (int) ($recipient->office_id ?? null),
                'event' => 'document_request.submission.reviewed',
                'label' => $data['decision'] === 'accepted'
                    ? 'Accepted document request submission'
                    : 'Rejected document request submission',
                'meta' => [
                    'document_request_id' => (int) ($recipient->request_id ?? null),
                    'recipient_id' => (int) $recipient->id,
                    'submission_id' => (int) $submissionId,
                    'decision' => $data['decision'],
                ],
            ]);

            // Notify all users in the recipient office (A)
            $users = User::query()
                ->where('office_id', (int) $recipient->office_id)
                ->select(['id', 'office_id'])
                ->get();

            foreach ($users as $u) {
                Notification::create([
                    'user_id' => $u->id,
                    'document_id' => null,
                    'document_version_id' => null,
                    'event' => $data['decision'] === 'accepted'
                        ? 'document_request.submission.accepted'
                        : 'document_request.submission.rejected',
                    'title' => $data['decision'] === 'accepted'
                        ? 'Document request submission accepted'
                        : 'Document request submission rejected',
                    'body' => $requestRow?->title ?? 'Document request update',
                    'meta' => [
                        'document_request_id' => (int) ($recipient->request_id ?? null),
                        'recipient_id' => (int) $recipient->id,
                        'submission_id' => (int) $submissionId,
                        'qa_note' => $data['note'] ?? null,
                    ],
                    'read_at' => null,
                ]);
            }

            return response()->json(['message' => 'Reviewed.'], 200);
        });
    }
}
