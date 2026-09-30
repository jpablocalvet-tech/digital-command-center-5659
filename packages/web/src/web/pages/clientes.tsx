import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useClients } from "../queries/clients";
import { formatMinutes } from "@/lib/labels";

function ClientesPage() {
  const clients = useClients();

  if (clients.isLoading || !clients.data) {
    return (
      <>
        <PageHeader title="Clientes" description="Cartera de clientes de la agencia." />
        <Loader />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cada cliente con su objetivo, horas del fundador y nivel de automatización."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.data.map((client) => (
          <Card key={client.id} className="flex flex-col">
            <CardBody className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{client.code}</Badge>
                <Badge tone="info">{client.type}</Badge>
                <Badge tone="accent" dot>
                  {client.status}
                </Badge>
              </div>
              <h2 className="mt-3 font-display text-[18px] font-bold text-foreground">
                {client.name}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Objetivo: {client.activeCycleObjective ?? client.objective}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div>
                  <p className="dcc-label">Founder Hours · ciclo activo</p>
                  <p className="dcc-num mt-1 font-display text-[18px] font-bold text-foreground">
                    {formatMinutes(client.founderMinutes ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="dcc-label">Automation</p>
                  <p className="dcc-num mt-1 font-display text-[18px] font-bold text-accent">
                    {client.automationScore}%
                  </p>
                </div>
              </div>
            </CardBody>
            <div className="border-t border-border px-5 py-3">
              <Link
                to={`/clientes/${client.id}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
              >
                Abrir Client Hub
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default ClientesPage;
