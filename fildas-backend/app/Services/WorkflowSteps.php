<?php

namespace App\Services;

/**
 * Single source of truth for all workflow steps, phases, and statuses.
 *
 * Naming convention:
 *   STEP_*   → workflow_tasks.step values
 *   PHASE_*  → workflow_tasks.phase values
 *   STATUS_* → document_versions.status values
 */
final class WorkflowSteps
{
    // ── Phases (must match workflow_tasks.phase enum) ──────────────────────
    const PHASE_REVIEW       = 'review';
    const PHASE_APPROVAL     = 'approval';
    const PHASE_REGISTRATION = 'registration';

    // ── Statuses ───────────────────────────────────────────────────────────

    // Shared
    const STATUS_DRAFT       = 'Draft';
    const STATUS_DISTRIBUTED = 'Distributed';

    // QA flow
    const STATUS_QA_OFFICE_REVIEW    = 'For Office Review';
    const STATUS_QA_VP_REVIEW        = 'For VP Review';
    const STATUS_QA_FINAL_CHECK      = 'For QA Final Check';
    const STATUS_QA_OFFICE_APPROVAL  = 'For Office Approval';
    const STATUS_QA_VP_APPROVAL      = 'For VP Approval';
    const STATUS_QA_PRES_APPROVAL    = 'For President Approval';
    const STATUS_QA_REGISTRATION     = 'For Registration';
    const STATUS_QA_DISTRIBUTION     = 'For Distribution';

    // Office flow
    const STATUS_OFFICE_DRAFT            = 'Office Draft';
    const STATUS_OFFICE_HEAD_REVIEW      = 'For Office Head Review';
    const STATUS_OFFICE_VP_REVIEW        = 'For VP Review';
    const STATUS_OFFICE_FINAL_CHECK      = 'For Office Final Check';
    const STATUS_OFFICE_QA_APPROVAL      = 'For QA Approval';
    const STATUS_OFFICE_REGISTRATION     = 'For Registration';
    const STATUS_OFFICE_DISTRIBUTION     = 'For Distribution';

    // Custom flow
    const STATUS_CUSTOM_OFFICE_REVIEW    = 'For Office Review';
    const STATUS_CUSTOM_BACK_TO_OWNER    = 'For Owner Review';
    const STATUS_CUSTOM_OFFICE_APPROVAL  = 'For Office Approval';
    const STATUS_CUSTOM_BACK_TO_OWNER_APPROVAL = 'For Owner Approval Check';
    const STATUS_CUSTOM_REGISTRATION     = 'For Registration';
    const STATUS_CUSTOM_DISTRIBUTION     = 'For Distribution';

    // ── Steps ──────────────────────────────────────────────────────────────

    // Shared
    const STEP_DRAFT       = 'draft';
    const STEP_DISTRIBUTED = 'distributed';

    // QA flow steps
    const STEP_QA_DRAFT            = 'draft';
    const STEP_QA_OFFICE_REVIEW    = 'qa_office_review';
    const STEP_QA_VP_REVIEW        = 'qa_vp_review';
    const STEP_QA_FINAL_CHECK      = 'qa_final_check';
    const STEP_QA_OFFICE_APPROVAL  = 'qa_office_approval';
    const STEP_QA_VP_APPROVAL      = 'qa_vp_approval';
    const STEP_QA_PRES_APPROVAL    = 'qa_pres_approval';
    const STEP_QA_REGISTRATION     = 'qa_registration';
    const STEP_QA_DISTRIBUTION     = 'qa_distribution';

    // Office flow steps
    const STEP_OFFICE_DRAFT        = 'office_draft';
    const STEP_OFFICE_HEAD_REVIEW  = 'office_head_review';
    const STEP_OFFICE_VP_REVIEW    = 'office_vp_review';
    const STEP_OFFICE_FINAL_CHECK  = 'office_final_check';
    const STEP_OFFICE_QA_APPROVAL  = 'office_qa_approval';
    const STEP_OFFICE_REGISTRATION = 'office_registration';
    const STEP_OFFICE_DISTRIBUTION = 'office_distribution';

    // Custom flow steps
    const STEP_CUSTOM_DRAFT                    = 'draft';
    const STEP_CUSTOM_OFFICE_REVIEW            = 'custom_office_review';
    const STEP_CUSTOM_BACK_TO_OWNER            = 'custom_back_to_owner';
    const STEP_CUSTOM_OFFICE_APPROVAL          = 'custom_office_approval';
    const STEP_CUSTOM_BACK_TO_OWNER_APPROVAL   = 'custom_back_to_owner_approval';
    const STEP_CUSTOM_REGISTRATION             = 'custom_registration';
    const STEP_CUSTOM_DISTRIBUTION             = 'custom_distribution';

