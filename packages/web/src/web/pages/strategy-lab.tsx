import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, Sparkles } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useActiveClient } from "../components/active-client";
import { useCycle, usePreviewObjective, useUpdateCycleObjective } from "../queries/cycles";
import {
  useAIStatus,
  useGenerateStrategy,
  useSaveStrategy,
  useStrategy,
} from "../queries/strategy";

type Values = {
  objective: string;
  audience: string;
  problems: string;
  valueProp: string;
  competitors: string;
  pillars: string;
  channels: string;
  mainCta: string;
};

type ObjectiveValues = {
  businessGoal: string;
  objective: string;
  primaryMetric: string;
  baseline: string;
  target: string;
  objectiveRationale: string;
};

type ObjectiveProposal = {
  objective: string;
  primaryMetric: string;
  successCriteria: string[];
  reasoning: string;
  assumptions: string[];
  confidenceNotes: string[];
};

function parseProposal(value: string): ObjectiveProposal | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ObjectiveProposal;
  } catch {
    return null;
  }
}

const fields: { key: keyof Values; label: string; hint: string; rows: number }[] = [
  { key: "audience", label: "Audiencia", hint: "A quién le hablamos", rows: 3 },
  { key: "problems", label: "Problemas del cliente", hint: "Qué le duele hoy", rows: 3 },
  { key: "valueProp", label: "Propuesta de valor", hint: "Por qué nosotros", rows: 3 },
  { key: "competitors", label: "Competidores", hint: "Con quién nos comparan", rows: 3 },
  { key: "pillars", label: "Pilares de contenido", hint: "Temas que repetimos", rows: 3 },
  { key: "channels", label: "Canales", hint: "Dónde publicamos", rows: 2 },
  { key: "mainCta", label: "CTA principal", hint: "Qué pedimos a la audiencia", rows: 2 },
];

const empty: Values = {
  objective: "",
  audience: "",
  problems: "",
  valueProp: "",
  competitors: "",
  pillars: "",
  channels: "",
  mainCta: "",
};

const emptyObjective: ObjectiveValues = {
  businessGoal: "",
  objective: "",
  primaryMetric: "",
  baseline: "",
  target: "",
  objectiveRationale: "",
};

