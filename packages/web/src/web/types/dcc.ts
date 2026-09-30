/** Tipos de dominio compartidos por las pantallas (espejo de las tablas). */

export type ClientRow = {
  id: number;
  code: string;
  name: string;
  type: string;
  service: string;
  objective: string;
  status: string;
  leads: number;
  scheduled: number;
  automationScore: number;
  standardizedScore: number;
  manualScore: number;
  brandVoice: string;
  brandPillars: string;
  brandColors: string;
  brandNotes: string;
  learning: string;
  founderMinutes?: number;
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
  type: string;
  title: string;
  objective: string;
  cta: string;
  stage: string;
  approvalState: string;
  brandStatus: string;
  realityStatus: string;
  scheduledLabel: string;
  scheduledBucket: string;
  note: string;
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