    // ── Actions (what actors send from frontend) ───────────────────────────

    // Universal
    const ACTION_REJECT = 'REJECT'; // any actor, any step → back to Draft

    // QA flow actions
    const ACTION_QA_SEND_TO_OFFICE_REVIEW       = 'QA_SEND_TO_OFFICE_REVIEW';
    const ACTION_QA_OFFICE_FORWARD_TO_VP        = 'QA_OFFICE_FORWARD_TO_VP';
    const ACTION_QA_OFFICE_RETURN_TO_QA         = 'QA_OFFICE_RETURN_TO_QA';
    const ACTION_QA_VP_SEND_BACK_TO_QA          = 'QA_VP_SEND_BACK_TO_QA';
    const ACTION_QA_START_OFFICE_APPROVAL       = 'QA_START_OFFICE_APPROVAL';
    const ACTION_QA_OFFICE_FORWARD_TO_VP_APPR   = 'QA_OFFICE_FORWARD_TO_VP_APPROVAL';
    const ACTION_QA_VP_FORWARD_TO_PRESIDENT     = 'QA_VP_FORWARD_TO_PRESIDENT';
    const ACTION_QA_PRESIDENT_SEND_BACK_TO_QA   = 'QA_PRESIDENT_SEND_BACK_TO_QA';
    const ACTION_QA_REGISTER                    = 'QA_REGISTER';
    const ACTION_QA_DISTRIBUTE                  = 'QA_DISTRIBUTE';

    // Office flow actions
    const ACTION_OFFICE_SEND_TO_HEAD            = 'OFFICE_SEND_TO_HEAD';
    const ACTION_OFFICE_HEAD_FORWARD_TO_VP      = 'OFFICE_HEAD_FORWARD_TO_VP';
    const ACTION_OFFICE_HEAD_RETURN_TO_STAFF    = 'OFFICE_HEAD_RETURN_TO_STAFF';
    const ACTION_OFFICE_VP_SEND_BACK_TO_STAFF   = 'OFFICE_VP_SEND_BACK_TO_STAFF';
    const ACTION_OFFICE_SEND_TO_QA_APPROVAL     = 'OFFICE_SEND_TO_QA_APPROVAL';
    const ACTION_OFFICE_QA_RETURN_TO_STAFF      = 'OFFICE_QA_RETURN_TO_STAFF';
    const ACTION_OFFICE_QA_APPROVE              = 'OFFICE_QA_APPROVE';
    const ACTION_OFFICE_REGISTER                = 'OFFICE_REGISTER';
    const ACTION_OFFICE_DISTRIBUTE              = 'OFFICE_DISTRIBUTE';

    // Custom flow actions
    const ACTION_CUSTOM_FORWARD   = 'CUSTOM_FORWARD';   // advance to next office or back to owner
    const ACTION_CUSTOM_START_APPROVAL = 'CUSTOM_START_APPROVAL'; // owner manually starts approval
    const ACTION_CUSTOM_REGISTER  = 'CUSTOM_REGISTER';
    const ACTION_CUSTOM_DISTRIBUTE = 'CUSTOM_DISTRIBUTE';

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Given a step, return which phase it belongs to.
     * Used when creating WorkflowTask rows.
     */
    public static function phaseForStep(string $step): string
    {
        return match ($step) {
            self::STEP_QA_DRAFT,
            self::STEP_OFFICE_DRAFT,
            self::STEP_CUSTOM_DRAFT            => self::PHASE_REVIEW,

            self::STEP_QA_OFFICE_REVIEW,
            self::STEP_QA_VP_REVIEW,
            self::STEP_QA_FINAL_CHECK          => self::PHASE_REVIEW,

            self::STEP_OFFICE_HEAD_REVIEW,
            self::STEP_OFFICE_VP_REVIEW,
            self::STEP_OFFICE_FINAL_CHECK      => self::PHASE_REVIEW,

            self::STEP_CUSTOM_OFFICE_REVIEW,
            self::STEP_CUSTOM_BACK_TO_OWNER    => self::PHASE_REVIEW,

            self::STEP_QA_OFFICE_APPROVAL,
            self::STEP_QA_VP_APPROVAL,
            self::STEP_QA_PRES_APPROVAL        => self::PHASE_APPROVAL,

            self::STEP_OFFICE_QA_APPROVAL      => self::PHASE_APPROVAL,

            self::STEP_CUSTOM_OFFICE_APPROVAL,
            self::STEP_CUSTOM_BACK_TO_OWNER_APPROVAL => self::PHASE_APPROVAL,

            self::STEP_QA_REGISTRATION,
            self::STEP_QA_DISTRIBUTION,
            self::STEP_OFFICE_REGISTRATION,
            self::STEP_OFFICE_DISTRIBUTION,
            self::STEP_CUSTOM_REGISTRATION,
            self::STEP_CUSTOM_DISTRIBUTION,
            self::STEP_DISTRIBUTED             => self::PHASE_REGISTRATION,

            default => self::PHASE_REVIEW,
        };
    }

