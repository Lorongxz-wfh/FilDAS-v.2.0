// src/components/documents/documentFlow/flowConfig.ts

export type PhaseId =
  | "draft"
  | "review"
  | "approval"
  | "registration"
  | "distributed";

export type Phase = {
  id: PhaseId;
  label: string;
};

export const phases: Phase[] = [
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "approval", label: "Approval" },
  { id: "registration", label: "Registration" },
  { id: "distributed", label: "Distributed" },
];

export type FlowStep = {
  id: string;
  label: string;
  statusValue: string;
  phase: PhaseId;
};

export const flowStepsQa: FlowStep[] = [
  { id: "draft", label: "Drafted by QA", statusValue: "Draft", phase: "draft" },
  {
    id: "office_review",
    label: "Office review",
    statusValue: "For Office Review",
    phase: "review",
  },
  {
    id: "vp_review",
    label: "VP review",
    statusValue: "For VP Review",
    phase: "review",
  },
  {
    id: "qafinalcheck",
    label: "QA final check",
    statusValue: "For QA Final Check",
    phase: "review",
  },

  {
    id: "office_approval",
    label: "Office approval",
    statusValue: "For Office Approval",
    phase: "approval",
  },
  {
    id: "vp_approval",
    label: "VP approval",
    statusValue: "For VP Approval",
    phase: "approval",
  },
  {
    id: "pres_approval",
    label: "President approval",
    statusValue: "For President Approval",
    phase: "approval",
  },

  {
    id: "qa_registration",
    label: "QA registration",
    statusValue: "For QA Registration",
    phase: "registration",
  },
  {
    id: "qa_distribution",
    label: "QA distribution",
    statusValue: "For QA Distribution",
    phase: "registration",
  },
  {
    id: "distributed",
    label: "Distributed",
    statusValue: "Distributed",
    phase: "distributed",
  },
];

export const flowStepsOffice: FlowStep[] = [
  {
    id: "office_draft",
    label: "Office draft",
    statusValue: "Office Draft",
    phase: "draft",
  },
  {
    id: "office_head_review",
    label: "Office head review",
    statusValue: "For Office Head Review",
    phase: "review",
  },
  {
    id: "office_vp_review",
    label: "VP review",
    statusValue: "For VP Review",
    phase: "review",
  },
  {
    id: "office_final_check",
    label: "Office final check",
    statusValue: "For Office Final Check",
    phase: "review",
  },
  {
    id: "office_qa_approval",
    label: "QA approval",
    statusValue: "For QA Approval",
    phase: "approval",
  },
  {
    id: "office_registration",
    label: "Registration",
    statusValue: "For Registration",
    phase: "registration",
  },
  {
    id: "office_distribution",
    label: "Distribution",
    statusValue: "For Distribution",
    phase: "registration",
  },
  {
    id: "distributed",
    label: "Distributed",
    statusValue: "Distributed",
    phase: "distributed",
  },
];

// Removed: transitionsQa, transitionsOffice, transitionsCustom, TransitionAction
// Actions are now driven by backend /available-actions endpoint.
// flowStepsQa and flowStepsOffice are kept for the progress bar UI only.
