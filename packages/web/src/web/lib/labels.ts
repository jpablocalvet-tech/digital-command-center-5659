/** Etiquetas y formatos en español compartidos por toda la aplicación. */

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const stageOrder = [
  "idea",
  "research",
  "copy",
  "diseno",
  "quality",
  "aprobacion",
  "programado",
  "publicado",
] as const;

export type Stage = (typeof stageOrder)[number];

export const stageLabels: Record<Stage, string> = {
  idea: "Idea",
  research: "Research",
  copy: "Copy",
  diseno: "Diseño",
  quality: "Quality Check",
  aprobacion: "Aprobación",
  programado: "Programado",
  publicado: "Publicado",
};

export const approvalLabels: Record<string, string> = {
  pendiente: "En proceso",
  listo: "Listo para aprobación",
  dato_por_confirmar: "Dato por confirmar",
  cambios: "Cambios solicitados",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const approvalTones: Record<string, Tone> = {
  pendiente: "neutral",
  listo: "info",
  dato_por_confirmar: "warning",
  cambios: "warning",
  aprobado: "accent",
  rechazado: "critical",
};

export const agentStatusLabels: Record<string, string> = {
  esperando: "Esperando",
  trabajando: "Trabajando",
  completado: "Completado",
  revision: "Requiere revisión",
  bloqueado: "Bloqueado",
  sin_datos: "Sin datos todavía",
};

export const agentStatusTones: Record<string, Tone> = {
  esperando: "neutral",
  trabajando: "info",
  completado: "accent",
  revision: "warning",
  bloqueado: "critical",
  sin_datos: "neutral",
};

export const priorityLabels: Record<string, string> = {
  critico: "Crítico",
  atencion: "Atención",
  informativo: "Informativo",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const priorityTones: Record<string, Tone> = {
  critico: "critical",
  atencion: "warning",
  informativo: "info",
  alta: "critical",
  media: "warning",
  baja: "neutral",
};

export const classificationLabels: Record<string, string> = {
  automatizable: "Automatizable",
  estandarizable: "Estandarizable",
  delegable: "Delegable",
  founder_only: "Founder Only",
};

export const classificationTones: Record<string, Tone> = {
  automatizable: "accent",
  estandarizable: "warning",
  delegable: "info",
  founder_only: "critical",
};

export const taskStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

export const taskStatusTones: Record<string, Tone> = {
  pendiente: "neutral",
  en_proceso: "info",
  resuelto: "accent",
};

export const checkTones: Record<string, Tone> = {
  Aprobado: "accent",
  Verificado: "accent",
  "En revisión": "info",
  "En verificación": "info",
  Pendiente: "neutral",
  "Dato por confirmar": "warning",
};

export type Tone = "neutral" | "accent" | "warning" | "critical" | "info" | "primary";
