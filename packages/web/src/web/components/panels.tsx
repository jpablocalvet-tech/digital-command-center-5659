import { Link } from "wouter";
import { AlertTriangle, ArrowRight, CircleAlert, Info, Plug } from "lucide-react";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import {
  agentStatusLabels,
  agentStatusTones,
  approvalLabels,
  approvalTones,
  checkTones,
  classificationLabels,
  classificationTones,
  formatMinutes,
  priorityLabels,
  priorityTones,
} from "@/lib/labels";
import type {
  AgentRow,
  AttentionRow,
  ContentRow,
  HoursRow,
  ManualTaskRow,
  PipelineRow,
} from "@/types/dcc";

/* ---------------------------------- KPIs ---------------------------------- */

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warning";
}) {
  return (
    <Card className="px-4 py-4">
      <p className="dcc-label">{label}</p>
      <p
        className={cn(
          "dcc-num mt-2 font-display text-[30px] font-extrabold leading-none",
          tone === "accent" && "text-accent",
          tone === "warning" && "text-warning",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/* ------------------------------ Atención ---------------------------------- */

const attentionIcons = {
  critico: CircleAlert,
  atencion: AlertTriangle,
  informativo: Info,
} as const;

export function AttentionList({ items }: { items: AttentionRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Necesita tu atención"
        subtitle="Decisiones y bloqueos que dependen de ti ahora mismo."
      />
      <CardBody className="space-y-3">
        {items.length === 0 ? (
          <p className="text-[13.5px] text-muted-foreground">Nada pendiente. Todo en orden.</p>
        ) : null}
        {items.map((item) => {
          const Icon = attentionIcons[item.priority as keyof typeof attentionIcons] ?? Info;
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-wrap items-start gap-3 rounded-md border border-border bg-surface-soft/50 p-4",
                item.priority === "critico" && "border-l-[3px] border-l-critical",
                item.priority === "atencion" && "border-l-[3px] border-l-warning",
                item.priority === "informativo" && "border-l-[3px] border-l-info",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  item.priority === "critico" && "text-critical",
                  item.priority === "atencion" && "text-warning",
                  item.priority === "informativo" && "text-info",
                )}
                strokeWidth={1.9}
              />
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold text-foreground">{item.title}</p>
                  <Badge tone={priorityTones[item.priority]}>{priorityLabels[item.priority]}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{item.detail}</p>
              </div>
              <Link
                to={item.link}
                className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-md border border-border bg-card px-3 py-2 text-[12.5px] font-semibold text-primary hover:bg-surface-soft"
              >
                {item.linkLabel}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

/* ------------------------------- Pipeline --------------------------------- */

export function PipelineView({ stages }: { stages: PipelineRow[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <Card>
      <CardHeader
        title="Content Pipeline"
        subtitle="Piezas del ciclo en cada fase, de la idea a la publicación."
      />
      <CardBody>
        <div className="dcc-scroll flex gap-2 overflow-x-auto pb-1">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex min-w-0 items-center gap-2">
              <div className="min-w-[116px] rounded-md border border-border bg-surface-soft/60 px-3 py-3">
                <p className="text-[11.5px] font-semibold text-muted-foreground">{stage.name}</p>
                <p className="dcc-num mt-1 font-display text-[22px] font-bold leading-none text-foreground">
                  {stage.count}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-border">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(stage.count / max) * 100}%` }}
                  />
                </div>
              </div>
              {index < stages.length - 1 ? (
                <ArrowRight className="size-4 shrink-0 text-border" />
              ) : null}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/* -------------------------------- AI Team --------------------------------- */

export function AgentList({ agents }: { agents: AgentRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {agents.map((agent) => (
        <div key={agent.id} className="rounded-md border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">{agent.name}</p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{agent.role}</p>
            </div>
            <Badge tone={agentStatusTones[agent.status] ?? "neutral"} dot>
              {agentStatusLabels[agent.status] ?? agent.status}
            </Badge>
          </div>
          <p className="mt-3 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
            {agent.lastAction}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Approval Watch ------------------------------ */

export function ApprovalWatchItem({
  item,
  actions,
}: {
  item: ContentRow;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{item.type}</Badge>
        <Badge tone={approvalTones[item.approvalState] ?? "neutral"}>
          {approvalLabels[item.approvalState] ?? item.approvalState}
        </Badge>
      </div>
      <p className="mt-2.5 text-[15px] font-semibold text-foreground">{item.title}</p>
      {item.note ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{item.note}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          Brand Guardian:
          <Badge tone={checkTones[item.brandStatus] ?? "neutral"}>{item.brandStatus}</Badge>
        </span>
        <span className="inline-flex items-center gap-1.5">
          Reality Checker:
          <Badge tone={checkTones[item.realityStatus] ?? "neutral"}>{item.realityStatus}</Badge>
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

/* --------------------------- Próximos contenidos -------------------------- */

export function UpcomingContent({ items }: { items: ContentRow[] }) {
  const buckets = [
    { key: "hoy", label: "Hoy" },
    { key: "manana", label: "Mañana" },
    { key: "semana", label: "Esta semana" },
  ];

  return (
    <Card>
      <CardHeader title="Próximos contenidos" subtitle="Calendario del ciclo en curso." />
      <CardBody className="grid gap-4 sm:grid-cols-3">
        {buckets.map((bucket) => {
          const list = items.filter((item) => item.scheduledBucket === bucket.key);
          return (
            <div key={bucket.key}>
              <p className="dcc-label">{bucket.label}</p>
              <div className="mt-2 space-y-2">
                {list.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Sin contenidos</p>
                ) : null}
                {list.map((item) => (
                  <div key={item.id} className="rounded-md bg-surface-soft/70 px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-muted-foreground">
                      {item.scheduledLabel || "Sin fecha"}
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-semibold text-foreground">
                      {item.type} · {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

/* ----------------------------- Founder Hours ------------------------------ */

export function FounderHoursPanel({
  distribution,
  totalMinutes,
  targetMinutes = 240,
}: {
  distribution: HoursRow[];
  totalMinutes: number;
  targetMinutes?: number;
}) {
  const max = Math.max(1, ...distribution.map((d) => d.minutes));
  return (
    <Card>
      <CardHeader title="Founder Hours" subtitle="Tiempo humano invertido en este ciclo." />
      <CardBody>
        <p className="dcc-num font-display text-[34px] font-extrabold leading-none text-foreground">
          {formatMinutes(totalMinutes)}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Objetivo futuro: ≤ {formatMinutes(targetMinutes)} / cliente / mes
        </p>
        <div className="mt-4 h-2 rounded-full bg-border">
          <div
            className="h-2 rounded-full bg-accent"
            style={{ width: `${Math.min(100, (totalMinutes / targetMinutes) * 100)}%` }}
          />
        </div>
        <div className="mt-5 space-y-3">
          {distribution.map((row) => (
            <div key={row.id}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-foreground">{row.category}</span>
                <span className="dcc-num font-semibold text-muted-foreground">
                  {formatMinutes(row.minutes)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-border">
                <div
                  className="h-1.5 rounded-full bg-primary/70"
                  style={{ width: `${(row.minutes / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------------------- Automation Score ---------------------------- */

export function AutomationScorePanel({
  automated,
  standardized,
  manual,
  tasks,
  footer,
}: {
  automated: number;
  standardized: number;
  manual: number;
  tasks: ManualTaskRow[];
  footer?: React.ReactNode;
}) {
  const rows = [
    { label: "Automatizado", value: automated, color: "bg-accent" },
    { label: "Estandarizado", value: standardized, color: "bg-warning" },
    { label: "Manual", value: manual, color: "bg-critical" },
  ];

  return (
    <Card>
      <CardHeader
        title="Automation Score"
        subtitle="Qué parte del servicio ya no depende de manos humanas."
      />
      <CardBody>
        <div className="flex h-3 overflow-hidden rounded-full">
          {rows.map((row) => (
            <div key={row.label} className={row.color} style={{ width: `${row.value}%` }} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="dcc-label">{row.label}</p>
              <p className="dcc-num mt-1 font-display text-[20px] font-bold text-foreground">
                {row.value}%
              </p>
            </div>
          ))}
        </div>

        <p className="dcc-label mt-6">Tareas manuales detectadas</p>
        <div className="mt-2 space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-soft/70 px-3 py-2.5"
            >
              <span className="text-[13.5px] font-medium text-foreground">{task.task}</span>
              <Badge tone={classificationTones[task.classification] ?? "neutral"}>
                {classificationLabels[task.classification] ?? task.classification}
              </Badge>
            </div>
          ))}
        </div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardBody>
    </Card>
  );
}

/* ----------------------------- Learning Loop ------------------------------ */

export function LearningCard({ learning }: { learning: string }) {
  return (
    <Card>
      <CardHeader title="Último aprendizaje" subtitle="Learning Loop del ciclo." />
      <CardBody>
        <p className="text-[14px] leading-relaxed text-foreground">{learning}</p>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Cuando haya datos publicados, aquí aparecerá el insight principal del ciclo.
        </p>
      </CardBody>
    </Card>
  );
}

/* ---------------------------- Arquitectura futura ------------------------- */

const integrations = [
  "Google Workspace",
  "Canva",
  "ManyChat",
  "Meta",
  "WhatsApp",
  "IA",
  "GROUP HQ",
];

export function IntegrationsStrip() {
  return (
    <Card>
      <CardHeader
        title="Conexiones futuras"
        subtitle="Preparado para conectar más adelante. Nada de esto está activo en V0.1."
      />
      <CardBody className="flex flex-wrap gap-2">
        {integrations.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground"
          >
            <Plug className="size-3.5" strokeWidth={1.8} />
            {name}
          </span>
        ))}
      </CardBody>
    </Card>
  );
}
