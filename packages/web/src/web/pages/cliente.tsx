import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  AutomationScorePanel,
  FounderHoursPanel,
  KpiCard,
  LearningCard,
  PipelineView,
} from "../components/panels";
import { useDashboard } from "../queries/clients";
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

function ClienteHubPage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const dashboard = useDashboard(clientId);
  const strategy = useStrategy(clientId);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumen");

  if (dashboard.isLoading || !dashboard.data) {
    return (
      <>
        <PageHeader title="Client Hub" />
        <Loader />
      </>
    );
  }

  const { client, content, pipeline, hours, tasks, kpis } = dashboard.data;

  return (
    <>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Volver a Clientes
      </Link>

      <PageHeader title={client.name} description={`${client.code} · ${client.type}`} />

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="dcc-label">Marca</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.name}</p>
          </div>
          <div>
            <p className="dcc-label">Tipo</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">Cliente interno</p>
          </div>
          <div>
            <p className="dcc-label">Servicio</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">
              Sistema de contenido y gestión digital
            </p>
          </div>
          <div>
            <p className="dcc-label">Objetivo</p>
            <p className="mt-1 text-[13.5px] font-semibold text-foreground">{client.objective}</p>
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
            <KpiCard label="Contenidos del ciclo" value={String(kpis.cycleContent)} />
            <KpiCard label="Listos para aprobación" value={String(kpis.readyForApproval)} />
            <KpiCard label="Founder Hours" value={formatMinutes(kpis.founderMinutes)} />
            <KpiCard label="Automation Score" value={`${kpis.automationScore}%`} tone="accent" />
          </div>
          <PipelineView stages={pipeline} />
          <LearningCard learning={client.learning} />
        </div>
      ) : null}

      {tab === "Marca" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tono de voz" value={client.brandVoice} />
          <Field label="Pilares de marca" value={client.brandPillars} />
          <Field label="Paleta" value={client.brandColors} />
          <Field label="Notas" value={client.brandNotes} />
        </div>
      ) : null}

      {tab === "Objetivos" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Objetivo principal" value={client.objective} />
          <Field label="Servicio" value={client.service} />
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
                    {item.type} · {item.objective}
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
            <KpiCard label="Publicados" value={String(content.filter((c) => c.stage === "publicado").length)} />
          </div>
          <Card>
            <CardHeader title="Resultados comerciales" subtitle="Ciclo en curso." />
            <CardBody>
              <p className="text-[13.5px] text-muted-foreground">
                Todavía no hay contenido publicado, por lo que no hay resultados comerciales que
                reportar. El éxito de este cliente se mide por solicitudes reales, no por likes.
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
            automated={client.automationScore}
            standardized={client.standardizedScore}
            manual={client.manualScore}
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
                      {task.frequency} · {task.minutes} min
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
    </>
  );
}

export default ClienteHubPage;
