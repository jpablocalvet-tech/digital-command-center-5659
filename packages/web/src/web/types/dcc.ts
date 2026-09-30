/** Tipos de dominio compartidos por las pantallas (espejo de las tablas). */

export type ClientRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  service: string;
  objective: string;
  contactName: string;
  contactEmail: string;
  contactWhatsapp: string;
  status: string;
  leads: number;
  scheduled: number;
  brandVoice: string;
  brandPillars: string;
  brandColors: string;
  brandNotes: string;
  brandUseWords: string;
  brandAvoidWords: string;
  allowedPromises: string;
  communicationRestrictions: string;
  learning: string;
  createdAt?: Date | string;
  founderMinutes?: number;
  automationScore?: number;
  standardizedScore?: number;
  manualScore?: number;
  activeCycleId?: number | null;
  activeCycleName?: string;
  activeCycleObjective?: string;
};

export type CycleRow = {
  id: number;
  clientId: number;
  name: string;
  startDate: string;
  endDate: string;
  businessGoal: string;
  objective: string;
  objectiveSource: string;
  objectiveStatus: string;
  primaryMetric: string;
  baseline: string;
  target: string;
  objectiveRationale: string;
  status: string;
  targetContentCount: number;
};

export type AttentionRow = {
  id: number;
  priority: string;
  title: string;
  detail: string;
  link: string;
  linkLabel: string;
};

export type ContentRow = {
  id: number;
  clientId: number;
  cycleId: number;
  type: string;
  title: string;
  objective: string;
  cta: string;
  pillar: string;
  channel: string;
  hook: string;
  body: string;
  caption: string;
  visualBrief: string;
  assetUrl: string;
  sourceNotes: string;
  brandReviewNotes: string;
  realityReviewNotes: string;
  stage: string;
  approvalState: string;
  brandStatus: string;
  realityStatus: string;
  scheduledLabel: string;
  scheduledBucket: string;
  scheduledAt?: Date | string | null;
  note: string;
};

export type ApprovalEventRow = {
  id: number;
  contentId: number;
  decision: string;
  note: string;
  createdAt: Date | string;
};

export type PipelineRow = { id: number; position: number; name: string; count: number };

export type AgentRow = {
  id: number;
  position: number;
  name: string;
  role: string;
  status: string;
  lastAction: string;
};

export type HoursRow = { id: number; category: string; minutes: number };

export type TimeEntryRow = {
  id: number;
  clientId: number;
  cycleId: number;
  category: string;
  minutes: number;
  date: string;
  description: string;
};

export type ManualTaskRow = {
  id: number;
  task: string;
  frequency: string;
  minutes: number;
  timesPerMonth: number;
  classification: string;
  priority: string;
  status: string;
};