function StrategyLabPage() {
  const { clientId, cycleId } = useActiveClient();
  const cycle = useCycle(cycleId);
  const strategy = useStrategy(clientId, cycleId);
  const save = useSaveStrategy();
  const generateStrategy = useGenerateStrategy();
  const aiStatus = useAIStatus();
  const previewObjective = usePreviewObjective();
  const updateObjective = useUpdateCycleObjective();
  const [values, setValues] = useState<Values>(empty);
  const [objectiveValues, setObjectiveValues] = useState<ObjectiveValues>(emptyObjective);
  const [dirty, setDirty] = useState(false);
  const [objectiveDirty, setObjectiveDirty] = useState(false);

  useEffect(() => {
    if (!strategy.data) return;
    setValues({
      objective: strategy.data.objective,
      audience: strategy.data.audience,
      problems: strategy.data.problems,
      valueProp: strategy.data.valueProp,
      competitors: strategy.data.competitors,
      pillars: strategy.data.pillars,
      channels: strategy.data.channels,
      mainCta: strategy.data.mainCta,
    });
    setDirty(false);
  }, [strategy.data]);

  useEffect(() => {
    if (!cycle.data) return;
    setObjectiveValues({
      businessGoal: cycle.data.businessGoal,
      objective: cycle.data.objective,
      primaryMetric: cycle.data.primaryMetric,
      baseline: cycle.data.baseline,
      target: cycle.data.target,
      objectiveRationale: cycle.data.objectiveRationale,
    });
    setObjectiveDirty(false);
  }, [cycle.data]);

  if (!cycleId || cycle.isLoading || strategy.isLoading || !cycle.data || !strategy.data) {
    return (
      <>
        <PageHeader title="Strategy Lab" />
        <Loader label={cycleId ? "Cargando estrategia…" : "Seleccionando ciclo…"} />
      </>
    );
  }

  const useSuggestion = () => {
    const suggestion = previewObjective.data ?? parseProposal(cycle.data?.objectiveProposal ?? "");
    if (!suggestion) return;
    setObjectiveValues((current) => ({
      ...current,
      objective: suggestion.objective,
      primaryMetric: suggestion.primaryMetric,
      target: suggestion.successCriteria.join("\n"),
      objectiveRationale: suggestion.reasoning,
    }));
    setObjectiveDirty(true);
  };

  const proposal = previewObjective.data ?? parseProposal(cycle.data.objectiveProposal);
  const objectiveStatus = previewObjective.isPending
    ? "Generando"
    : previewObjective.isError || cycle.data.objectiveProposalStatus === "error"
      ? "Error"
      : cycle.data.objectiveProposalStatus === "generando"
        ? "Generando"
        : cycle.data.objectiveProposalStatus === "propuesto" || proposal
          ? "Propuesto"
          : cycle.data.objectiveStatus === "aprobado"
            ? "Aprobado"
            : "Sin propuesta";
  const aiConfigured = aiStatus.data?.configured === true;

  return (
    <>
      <PageHeader
        title="Strategy Lab"
        description="El humano define la prioridad de negocio; la IA propone el objetivo de marketing y tú lo apruebas. Después el AI Team construye la estrategia."
      />

      <Card className="mb-5 border-l-[3px] border-l-accent">
        <CardHeader
          title="AI Objective Builder"
          subtitle="Dirección humana → propuesta IA → aprobación humana. No dejamos que la IA invente sola qué quiere el negocio."
          action={
            <Badge tone="info" dot>
              {objectiveStatus}
            </Badge>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="dcc-label" htmlFor="business-goal">
                Prioridad de negocio
              </label>
              <p className="mb-2 mt-1 text-[12px] text-muted-foreground">
                Esto lo define el dueño/cliente: qué necesita conseguir el negocio, sin convertirlo todavía en KPI de marketing.
              </p>
              <textarea
                id="business-goal"
                rows={3}
                value={objectiveValues.businessGoal}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, businessGoal: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed outline-none"
              />
            </div>
            <div>
              <label className="dcc-label" htmlFor="primary-metric">
                Métrica principal
              </label>
              <input
                id="primary-metric"
                value={objectiveValues.primaryMetric}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, primaryMetric: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="dcc-label" htmlFor="baseline">
                Línea base disponible
              </label>
              <input
                id="baseline"
                value={objectiveValues.baseline}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, baseline: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={
                !aiConfigured ||
                previewObjective.isPending ||
                objectiveValues.businessGoal.trim().length < 3
              }
              onClick={() =>
                previewObjective.mutate({
                  clientId,
                  cycleId,
                  businessGoal: objectiveValues.businessGoal,
                  baseline: objectiveValues.baseline,
                  primaryMetric: objectiveValues.primaryMetric,
                })
              }
            >
              <BrainCircuit className="size-4" />
              {previewObjective.isPending ? "Generando…" : "Proponer objetivo con IA"}
            </Button>
            <Button
              disabled={!objectiveDirty || updateObjective.isPending}
              onClick={() =>
                updateObjective.mutate(
                  {
                    id: cycleId,
                    ...objectiveValues,
                    objectiveSource: proposal ? "ai" : "manual",
                  },
                  { onSuccess: () => setObjectiveDirty(false) },
                )
              }
            >
              <CheckCircle2 className="size-4" />
              {updateObjective.isPending ? "Guardando…" : "Aprobar objetivo del ciclo"}
            </Button>
          </div>

          {!aiStatus.isLoading && aiStatus.data?.configured === false ? (
            <p role="status" className="text-[13px] font-semibold text-warning">
              IA no configurada
            </p>
          ) : null}
          {previewObjective.isError ? (
            <p role="alert" className="text-[13px] text-critical">
              {previewObjective.error instanceof Error
                ? previewObjective.error.message
                : "No fue posible generar la propuesta"}
            </p>
          ) : null}
          {proposal ? (
            <div className="rounded-lg border border-info/30 bg-info/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-info" />
                  <p className="text-[13.5px] font-bold text-foreground">Propuesta del Objective Builder</p>
                </div>
                <Badge tone="info">Propuesta IA</Badge>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-foreground">
                {proposal.objective}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="dcc-label">Métrica principal</p>
                  <p className="mt-1 text-[13px] text-foreground">{proposal.primaryMetric}</p>
                </div>
                <div>
                  <p className="dcc-label">Por qué</p>
                  <p className="mt-1 text-[13px] text-foreground">{proposal.reasoning}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  ["Criterios de éxito", proposal.successCriteria],
                  ["Suposiciones", proposal.assumptions],
                  ["Confianza y límites", proposal.confidenceNotes],
                ].map(([label, items]) => (
                  <div key={label as string}>
                    <p className="dcc-label">{label as string}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-foreground">
                      {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <Button className="mt-4" size="sm" variant="outline" onClick={useSuggestion}>
                Usar esta propuesta
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="dcc-label" htmlFor="cycle-objective">
                Objetivo de marketing aprobado
              </label>
              <textarea
                id="cycle-objective"
                rows={3}
                value={objectiveValues.objective}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, objective: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed outline-none"
              />
            </div>
            <div>
              <label className="dcc-label" htmlFor="target">
                Target / criterio de éxito
              </label>
              <textarea
                id="target"
                rows={3}
                value={objectiveValues.target}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, target: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="dcc-label" htmlFor="objective-rationale">
                Razonamiento
              </label>
              <textarea
                id="objective-rationale"
                rows={3}
                value={objectiveValues.objectiveRationale}
                onChange={(event) => {
                  setObjectiveValues((current) => ({ ...current, objectiveRationale: event.target.value }));
                  setObjectiveDirty(true);
                }}
                className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] outline-none"
              />
            </div>
          </div>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            La propuesta no activa el objetivo. Revísala y apruébala para usarla en la estrategia.
          </p>
        </CardBody>
      </Card>

      <PageHeader
        title="Ficha estratégica"
        description="El AI Team propone una estrategia a partir del objetivo aprobado. Las piezas de contenido se crean por separado."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={
                !aiConfigured ||
                cycle.data.objectiveStatus !== "aprobado" ||
                generateStrategy.isPending
              }
              onClick={() =>
                generateStrategy.mutate(
                  { clientId, cycleId },
                  {
                    onSuccess: (generated) => {
                      setValues({
                        objective: cycle.data.objective,
                        audience: generated.audience,
                        problems: generated.customerProblems.join("\n"),
                        valueProp: generated.valueProposition,
                        competitors: generated.competitorsToReview.join("\n"),
                        pillars: generated.contentPillars.join("\n"),
                        channels: generated.recommendedChannels.join("\n"),
                        mainCta: generated.primaryCTA,
                      });
                      setDirty(true);
                    },
                  },
                )
              }
            >
              <Sparkles className="size-4" />
              {generateStrategy.isPending ? "Generando…" : "Generar estrategia con AI Team"}
            </Button>
            <Button
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate(
                  { clientId, cycleId, values: { ...values, objective: objectiveValues.objective } },
                  { onSuccess: () => setDirty(false) },
                )
              }
            >
              {save.isPending ? "Guardando…" : dirty ? "Guardar estrategia" : "Guardado"}
            </Button>
          </div>
        }
      />

      {generateStrategy.isError ? (
        <Card className="mb-5 border-l-[3px] border-l-critical">
          <CardBody className="text-[13.5px] text-critical">
            {generateStrategy.error instanceof Error
              ? generateStrategy.error.message
              : "No fue posible generar la estrategia"}
          </CardBody>
        </Card>
      ) : null}
      {!aiStatus.isLoading && aiStatus.data?.configured === false ? (
        <Card className="mb-5 border-l-[3px] border-l-warning">
          <CardBody className="text-[13.5px] font-semibold text-warning">IA no configurada</CardBody>
        </Card>
      ) : null}
      {strategy.data.aiStatus === "simulado" ? (
        <Card className="mb-5 border-l-[3px] border-l-info">
          <CardBody className="flex flex-wrap items-center gap-3">
            <Badge tone="info" dot>
              Simulación
            </Badge>
            <p className="text-[13.5px] text-foreground">{strategy.data.aiMessage}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Estrategia del ciclo"
          subtitle="Edita y guarda la propuesta cuando esté lista. No se generan piezas de contenido aquí."
        />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="dcc-label" htmlFor={field.key}>
                {field.label}
              </label>
              <p className="mb-2 mt-1 text-[12px] text-muted-foreground">{field.hint}</p>
              <textarea
                id={field.key}
                rows={field.rows}
                value={values[field.key]}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field.key]: event.target.value }));
                  setDirty(true);
                }}
                className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

export default StrategyLabPage;
