import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { CycleCreateModal } from "../components/cycle-create-modal";
import {
  AutomationScorePanel,
  FounderHoursPanel,
  KpiCard,
  LearningCard,
  PipelineView,
} from "../components/panels";
import { useActiveClient } from "../components/active-client";
import { useDashboard, useUpdateBrand } from "../queries/clients";
import { useCycles } from "../queries/cycles";
import { useStrategy } from "../queries/strategy";
import {
  approvalLabels,
  approvalTones,
  classificationLabels,
  classificationTones,
  formatMinutes,
  stageLabels,
  type Stage,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

const tabs = [
  "Resumen",
  "Marca",
  "Objetivos",
  "Contenido",
  "Resultados",
  "Horas",
  "Automatización",
] as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-soft/50 p-4">
      <p className="dcc-label">{label}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">
        {value || "Sin datos todavía."}
      </p>
    </div>
  );
}

type BrandValues = {
  brandVoice: string;
  brandPillars: string;
  brandColors: string;
  brandNotes: string;
  brandUseWords: string;
  brandAvoidWords: string;
  allowedPromises: string;
  communicationRestrictions: string;
};

function BrandEditor({ client }: { client: BrandValues & { id: number } }) {
  const update = useUpdateBrand();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<BrandValues>({
    brandVoice: client.brandVoice,
    brandPillars: client.brandPillars,
    brandColors: client.brandColors,
    brandNotes: client.brandNotes,
    brandUseWords: client.brandUseWords,
    brandAvoidWords: client.brandAvoidWords,
    allowedPromises: client.allowedPromises,
    communicationRestrictions: client.communicationRestrictions,
  });

  useEffect(() => {
    setValues({
      brandVoice: client.brandVoice,
      brandPillars: client.brandPillars,
      brandColors: client.brandColors,
      brandNotes: client.brandNotes,
      brandUseWords: client.brandUseWords,
      brandAvoidWords: client.brandAvoidWords,
      allowedPromises: client.allowedPromises,
      communicationRestrictions: client.communicationRestrictions,
    });
  }, [client]);

  const labels: { key: keyof BrandValues; label: string; rows: number }[] = [
    { key: "brandVoice", label: "Tono de voz", rows: 3 },
    { key: "brandPillars", label: "Pilares de marca", rows: 3 },
    { key: "brandColors", label: "Colores / identidad", rows: 2 },
    { key: "brandNotes", label: "Notas", rows: 3 },
    { key: "brandUseWords", label: "Palabras que usamos", rows: 3 },
    { key: "brandAvoidWords", label: "Palabras que evitamos", rows: 3 },
    { key: "allowedPromises", label: "Promesas permitidas", rows: 3 },
    { key: "communicationRestrictions", label: "Restricciones de comunicación", rows: 3 },
  ];

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Editar Brand Hub
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {labels.map((field) => (
            <Field key={field.key} label={field.label} value={values[field.key]} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Editar Brand Hub"
        subtitle="Este contexto será obligatorio para Brand Guardian cuando conectemos IA real."
      />
      <CardBody className="grid gap-4 md:grid-cols-2">
        {labels.map((field) => (
          <div key={field.key}>
            <label className="dcc-label" htmlFor={field.key}>
              {field.label}
            </label>
            <textarea
              id={field.key}
              rows={field.rows}
              value={values[field.key]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.key]: event.target.value }))
              }
              className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed outline-none"
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: client.id, ...values },
                { onSuccess: () => setEditing(false) },
              )
            }
          >
            {update.isPending ? "Guardando…" : "Guardar Brand Hub"}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ClienteHubPage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const active = useActiveClient();
  const cycles = useCycles(clientId);
  const pageCycleId = useMemo(() => {
    if (clientId === active.clientId && active.cycleId) return active.cycleId;
    const rows = cycles.data ?? [];
    const last = rows.length ? rows[rows.length - 1] : undefined;
    return rows.find((cycle) => cycle.status === "Activo")?.id ?? last?.id ?? 0;
  }, [active.clientId, active.cycleId, clientId, cycles.data]);

  const dashboard = useDashboard(clientId, pageCycleId);
  const strategy = useStrategy(clientId, pageCycleId);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumen");
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const clientMeta = active.clients.find((client) => client.id === clientId);

  if (cycles.isLoading) {
    return (
      <>
        <PageHeader title="Client Hub" />
        <Loader />
      </>
    );
  }

  if (!pageCycleId) {
    return (
      <>
        <Link
          to="/clientes"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Volver a Clientes
        </Link>
        <PageHeader
          title={clientMeta?.name ?? "Client Hub"}
          description={`${clientMeta?.code ?? "Cliente"} · todavía sin ciclo operativo`}
          action={
            <Button onClick={() => setNewCycleOpen(true)}>
              <Plus className="size-4" />
              Crear primer ciclo
            </Button>
          }
        />
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-display text-lg font-bold text-foreground">Este cliente todavía no tiene ciclos</p>
            <p className="mx-auto mt-2 max-w-xl text-[13.5px] text-muted-foreground">
              Crea el primer ciclo para separar objetivos, contenido, horas y aprendizajes antes de entrar a Strategy Lab.
            </p>
            <Button className="mt-4" onClick={() => setNewCycleOpen(true)}>
              <Plus className="size-4" />
              Nuevo ciclo
            </Button>
          </CardBody>
        </Card>
        <CycleCreateModal
          clientId={clientId}
          clientName={clientMeta?.name ?? "Cliente"}
          open={newCycleOpen}
          onClose={() => setNewCycleOpen(false)}
          onCreated={(created) => {
            if (clientId === active.clientId) active.setCycleId(created.id);
          }}
        />
      </>
    );
  }

  if (dashboard.isLoading || !dashboard.data) {
    return (
      <>
        <PageHeader title="Client Hub" />
        <Loader />
      </>
    );
  }

  const { client, cycle, content, pipeline, hours, tasks, kpis, automation } = dashboard.data;

  return (
    <>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Volver a Clientes
      </Link>

      <PageHeader
        title={client.name}
        description={`${client.code} · ${client.type} · ${cycle.name}`}
        action={
          <Button variant="outline" onClick={() => setNewCycleOpen(true)}>
            <Plus className="size-4" />
            Nuevo ciclo
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="dcc-label">Marca</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.name}</p>
          </div>
          <div>
            <p className="dcc-label">Tipo</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.type}</p>
          </div>
          <div>
            <p className="dcc-label">Servicio</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.service}</p>
          </div>
          <div>
            <p className="dcc-label">Objetivo del ciclo</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{cycle.objective || "Por definir"}</p>
          </div>
          <div>
            <p className="dcc-label">Contacto</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.contactName || "Sin contacto"}</p>
          </div>
          <div>
            <p className="dcc-label">Email</p>
            <p className="mt-1 break-all text-[13.5px] font-semibold text-foreground">{client.contactEmail || "—"}</p>
          </div>
          <div>
            <p className="dcc-label">WhatsApp</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.contactWhatsapp || "—"}</p>
          </div>
        </CardBody>
      </Card>

      <div className="dcc-scroll mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-colors",
              tab === item
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Resumen" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Contenidos del ciclo" value={`${kpis.cycleContent}/${kpis.targetContent}`} />
            <KpiCard label="Listos para aprobación" value={String(kpis.readyForApproval)} />
            <KpiCard label="Founder Hours" value={formatMinutes(kpis.founderMinutes)} />
            <KpiCard label="Automatizado" value={`${automation.automated}%`} tone="accent" />
          </div>
          <PipelineView stages={pipeline} />
          <LearningCard learning={client.learning} />
        </div>
      ) : null}

      {tab === "Marca" ? <BrandEditor client={client} /> : null}

      {tab === "Objetivos" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Prioridad de negocio" value={cycle.businessGoal} />
          <Field label="Objetivo de marketing del ciclo" value={cycle.objective} />
          <Field label="Métrica principal" value={cycle.primaryMetric} />
          <Field label="Baseline" value={cycle.baseline} />
          <Field label="Target" value={cycle.target} />
          <Field label="Razonamiento" value={cycle.objectiveRationale} />
          <Field label="Audiencia" value={strategy.data?.audience ?? ""} />
          <Field label="CTA principal" value={strategy.data?.mainCta ?? ""} />
        </div>
      ) : null}

      {tab === "Contenido" ? (
        <Card>
          <CardHeader title="Contenido del ciclo" subtitle={`${content.length} piezas`} />
          <CardBody className="space-y-2">
            {content.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {item.type} · {item.channel || "Sin canal"} · {item.objective}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{stageLabels[item.stage as Stage] ?? item.stage}</Badge>
                  <Badge tone={approvalTones[item.approvalState] ?? "neutral"}>
                    {approvalLabels[item.approvalState] ?? item.approvalState}
                  </Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {tab === "Resultados" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Leads generados" value={String(client.leads)} />
            <KpiCard label="Programados" value={String(kpis.scheduled)} />
            <KpiCard label="Publicados" value={String(kpis.published)} />
          </div>
          <Card>
            <CardHeader title="Resultados comerciales" subtitle="Ciclo en curso." />
            <CardBody>
              <p className="text-[13.5px] text-muted-foreground">
                El éxito se medirá por solicitudes cualificadas y conversión, no por likes. Analytics real entra después de validar el núcleo operativo.
              </p>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "Horas" ? (
        <FounderHoursPanel distribution={hours} totalMinutes={kpis.founderMinutes} />
      ) : null}

      {tab === "Automatización" ? (
        <div className="space-y-5">
          <AutomationScorePanel
            automated={automation.automated}
            standardized={automation.standardized}
            manual={automation.manual}
            tasks={tasks.slice(0, 4)}
          />
          <Card>
            <CardHeader title="Clasificación de tareas" subtitle="Tareas manuales del cliente." />
            <CardBody className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-[13.5px] font-semibold text-foreground">{task.task}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {task.frequency} · {task.minutes} min × {task.timesPerMonth}
                    </p>
                  </div>
                  <Badge tone={classificationTones[task.classification] ?? "neutral"}>
                    {classificationLabels[task.classification] ?? task.classification}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <CycleCreateModal
        clientId={clientId}
        clientName={client.name}
        open={newCycleOpen}
        onClose={() => setNewCycleOpen(false)}
        onCreated={(created) => {
          if (clientId === active.clientId) active.setCycleId(created.id);
        }}
      />
    </>
  );
}

export default ClienteHubPage;
