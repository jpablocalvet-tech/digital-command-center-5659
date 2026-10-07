import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { AgentList } from "../components/panels";
import { Badge } from "../components/ui/badge";
import { useActiveClient } from "../components/active-client";
import { useTeam } from "../queries/team";
import { useAIExecutions, useAIStatus } from "../queries/strategy";
import { agentStatusLabels } from "@/lib/labels";

const legend = ["esperando", "trabajando", "completado", "revision", "bloqueado"];

function AiTeamPage() {
  const { clientId, cycleId } = useActiveClient();
  const team = useTeam(clientId, cycleId);
  const executions = useAIExecutions(clientId, cycleId);
  const aiStatus = useAIStatus();
  const displayedAgents = team.data?.map((agent) => {
    if (agent.name !== "Marketing Orchestrator") return agent;
    const execution = executions.data?.find((item) => item.agent === agent.name);
    if (!execution) return agent;
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
          {["Objective Builder", "Marketing Orchestrator"].map((agentName) => {
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
                ? "Generando"
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
              </div>
            );
          })}
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
