import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  AgentList,
  ApprovalWatchItem,
  AttentionList,
  AutomationScorePanel,
  FounderHoursPanel,
  IntegrationsStrip,
  KpiCard,
  LearningCard,
  PipelineView,
  UpcomingContent,
} from "../components/panels";
import { useActiveClient } from "../components/active-client";
import { useDashboard } from "../queries/clients";
import { useDecideContent } from "../queries/content";
import { formatMinutes } from "@/lib/labels";

function Index() {
  const { clientId } = useActiveClient();
  const dashboard = useDashboard(clientId);
  const decide = useDecideContent();

  if (dashboard.isLoading || !dashboard.data) {
    return (
      <>
        <PageHeader title="Inicio" description="Estado del cliente activo en un vistazo." />
        <Loader label="Cargando el Command Center…" />
      </>
    );
  }

  const { client, attention, content, pipeline, agents, hours, tasks, kpis } = dashboard.data;
  const approvalWatch = content.filter(
    (item) => item.approvalState === "listo" || item.approvalState === "dato_por_confirmar",
  );

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Qué está pasando, qué necesita tu atención y qué está haciendo el sistema."
      />

      <div className="space-y-5">
        <Card>
          <CardBody className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{client.code}</Badge>
                <Badge tone="info">{client.type}</Badge>
                <Badge tone="accent" dot>
                  {client.status}
                </Badge>
              </div>
              <h2 className="mt-3 font-display text-[22px] font-extrabold text-foreground">
                {client.name}
              </h2>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Servicio: {client.service}
              </p>
              <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                Objetivo actual: {client.objective}
              </p>
            </div>
            <Link
              to={`/clientes/${client.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Abrir Client Hub
              <ArrowRight className="size-4" />
            </Link>
          </CardBody>
        </Card>

        <AttentionList items={attention} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Contenidos del ciclo" value={String(kpis.cycleContent)} />
          <KpiCard
            label="Listos para aprobación"
            value={String(kpis.readyForApproval)}
            tone={kpis.readyForApproval > 0 ? "warning" : "default"}
            hint="Esperan tu decisión"
          />
          <KpiCard label="Programados" value={String(kpis.scheduled)} />
          <KpiCard label="Leads generados" value={String(kpis.leads)} />
          <KpiCard
            label="Founder Hours"
            value={formatMinutes(kpis.founderMinutes)}
            hint="Objetivo: ≤ 4 h / mes"
          />
          <KpiCard
            label="Automation Score"
            value={`${kpis.automationScore}%`}
            tone="accent"
          />
        </div>

        <PipelineView stages={pipeline} />

        <Card>
          <CardHeader
            title="AI Marketing Team"
            subtitle="Estado de cada agente en el ciclo actual."
            action={
              <Link
                to="/ai-team"
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Ver detalle
              </Link>
            }
          />
          <CardBody>
            <AgentList agents={agents} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Approval Watch"
            subtitle="Contenido que necesita decisión humana."
            action={
              <Link
                to="/aprobaciones"
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Ir a Aprobaciones
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {approvalWatch.length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">
                No hay contenido esperando decisión.
              </p>
            ) : null}
            {approvalWatch.map((item) => (
              <ApprovalWatchItem
                key={item.id}
                item={item}
                actions={
                  item.approvalState === "listo" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: item.id, decision: "aprobar" })}
                      >
                        {decide.isPending && decide.variables?.id === item.id
                          ? "Guardando…"
                          : "Aprobar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: item.id, decision: "cambios" })}
                      >
                        Solicitar cambios
                      </Button>
                      <Link
                        to="/aprobaciones"
                        className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-semibold text-primary hover:underline"
                      >
                        Abrir contenido
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/aprobaciones"
                        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Revisar
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: item.id, decision: "reality_check" })}
                      >
                        Enviar a Reality Checker
                      </Button>
                    </>
                  )
                }
              />
            ))}
          </CardBody>
        </Card>

        <UpcomingContent items={content} />

        <div className="grid gap-5 lg:grid-cols-2">
          <FounderHoursPanel distribution={hours} totalMinutes={kpis.founderMinutes} />
          <AutomationScorePanel
            automated={client.automationScore}
            standardized={client.standardizedScore}
            manual={client.manualScore}
            tasks={tasks.slice(0, 4)}
            footer={
              <Link
                to="/hours-automation"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[12.5px] font-semibold text-primary hover:bg-surface-soft"
              >
                Ver Automation Backlog
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <LearningCard learning={client.learning} />
          <IntegrationsStrip />
        </div>
      </div>
    </>
  );
}

export default Index;
