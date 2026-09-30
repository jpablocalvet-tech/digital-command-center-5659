import { ChevronLeft, ChevronRight } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Badge } from "../components/ui/badge";
import { useActiveClient } from "../components/active-client";
import { useContent, useSetStage } from "../queries/content";
import { stageLabels, stageOrder, type Stage } from "@/lib/labels";
import type { ContentRow } from "@/types/dcc";

function ProduccionPage() {
  const { clientId } = useActiveClient();
  const content = useContent(clientId);
  const setStage = useSetStage(clientId);

  if (content.isLoading || !content.data) {
    return (
      <>
        <PageHeader title="Producción" />
        <Loader />
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
        description="Tablero del ciclo. Mueve cada pieza de fase con las flechas."
      />

      <div className="dcc-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {stageOrder.map((stage) => {
          const column = items.filter((item) => item.stage === stage);
          return (
            <div
              key={stage}
              className="flex w-[260px] shrink-0 flex-col rounded-lg border border-border bg-surface-soft/60"
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
                      <Badge tone="neutral">{item.type}</Badge>
                      <p className="mt-2 text-[13px] font-semibold leading-snug text-foreground">
                        {item.title}
                      </p>
                      {item.objective ? (
                        <p className="mt-1 text-[12px] text-muted-foreground">{item.objective}</p>
                      ) : null}
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
                        ) : null}
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
    </>
  );
}

export default ProduccionPage;
