import { useState } from "react";
import { Eye } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ContentDetailDialog } from "../components/content-detail";
import { useActiveClient } from "../components/active-client";
import { useContent, useDecideContent } from "../queries/content";
import {
  approvalLabels,
  approvalTones,
  checkTones,
  stageLabels,
  type Stage,
} from "@/lib/labels";
import type { ContentRow } from "@/types/dcc";

function ApprovalRow({ item, onOpen }: { item: ContentRow; onOpen: () => void }) {
  const decide = useDecideContent();
  const [note, setNote] = useState("");
  const pending = decide.isPending && decide.variables?.id === item.id;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{item.type}</Badge>
          {item.channel ? <Badge tone="neutral">{item.channel}</Badge> : null}
          <Badge tone="neutral">{stageLabels[item.stage as Stage] ?? item.stage}</Badge>
          <Badge tone={approvalTones[item.approvalState] ?? "neutral"}>
            {approvalLabels[item.approvalState] ?? item.approvalState}
          </Badge>
        </div>

        <h2 className="mt-3 font-display text-[18px] font-bold text-foreground">{item.title}</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="dcc-label">Objetivo</p>
            <p className="mt-1 text-[13.5px] text-foreground">{item.objective || "—"}</p>
          </div>
          <div>
            <p className="dcc-label">CTA</p>
            <p className="mt-1 text-[13.5px] text-foreground">{item.cta || "—"}</p>
          </div>
          <div>
            <p className="dcc-label">Brand Guardian</p>
            <div className="mt-1.5">
              <Badge tone={checkTones[item.brandStatus] ?? "neutral"}>{item.brandStatus}</Badge>
            </div>
          </div>
          <div>
            <p className="dcc-label">Reality Checker</p>
            <div className="mt-1.5">
              <Badge tone={checkTones[item.realityStatus] ?? "neutral"}>{item.realityStatus}</Badge>
            </div>
          </div>
        </div>

        {item.hook ? (
          <div className="mt-4 rounded-md bg-surface-soft/70 px-3 py-2.5">
            <p className="dcc-label">Hook</p>
            <p className="mt-1 text-[13px] text-foreground">{item.hook}</p>
          </div>
        ) : null}

        {item.note ? (
          <p className="mt-3 rounded-md bg-surface-soft/70 px-3 py-2.5 text-[13px] text-muted-foreground">
            {item.note}
          </p>
        ) : null}

        <div className="mt-4">
          <label className="dcc-label" htmlFor={`nota-${item.id}`}>
            Nota para el equipo (opcional)
          </label>
          <input
            id={`nota-${item.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ej.: ajustar el gancho del primer slide"
            className="mt-2 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: item.id, decision: "aprobar", note: note || undefined },
                { onSuccess: () => setNote("") },
              )
            }
          >
            {pending ? "Guardando…" : "Aprobar"}
          </Button>
          <Button
            variant="outline"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: item.id, decision: "cambios", note: note || undefined },
                { onSuccess: () => setNote("") },
              )
            }
          >
            Solicitar cambio
          </Button>
          <Button
            variant="outline"
            className="border-critical/40 text-critical hover:bg-critical/5"
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: item.id, decision: "rechazar", note: note || undefined },
                { onSuccess: () => setNote("") },
              )
            }
          >
            Rechazar
          </Button>
          <Button variant="ghost" onClick={onOpen}>
            <Eye className="size-4" />
            Abrir contenido + historial
          </Button>
          {item.realityStatus === "Dato por confirmar" ? (
            <Button
              variant="ghost"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ id: item.id, decision: "reality_check" })}
            >
              Enviar a Reality Checker
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function AprobacionesPage() {
  const { clientId, cycleId } = useActiveClient();
  const content = useContent(clientId, cycleId);
  const [openId, setOpenId] = useState<number | null>(null);

  if (!cycleId || content.isLoading || !content.data) {
    return (
      <>
        <PageHeader title="Aprobaciones" />
        <Loader label={cycleId ? "Cargando aprobaciones…" : "Seleccionando ciclo…"} />
      </>
    );
  }

  const items = content.data as ContentRow[];
  const pending = items.filter(
    (item) => item.approvalState === "listo" || item.approvalState === "dato_por_confirmar",
  );
  const decided = items.filter((item) =>
    ["aprobado", "rechazado", "cambios"].includes(item.approvalState),
  );

  return (
    <>
      <PageHeader
        title="Aprobaciones"
        description="Decisiones humanas pendientes. Cada decisión queda registrada en el historial."
      />

      <div className="space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardBody className="text-[13.5px] text-muted-foreground">
              No hay contenido esperando decisión ahora mismo.
            </CardBody>
          </Card>
        ) : null}
        {pending.map((item) => (
          <ApprovalRow key={item.id} item={item} onOpen={() => setOpenId(item.id)} />
        ))}
      </div>

      {decided.length > 0 ? (
        <div className="mt-8">
          <p className="dcc-label mb-3">Decisiones recientes del ciclo</p>
          <div className="space-y-2">
            {decided.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(item.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-left hover:bg-surface-soft/50"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{item.type}</p>
                </div>
                <Badge tone={approvalTones[item.approvalState] ?? "neutral"}>
                  {approvalLabels[item.approvalState] ?? item.approvalState}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {openId ? <ContentDetailDialog id={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

export default AprobacionesPage;