    /**
     * Given a flow + step, return the human-readable status string.
     */
    public static function statusForStep(string $flow, string $step, ?string $officeCode = null): string
    {
        // Custom flow: inject office code into status label
        if ($flow === 'custom') {
            return match ($step) {
                self::STEP_CUSTOM_DRAFT                  => self::STATUS_DRAFT,
                self::STEP_CUSTOM_OFFICE_REVIEW          => $officeCode ? "For {$officeCode} Review" : self::STATUS_CUSTOM_OFFICE_REVIEW,
                self::STEP_CUSTOM_BACK_TO_OWNER          => self::STATUS_CUSTOM_BACK_TO_OWNER,
                self::STEP_CUSTOM_OFFICE_APPROVAL        => $officeCode ? "For {$officeCode} Approval" : self::STATUS_CUSTOM_OFFICE_APPROVAL,
                self::STEP_CUSTOM_BACK_TO_OWNER_APPROVAL => self::STATUS_CUSTOM_BACK_TO_OWNER_APPROVAL,
                self::STEP_CUSTOM_REGISTRATION           => self::STATUS_CUSTOM_REGISTRATION,
                self::STEP_CUSTOM_DISTRIBUTION           => self::STATUS_CUSTOM_DISTRIBUTION,
                self::STEP_DISTRIBUTED                   => self::STATUS_DISTRIBUTED,
                default                                  => self::STATUS_DRAFT,
            };
        }

        if ($flow === 'office') {
            return match ($step) {
                self::STEP_OFFICE_DRAFT        => self::STATUS_OFFICE_DRAFT,
                self::STEP_OFFICE_HEAD_REVIEW  => self::STATUS_OFFICE_HEAD_REVIEW,
                self::STEP_OFFICE_VP_REVIEW    => self::STATUS_OFFICE_VP_REVIEW,
                self::STEP_OFFICE_FINAL_CHECK  => self::STATUS_OFFICE_FINAL_CHECK,
                self::STEP_OFFICE_QA_APPROVAL  => self::STATUS_OFFICE_QA_APPROVAL,
                self::STEP_OFFICE_REGISTRATION => self::STATUS_OFFICE_REGISTRATION,
                self::STEP_OFFICE_DISTRIBUTION => self::STATUS_OFFICE_DISTRIBUTION,
                self::STEP_DISTRIBUTED         => self::STATUS_DISTRIBUTED,
                default                        => self::STATUS_OFFICE_DRAFT,
            };
        }

        // QA flow (default)
        return match ($step) {
            self::STEP_QA_DRAFT            => self::STATUS_DRAFT,
            self::STEP_QA_OFFICE_REVIEW    => self::STATUS_QA_OFFICE_REVIEW,
            self::STEP_QA_VP_REVIEW        => self::STATUS_QA_VP_REVIEW,
            self::STEP_QA_FINAL_CHECK      => self::STATUS_QA_FINAL_CHECK,
            self::STEP_QA_OFFICE_APPROVAL  => self::STATUS_QA_OFFICE_APPROVAL,
            self::STEP_QA_VP_APPROVAL      => self::STATUS_QA_VP_APPROVAL,
            self::STEP_QA_PRES_APPROVAL    => self::STATUS_QA_PRES_APPROVAL,
            self::STEP_QA_REGISTRATION     => self::STATUS_QA_REGISTRATION,
            self::STEP_QA_DISTRIBUTION     => self::STATUS_QA_DISTRIBUTION,
            self::STEP_DISTRIBUTED         => self::STATUS_DISTRIBUTED,
            default                        => self::STATUS_DRAFT,
        };
    }
}
