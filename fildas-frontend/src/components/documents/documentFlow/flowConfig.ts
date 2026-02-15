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
    phase: "review",
  },
  {
    id: "office_head_review",
    label: "Office head review",
    statusValue: "For Office Head Review",
    phase: "review",
  },
  {
    id: "vp_review_office",
    label: "VP review",
    statusValue: "For VP Review (Office)",
    phase: "review",
  },
  {
    id: "qa_approval_office",
    label: "QA approval",
    statusValue: "For QA Approval (Office)",
    phase: "review",
  },

  {
    id: "office_approval_office",
    label: "Office approval",
    statusValue: "For Office Approval (Office)",
    phase: "approval",
  },
  {
    id: "vp_approval_office",
    label: "VP approval",
    statusValue: "For VP Approval (Office)",
    phase: "approval",
  },
  {
    id: "pres_approval_office",
    label: "President approval",
    statusValue: "For President Approval (Office)",
    phase: "approval",
  },

  {
    id: "qa_registration_office",
    label: "QA registration",
    statusValue: "For QA Registration (Office)",
    phase: "registration",
  },
  {
    id: "qa_distribution_office",
    label: "QA distribution",
    statusValue: "For QA Distribution (Office)",
    phase: "registration",
  },
  {
    id: "distributed",
    label: "Distributed",
    statusValue: "Distributed",
    phase: "distributed",
  },
];

export type TransitionAction = {
  toStatus: string;
  label: string;
};

export const transitionsQa: Record<string, TransitionAction[]> = {
  Draft: [
    { toStatus: "For Office Review", label: "Send to Office for review" },
  ],
  "For Office Review": [
    { toStatus: "For VP Review", label: "Forward to VP for review" },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  "For VP Review": [
    {
      toStatus: "For QA Final Check",
      label: "Send back to QA for final check",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],
  "For QA Final Check": [
    {
      toStatus: "For Office Approval",
      label: "Start approval phase (Office approval)",
    },
    { toStatus: "QA_EDIT", label: "Return to QA edit" },
  ],
  "For Office Approval": [
    { toStatus: "For VP Approval", label: "Forward to VP for approval" },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  "For VP Approval": [
    {
      toStatus: "For President Approval",
      label: "Forward to President for approval",
    },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  "For President Approval": [
    {
      toStatus: "For QA Registration",
      label: "Forward to QA for registration",
    },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  "For QA Registration": [
    { toStatus: "For QA Distribution", label: "Proceed to QA distribution" },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  "For QA Distribution": [
    { toStatus: "Distributed", label: "Mark as distributed" },
    { toStatus: "QA_EDIT", label: "Return to QA (edit)" },
  ],
  Distributed: [],
};

export const transitionsOffice: Record<string, TransitionAction[]> = {
  "Office Draft": [
    {
      toStatus: "For Office Head Review",
      label: "Send to Office head for review",
    },
  ],
  "For Office Head Review": [
    { toStatus: "For VP Review (Office)", label: "Forward to VP for review" },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For VP Review (Office)": [
    {
      toStatus: "For QA Approval (Office)",
      label: "Forward to QA for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For QA Approval (Office)": [
    { toStatus: "Distributed", label: "Approve and distribute (finish)" },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For Office Approval (Office)": [
    {
      toStatus: "For VP Approval (Office)",
      label: "Forward to VP for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For VP Approval (Office)": [
    {
      toStatus: "For President Approval (Office)",
      label: "Forward to President for approval",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For President Approval (Office)": [
    {
      toStatus: "For QA Registration (Office)",
      label: "Forward to QA for registration",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For QA Registration (Office)": [
    {
      toStatus: "For QA Distribution (Office)",
      label: "Proceed to QA distribution",
    },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  "For QA Distribution (Office)": [
    { toStatus: "Distributed", label: "Mark as distributed" },
    { toStatus: "OFFICE_EDIT", label: "Return to Office draft (edit)" },
  ],
  Distributed: [],
};

export const transitionsCustom: Record<string, TransitionAction[]> = {
  Draft: [{ toStatus: "For Office Review", label: "Send for review" }],
  "For Creator Check": [
    { toStatus: "For Office Approval", label: "Start approval phase" },
    { toStatus: "QA_EDIT", label: "Return to edit" },
  ],
  "For Creator Final": [
    { toStatus: "For Registration", label: "Proceed to registration" },
    { toStatus: "QA_EDIT", label: "Return to edit" },
  ],
  "For Registration": [
    { toStatus: "For Distribution", label: "Proceed to distribution" },
    { toStatus: "QA_EDIT", label: "Return to edit" },
  ],
  "For Distribution": [
    { toStatus: "Distributed", label: "Mark as distributed" },
    { toStatus: "QA_EDIT", label: "Return to edit" },
  ],
  Distributed: [],
};
