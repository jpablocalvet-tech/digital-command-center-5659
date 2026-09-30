import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { AgentList } from "../components/panels";
import { useActiveClient } from "../components/active-client";
import { useTeam } from "../queries/team";
import { agentStatusLabels } from "@/lib/labels";

const legend = ["esperando", "trabajando", "completado", "revision", "bloqueado"];

function AiTeamPage() {
  const { clientId, cycleId } = useActiveClient();
  const team = useTeam(clientId, cycleId);

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
          <span className="ml-auto text-[12px]">
            V0.2: estados de referencia por ciclo; la IA real entra en V0.3.
          </span>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Agentes del ciclo" subtitle={`${team.data.length} agentes activos`} />
        <CardBody>
          <AgentList agents={team.data} />
        </CardBody>
      </Card>
    </>
  );
}

export default AiTeamPage;
