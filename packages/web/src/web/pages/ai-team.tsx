import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { AgentList } from "../components/panels";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useActiveClient } from "../components/active-client";
import { useTeam } from "../queries/team";
import {
  useContent,
  useGenerateContentBatch,
  useReviewBrandBatch,
  useReviewRealityBatch,
} from "../queries/content";
import { useAIExecutions, useAIStatus } from "../queries/strategy";
import { useCycle } from "../queries/cycles";
import { useStrategy } from "../queries/strategy";
import {
  useGenerateResearchBrief,
  useResearchBrief,
  useReviewResearchBrief,
} from "../queries/research";
import { agentStatusLabels } from "@/lib/labels";

const legend = ["esperando", "trabajando", "completado", "revision", "bloqueado"];

function ResearchSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="dcc-label">{title}</h3>
      {items.length ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-foreground">
          {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">Sin elementos registrados.</p>
      )}
    </section>
  );
}

function AiTeamPage() {
  const { clientId, cycleId } = useActiveClient();
  const team = useTeam(clientId, cycleId);
  const executions = useAIExecutions(clientId, cycleId);
  const aiStatus = useAIStatus();
  const cycle = useCycle(cycleId);
  const strategy = useStrategy(clientId, cycleId);
  const researchBrief = useResearchBrief(clientId, cycleId);
  const content = useContent(clientId, cycleId);
  const generateBrief = useGenerateResearchBrief();
  const generateContent = useGenerateContentBatch(clientId, cycleId);
  const reviewBrand = useReviewBrandBatch(clientId, cycleId);
  const reviewReality = useReviewRealityBatch(clientId, cycleId);
  const reviewBrief = useReviewResearchBrief(clientId, cycleId);
  const [humanNote, setHumanNote] = useState("");
  const savedBrief = researchBrief.data;
  const parsedBrief = savedBrief?.brief;
  const canGenerateBrief =
    cycle.data?.objectiveStatus === "aprobado" &&
    Boolean(cycle.data.objective.trim()) &&
    Boolean(strategy.data?.audience.trim()) &&
    Boolean(strategy.data?.problems.trim()) &&
    Boolean(strategy.data?.pillars.trim());
  const hasSavedStrategy =
    Boolean(strategy.data?.audience.trim()) &&
    Boolean(strategy.data?.problems.trim()) &&
    Boolean(strategy.data?.pillars.trim());
  const canGenerateContent =
    clientId > 0 &&
    cycleId > 0 &&
    cycle.data?.clientId === clientId &&
    cycle.data.objectiveStatus === "aprobado" &&
    Boolean(cycle.data.objective.trim()) &&
    hasSavedStrategy &&
    savedBrief?.reviewStatus === "aprobado" &&
    content.data?.length === 0;
  const generatedBatch =
    generateContent.data?.clientId === clientId &&
    generateContent.data.cycleId === cycleId
      ? generateContent.data
      : undefined;

  useEffect(() => {
    setHumanNote(savedBrief?.humanNote ?? "");
  }, [savedBrief?.id, savedBrief?.humanNote]);

  const displayedAgents = team.data?.map((agent) => {
    if (
      agent.name !== "Marketing Orchestrator" &&
      agent.name !== "Research Agent" &&
      agent.name !== "Content Agent" &&
      agent.name !== "Brand Guardian" &&
      agent.name !== "Reality Checker"
    ) return agent;
    const execution = executions.data?.find((item) => item.agent === agent.name);
    if (!execution) {
      return [
        "Research Agent",
        "Content Agent",
        "Brand Guardian",
        "Reality Checker",
      ].includes(agent.name)
        ? { ...agent, status: "esperando", lastAction: "Sin ejecución real todavía" }
        : agent;
    }
    return {
      ...agent,
      status:
        execution.status === "generando"
          ? "trabajando"
          : execution.status === "completado"
            ? "completado"
            : "bloqueado",
      lastAction:
        execution.status === "error"
          ? execution.errorMessage
          : `${execution.action} · ${execution.status}`,
    };
  });

  if (!cycleId || team.isLoading || !team.data) {
    return (
      <>
        <PageHeader title="AI Marketing Team" />
        <Loader />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="AI Marketing Team"
        description="Quién hace qué dentro del sistema y en qué estado está cada agente."
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
          <span className="dcc-label">Estados</span>
          {legend.map((status) => (
            <span key={status}>{agentStatusLabels[status]}</span>
          ))}
          <span className="ml-auto text-[12px]">Los agentes restantes conservan estados de referencia.</span>
        </CardBody>
      </Card>

      {!aiStatus.isLoading && aiStatus.data?.configured === false ? (
        <Card className="mb-5 border-l-[3px] border-l-warning">
          <CardBody className="text-[13.5px] font-semibold text-warning">IA no configurada</CardBody>
        </Card>
      ) : null}

      <Card className="mb-5">
        <CardHeader
          title="Ejecuciones reales"
          subtitle="Estado y duración de las últimas operaciones de IA del ciclo."
        />
        <CardBody className="grid gap-3 md:grid-cols-2">
          {[
            "Objective Builder",
            "Marketing Orchestrator",
            "Research Agent",
            "Content Agent",
            "Brand Guardian",
            "Reality Checker",
          ].map((agentName) => {
            const execution = executions.data?.find((item) => item.agent === agentName);
            const elapsed = execution?.completedAt
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(execution.completedAt).getTime() -
                      new Date(execution.startedAt).getTime()) /
                      1000,
                  ),
                )
              : null;
            const statusLabel =
              execution?.status === "generando"
                ? "Trabajando"
                : execution?.status === "completado"
                  ? "Completado"
                  : execution?.status === "error"
                    ? "Error"
                    : "Sin ejecución";
            return (
              <div key={agentName} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-foreground">{agentName}</p>
                  <Badge
                    tone={
                      execution?.status === "error"
                        ? "critical"
                        : execution?.status === "completado"
                          ? "success"
                          : execution?.status === "generando"
                            ? "info"
                            : "neutral"
                    }
                    dot
                  >
                    {statusLabel}
                  </Badge>
                </div>
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  {execution
                    ? `${execution.action} · ${execution.model}${elapsed === null ? "" : ` · ${elapsed} s`}`
                    : "Aún no hay ejecuciones registradas en este ciclo."}
                </p>
                {execution?.errorMessage ? (
                  <p className="mt-2 text-[12.5px] text-critical">{execution.errorMessage}</p>
                ) : null}
                {agentName === "Research Agent" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      disabled={
                        !aiStatus.data?.configured ||
                        !canGenerateBrief ||
                        generateBrief.isPending
                      }
                      onClick={() => generateBrief.mutate({ clientId, cycleId })}
                    >
                      <Sparkles className="size-4" />
                      {generateBrief.isPending ? "Generando…" : "Generar Research Brief"}
                    </Button>
                    {!canGenerateBrief ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Requiere objetivo aprobado y estrategia guardada con audiencia, problemas y pilares.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {agentName === "Content Agent" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      disabled={
                        !aiStatus.data?.configured ||
                        !canGenerateContent ||
                        content.isLoading ||
                        generateContent.isPending
                      }
                      onClick={() => generateContent.mutate({ clientId, cycleId })}
                    >
                      <Sparkles className="size-4" />
                      {generateContent.isPending
                        ? "Generando…"
                        : "Generar contenidos del ciclo"}
                    </Button>
                    {content.data && content.data.length > 0 && !generatedBatch ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Este ciclo ya tiene piezas de contenido. Revísalas en Producción antes de generar un nuevo lote.
                      </p>
                    ) : cycle.isError ||
                      strategy.isError ||
                      researchBrief.isError ||
                      content.isError ? (
                      <p className="mt-2 text-[12px] text-critical">
                        No fue posible comprobar los requisitos guardados del ciclo.
                      </p>
                    ) : cycle.isLoading ||
                      strategy.isLoading ||
                      researchBrief.isLoading ||
                      content.isLoading ||
                      !cycle.data ||
                      !strategy.data ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Comprobando requisitos guardados del ciclo…
                      </p>
                    ) : !cycle.data.objective.trim() || cycle.data.objectiveStatus !== "aprobado" ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Requiere un objetivo del ciclo aprobado.
                      </p>
                    ) : !hasSavedStrategy ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Requiere estrategia guardada con audiencia, problemas y pilares.
                      </p>
                    ) : savedBrief?.reviewStatus !== "aprobado" ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Requiere que el Research Brief más reciente esté aprobado.
                      </p>
                    ) : null}
                    {generateContent.isError ? (
                      <p className="mt-2 text-[12.5px] text-critical">
                        {generateContent.error instanceof Error
                          ? generateContent.error.message
                          : "No fue posible generar contenidos"}
                      </p>
                    ) : null}
                    {generatedBatch ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                        <span className="text-success">
                          {generatedBatch.createdCount} piezas creadas.
                        </span>
                        <Link to="/produccion" className="font-semibold text-primary hover:underline">
                          Ver en Producción
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {agentName === "Brand Guardian" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      disabled={
                        !aiStatus.data?.configured ||
                        !content.data?.length ||
                        content.isLoading ||
                        reviewBrand.isPending
                      }
                      onClick={() => reviewBrand.mutate({ clientId, cycleId })}
                    >
                      <Sparkles className="size-4" />
                      {reviewBrand.isPending ? "Revisando…" : "Revisar marca del lote"}
                    </Button>
                    {reviewBrand.isError ? (
                      <p className="mt-2 text-[12.5px] text-critical">
                        {reviewBrand.error instanceof Error
                          ? reviewBrand.error.message
                          : "No fue posible revisar la marca del lote"}
                      </p>
                    ) : null}
                    {reviewBrand.data?.clientId === clientId &&
                    reviewBrand.data.cycleId === cycleId ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                        <span className="text-muted-foreground">
                          {reviewBrand.data.approvedCount} aprobadas ·{" "}
                          {reviewBrand.data.needsReviewCount} en revisión
                        </span>
                        <Link to="/produccion" className="font-semibold text-primary hover:underline">
                          Ver en Producción
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {agentName === "Reality Checker" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      disabled={
                        !aiStatus.data?.configured ||
                        !content.data?.length ||
                        content.isLoading ||
                        reviewReality.isPending
                      }
                      onClick={() => reviewReality.mutate({ clientId, cycleId })}
                    >
                      <Sparkles className="size-4" />
                      {reviewReality.isPending ? "Verificando…" : "Verificar afirmaciones"}
                    </Button>
                    {reviewReality.isError ? (
                      <p className="mt-2 text-[12.5px] text-critical">
                        {reviewReality.error instanceof Error
                          ? reviewReality.error.message
                          : "No fue posible verificar las afirmaciones"}
                      </p>
                    ) : null}
                    {reviewReality.data?.clientId === clientId &&
                    reviewReality.data.cycleId === cycleId ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                        <span className="text-muted-foreground">
                          {reviewReality.data.verifiedCount} verificadas ·{" "}
                          {reviewReality.data.needsConfirmationCount} con datos por confirmar
                        </span>
                        <Link to="/produccion" className="font-semibold text-primary hover:underline">
                          Ver en Producción
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {generateBrief.isError ? (
        <Card className="mb-5 border-l-[3px] border-l-critical">
          <CardBody className="text-[13px] text-critical">
            {generateBrief.error instanceof Error
              ? generateBrief.error.message
              : "No fue posible generar el Research Brief"}
          </CardBody>
        </Card>
      ) : null}

      <Card className="mb-5">
        <CardHeader
          title="Research Brief"
          subtitle={
            savedBrief
              ? `Generado ${new Date(savedBrief.createdAt).toLocaleString()}`
              : "Todavía no hay un brief para este ciclo."
          }
          action={
            savedBrief ? (
              <Badge
                tone={
                  savedBrief.reviewStatus === "aprobado"
                    ? "success"
                    : savedBrief.reviewStatus === "cambios"
                      ? "warning"
                      : "neutral"
                }
                dot
              >
                {savedBrief.reviewStatus === "aprobado"
                  ? "Aprobado · revisión humana"
                  : savedBrief.reviewStatus === "cambios"
                    ? "Requiere cambios"
                    : "Pendiente de revisión"}
              </Badge>
            ) : null
          }
        />
        <CardBody className="space-y-5">
          <p className="border-l-2 border-info pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Este brief usa únicamente información interna disponible. No incluye investigación web externa.
            La aprobación humana no significa que las afirmaciones estén verificadas externamente.
          </p>
          {researchBrief.isLoading ? (
            <Loader label="Cargando Research Brief…" />
          ) : parsedBrief ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <ResearchSection
                  title="Insights de audiencia"
                  items={parsedBrief.audienceInsights.map(
                    (item) => `${item.insight} (${item.basis === "contexto_proporcionado" ? "contexto proporcionado" : "hipótesis"})`,
                  )}
                />
                <ResearchSection
                  title="Problemas/necesidades a validar"
                  items={parsedBrief.problemsToValidate.map(
                    (item) => `${item.problem} — ${item.whyItMatters}`,
                  )}
                />
                <ResearchSection title="Preguntas abiertas" items={parsedBrief.openQuestions} />
                <ResearchSection
                  title="Oportunidades de contenido"
                  items={parsedBrief.contentOpportunities.map(
                    (item) => `${item.topic} — ${item.relevance} Pilar relacionado: ${item.relatedPillar}`,
                  )}
                />
                <ResearchSection
                  title="Afirmaciones por verificar"
                  items={parsedBrief.claimsToVerify.map(
                    (item) => `${item.claim} — Evidencia necesaria: ${item.evidenceNeeded}`,
                  )}
                />
                <ResearchSection title="Notas de investigación" items={parsedBrief.researchNotes} />
                <ResearchSection title="Limitaciones" items={parsedBrief.limitations} />
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <label className="dcc-label" htmlFor="research-human-note">Nota humana</label>
                <textarea
                  id="research-human-note"
                  rows={2}
                  maxLength={5000}
                  value={humanNote}
                  onChange={(event) => setHumanNote(event.target.value)}
                  className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={reviewBrief.isPending}
                    onClick={() =>
                      reviewBrief.mutate({
                        id: savedBrief.id,
                        clientId,
                        cycleId,
                        reviewStatus: "aprobado",
                        humanNote,
                      })
                    }
                  >
                    <CheckCircle2 className="size-4" />
                    Aprobar brief
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewBrief.isPending}
                    onClick={() =>
                      reviewBrief.mutate({
                        id: savedBrief.id,
                        clientId,
                        cycleId,
                        reviewStatus: "cambios",
                        humanNote,
                      })
                    }
                  >
                    <RotateCcw className="size-4" />
                    Requiere cambios
                  </Button>
                </div>
                {reviewBrief.isError ? (
                  <p className="text-[12.5px] text-critical">
                    {reviewBrief.error instanceof Error
                      ? reviewBrief.error.message
                      : "No fue posible guardar la revisión"}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Agentes del ciclo" subtitle={`${team.data.length} agentes activos`} />
        <CardBody>
          <AgentList agents={displayedAgents ?? team.data} />
        </CardBody>
      </Card>
    </>
  );
}

export default AiTeamPage;
