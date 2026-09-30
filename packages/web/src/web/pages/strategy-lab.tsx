import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useActiveClient } from "../components/active-client";
import { useSaveStrategy, useSimulateStrategy, useStrategy } from "../queries/strategy";

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

const fields: { key: keyof Values; label: string; hint: string; rows: number }[] = [
  { key: "objective", label: "Objetivo principal", hint: "Qué queremos conseguir este ciclo", rows: 2 },
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

function StrategyLabPage() {
  const { clientId } = useActiveClient();
  const strategy = useStrategy(clientId);
  const save = useSaveStrategy();
  const simulate = useSimulateStrategy();
  const [values, setValues] = useState<Values>(empty);
  const [dirty, setDirty] = useState(false);

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

  if (strategy.isLoading || !strategy.data) {
    return (
      <>
        <PageHeader title="Strategy Lab" />
        <Loader />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Strategy Lab"
        description="La base estratégica del cliente. Todo lo que el AI Team usará para producir contenido."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={simulate.isPending}
              onClick={() => simulate.mutate({ clientId })}
            >
              <Sparkles className="size-4" />
              {simulate.isPending ? "Simulando…" : "Generar estrategia con AI Team"}
            </Button>
            <Button
              disabled={!dirty || save.isPending}
              onClick={() =>
                save.mutate({ clientId, values }, { onSuccess: () => setDirty(false) })
              }
            >
              {save.isPending ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
            </Button>
          </div>
        }
      />

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
          title="Ficha estratégica"
          subtitle="Edita los campos y guarda. Sin IA real en esta versión."
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
