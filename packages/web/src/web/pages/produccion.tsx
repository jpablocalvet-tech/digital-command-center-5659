import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Badge } from "../components/ui/badge";
import { ContentDetailDialog } from "../components/content-detail";
import { useActiveClient } from "../components/active-client";
import { useContent, useSetStage } from "../queries/content";
import { stageLabels, stageOrder, type Stage } from "@/lib/labels";
import type { ContentRow } from "@/types/dcc";

function ProduccionPage() {
  const { clientId, cycleId } = useActiveClient();
  const content = useContent(clientId, cycleId);
  const setStage = useSetStage(clientId, cycleId);
  const [openId, setOpenId] = useState<number | null>(null);

  if (!cycleId || content.isLoading || !content.data) {
    return (
      <>
        <PageHeader title="Producción" />
        <Loader label={cycleId ? "Cargando producción…" : "Seleccionando ciclo…"} />
      </>
    );
  }

  const items = content.data as ContentRow[];

  const move = (item: ContentRow, direction: -1 | 1) => {
    const index = stageOrder.indexOf(item.stage as Stage);
    const next = stageOrder[index + direction];
    if (!next) return;
    setStage.mutate({ id: item.id, stage: next });
  };

  return (
    <>
      <PageHeader
        title="Producción"
        description="Una sola fuente de verdad para el ciclo. Cada movimiento actualiza Inicio, pipeline y aprobaciones."
      />

      <div className="dcc-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {stageOrder.map((stage) => {
          const column = items.filter((item) => item.stage === stage);
          return (
            <div
              key={stage}
              className="flex w-[270px] shrink-0 flex-col rounded-lg border border-border bg-surface-soft/60"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <p className="text-[12.5px] font-bold text-foreground">{stageLabels[stage]}</p>
                <span className="dcc-num rounded-full bg-card px-2 py-0.5 text-[11.5px] font-semibold text-muted-foreground">
                  {column.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-3 text-[12.5px] text-muted-foreground">Sin piezas</p>
                ) : null}
                {column.map((item) => {
                  const index = stageOrder.indexOf(item.stage as Stage);
                  return (
                    <div key={item.id} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="neutral">{item.type}</Badge>
                        {item.channel ? (
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {item.channel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[13px] font-semibold leading-snug text-foreground">
                        {item.title}
                      </p>
                      {item.pillar ? (
                        <p className="mt-1 text-[11.5px] text-muted-foreground">{item.pillar}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setOpenId(item.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
                      >
                        <Eye className="size-3.5" />
                        Abrir contenido
                      </button>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                        <button
                          type="button"
                          aria-label="Fase anterior"
                          disabled={index === 0 || setStage.isPending}
                          onClick={() => move(item, -1)}
                          className="rounded-md border border-border p-1.5 text-muted-foreground disabled:opacity-40 hover:bg-surface-soft"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        {item.scheduledLabel ? (
                          <span className="text-[11.5px] font-semibold text-muted-foreground">
                            {item.scheduledLabel}
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-muted-foreground">Sin fecha</span>
                        )}
                        <button
                          type="button"
                          aria-label="Fase siguiente"
                          disabled={index === stageOrder.length - 1 || setStage.isPending}
                          onClick={() => move(item, 1)}
                          className="rounded-md border border-border p-1.5 text-muted-foreground disabled:opacity-40 hover:bg-surface-soft"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openId ? <ContentDetailDialog id={openId} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

export default ProduccionPage;
