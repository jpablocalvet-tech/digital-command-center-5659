import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Loader } from "./layout";
import { useContentDetail, useDecideContent, useUpdateContent } from "../queries/content";
import { approvalDecisionLabels, approvalLabels, approvalTones, checkTones, stageLabels, type Stage } from "@/lib/labels";

type Editable = {
  type: string;
  title: string;
  objective: string;
  cta: string;
  pillar: string;
  channel: string;
  hook: string;
  body: string;
  caption: string;
  visualBrief: string;
  assetUrl: string;
  sourceNotes: string;
  brandReviewNotes: string;
  realityReviewNotes: string;
  scheduledLabel: string;
  scheduledBucket: string;
  note: string;
};

const empty: Editable = {
  type: "",
  title: "",
  objective: "",
  cta: "",
  pillar: "",
  channel: "",
  hook: "",
  body: "",
  caption: "",
  visualBrief: "",
  assetUrl: "",
  sourceNotes: "",
  brandReviewNotes: "",
  realityReviewNotes: "",
  scheduledLabel: "",
  scheduledBucket: "",
  note: "",
};

function TextField({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="dcc-label">{label}</label>
      {rows > 1 ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        />
      )}
    </div>
  );
}

export function ContentDetailDialog({
  id,
  onClose,
  showDecisionActions = true,
}: {
  id: number;
  onClose: () => void;
  showDecisionActions?: boolean;
}) {
  const detail = useContentDetail(id);
  const update = useUpdateContent();
  const decide = useDecideContent();
  const [values, setValues] = useState<Editable>(empty);
  const [dirty, setDirty] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    if (!detail.data?.item) return;
    const item = detail.data.item;
    setValues({
      type: item.type,
      title: item.title,
      objective: item.objective,
      cta: item.cta,
      pillar: item.pillar,
      channel: item.channel,
      hook: item.hook,
      body: item.body,
      caption: item.caption,
      visualBrief: item.visualBrief,
      assetUrl: item.assetUrl,
      sourceNotes: item.sourceNotes,
      brandReviewNotes: item.brandReviewNotes,
      realityReviewNotes: item.realityReviewNotes,
      scheduledLabel: item.scheduledLabel,
      scheduledBucket: item.scheduledBucket,
      note: item.note,
    });
    setDirty(false);
  }, [detail.data]);

  const set = (key: keyof Editable, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/45 px-4 py-6 md:py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de contenido"
        className="w-full max-w-5xl rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-xl border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="dcc-label">Detalle de contenido</p>
            <p className="mt-1 font-display text-[18px] font-bold text-foreground">
              {detail.data?.item.title ?? "Cargando contenido…"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-surface-soft"
          >
            <X className="size-4" />
          </button>
        </div>

        {detail.isLoading || !detail.data ? (
          <div className="p-5">
            <Loader />
          </div>
        ) : (
          <div className="space-y-6 p-5 md:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="primary">{detail.data.item.type}</Badge>
              <Badge tone="neutral">
                {stageLabels[detail.data.item.stage as Stage] ?? detail.data.item.stage}
              </Badge>
              <Badge tone={approvalTones[detail.data.item.approvalState] ?? "neutral"}>
                {approvalLabels[detail.data.item.approvalState] ?? detail.data.item.approvalState}
              </Badge>
              <Badge tone={checkTones[detail.data.item.brandStatus] ?? "neutral"}>
                Brand: {detail.data.item.brandStatus}
              </Badge>
              <Badge tone={checkTones[detail.data.item.realityStatus] ?? "neutral"}>
                Reality: {detail.data.item.realityStatus}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Tipo" value={values.type} onChange={(v) => set("type", v)} />
              <TextField label="Canal" value={values.channel} onChange={(v) => set("channel", v)} />
              <div className="md:col-span-2">
                <TextField label="Título" value={values.title} onChange={(v) => set("title", v)} />
              </div>
              <TextField label="Pilar" value={values.pillar} onChange={(v) => set("pillar", v)} />
              <TextField label="Objetivo" value={values.objective} onChange={(v) => set("objective", v)} />
              <div className="md:col-span-2">
                <TextField label="Hook" value={values.hook} onChange={(v) => set("hook", v)} rows={2} />
              </div>
              <div className="md:col-span-2">
                <TextField label="Copy / Script" value={values.body} onChange={(v) => set("body", v)} rows={6} />
              </div>
              <div className="md:col-span-2">
                <TextField label="Caption" value={values.caption} onChange={(v) => set("caption", v)} rows={4} />
              </div>
              <TextField label="CTA" value={values.cta} onChange={(v) => set("cta", v)} />
              <TextField
                label="Asset / Canva URL"
                value={values.assetUrl}
                onChange={(v) => set("assetUrl", v)}
              />
              <div className="md:col-span-2">
                <TextField
                  label="Visual Brief"
                  value={values.visualBrief}
                  onChange={(v) => set("visualBrief", v)}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <TextField
                  label="Fuentes / notas"
                  value={values.sourceNotes}
                  onChange={(v) => set("sourceNotes", v)}
                  rows={3}
                />
              </div>
              <TextField
                label="Brand Guardian · notas"
                value={values.brandReviewNotes}
                onChange={(v) => set("brandReviewNotes", v)}
                rows={3}
              />
              <TextField
                label="Reality Checker · notas"
                value={values.realityReviewNotes}
                onChange={(v) => set("realityReviewNotes", v)}
                rows={3}
              />
              <TextField
                label="Etiqueta de calendario"
                value={values.scheduledLabel}
                onChange={(v) => set("scheduledLabel", v)}
              />
              <TextField
                label="Ventana de publicación (hoy / mañana / semana)"
                value={values.scheduledBucket}
                onChange={(v) => set("scheduledBucket", v)}
              />
              <div className="md:col-span-2">
                <TextField label="Nota interna" value={values.note} onChange={(v) => set("note", v)} rows={2} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button
                disabled={!dirty || update.isPending}
                onClick={() =>
                  update.mutate(
                    { id, ...values },
                    { onSuccess: () => setDirty(false) },
                  )
                }
              >
                {update.isPending ? "Guardando…" : dirty ? "Guardar contenido" : "Guardado"}
              </Button>
              {values.assetUrl ? (
                <a
                  href={values.assetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-semibold text-primary hover:bg-surface-soft"
                >
                  Abrir asset
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
            </div>

            {showDecisionActions ? (
              <div className="rounded-lg border border-border bg-surface-soft/40 p-4">
                <label className="dcc-label" htmlFor="decision-note">
                  Nota de decisión (opcional)
                </label>
                <input
                  id="decision-note"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Ej.: ajustar el primer hook antes de programar"
                  className="mt-2 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate(
                        { id, decision: "aprobar", note: decisionNote || undefined },
                        { onSuccess: () => setDecisionNote("") },
                      )
                    }
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate(
                        { id, decision: "cambios", note: decisionNote || undefined },
                        { onSuccess: () => setDecisionNote("") },
                      )
                    }
                  >
                    Solicitar cambios
                  </Button>
                  <Button
                    variant="outline"
                    className="border-critical/40 text-critical hover:bg-critical/5"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate(
                        { id, decision: "rechazar", note: decisionNote || undefined },
                        { onSuccess: () => setDecisionNote("") },
                      )
                    }
                  >
                    Rechazar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate(
                        { id, decision: "reality_check", note: decisionNote || undefined },
                        { onSuccess: () => setDecisionNote("") },
                      )
                    }
                  >
                    Enviar a Reality Checker
                  </Button>
                </div>
              </div>
            ) : null}

            <div>
              <p className="dcc-label">Historial de decisiones</p>
              <div className="mt-2 space-y-2">
                {detail.data.events.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Todavía no hay eventos.</p>
                ) : (
                  detail.data.events.map((event) => (
                    <div key={event.id} className="rounded-md border border-border px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{approvalDecisionLabels[event.decision] ?? event.decision}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {new Date(String(event.createdAt)).toLocaleString("es-MX")}
                        </p>
                      </div>
                      {event.note ? (
                        <p className="mt-1 text-[12.5px] text-muted-foreground">{event.note}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
