import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useCreateCycle } from "../queries/cycles";

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthDefaults() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const month = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(start);
  return { start: toDateInput(start), end: toDateInput(end), month };
}

export function CycleCreateModal({
  clientId,
  clientName,
  open,
  onClose,
  onCreated,
}: {
  clientId: number;
  clientName: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (cycle: { id: number }) => void;
}) {
  const defaults = useMemo(monthDefaults, []);
  const create = useCreateCycle();
  const [name, setName] = useState(`${clientName} · ${defaults.month}`);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [businessGoal, setBusinessGoal] = useState("");
  const [status, setStatus] = useState<"Planificado" | "Activo">("Activo");
  const [targetContentCount, setTargetContentCount] = useState(8);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = () => {
    setError("");
    if (!name.trim() || !startDate || !endDate) {
      setError("Completa nombre y fechas del ciclo.");
      return;
    }
    if (endDate < startDate) {
      setError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }

    create.mutate(
      {
        clientId,
        name: name.trim(),
        startDate,
        endDate,
        businessGoal: businessGoal.trim(),
        objective: "",
        primaryMetric: "",
        baseline: "",
        target: "",
        objectiveRationale: "",
        status,
        targetContentCount,
      },
      {
        onSuccess: (cycle) => {
          onCreated?.(cycle);
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : "No se pudo crear el ciclo."),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/45 px-4 py-6 md:py-10">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="dcc-label">Nuevo ciclo</p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">{clientName}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Un ciclo separa objetivos, contenido, horas y aprendizajes por periodo o campaña.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-surface-soft"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="dcc-label" htmlFor="cycle-name">Nombre del ciclo</label>
            <input id="cycle-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none" />
          </div>
          <div>
            <label className="dcc-label" htmlFor="cycle-start">Inicio</label>
            <input id="cycle-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none" />
          </div>
          <div>
            <label className="dcc-label" htmlFor="cycle-end">Fin</label>
            <input id="cycle-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none" />
          </div>
          <div>
            <label className="dcc-label" htmlFor="cycle-status">Estado</label>
            <select id="cycle-status" value={status} onChange={(e) => setStatus(e.target.value as "Planificado" | "Activo")} className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none">
              <option value="Activo">Activo</option>
              <option value="Planificado">Planificado</option>
            </select>
          </div>
          <div>
            <label className="dcc-label" htmlFor="cycle-target-count">Piezas objetivo</label>
            <input id="cycle-target-count" type="number" min={1} max={100} value={targetContentCount} onChange={(e) => setTargetContentCount(Math.max(1, Number(e.target.value) || 1))} className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="dcc-label" htmlFor="cycle-business-goal">Prioridad de negocio</label>
            <textarea id="cycle-business-goal" rows={3} value={businessGoal} onChange={(e) => setBusinessGoal(e.target.value)} placeholder="Ej.: conseguir los primeros clientes reales sin publicidad pagada" className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] outline-none" />
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              El AI Objective Builder convertirá esta prioridad en un objetivo de marketing en Strategy Lab.
            </p>
          </div>

          {error ? <p className="md:col-span-2 text-[13px] font-medium text-critical">{error}</p> : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4 md:col-span-2">
            <Button disabled={create.isPending} onClick={submit}>
              {create.isPending ? "Creando…" : "Crear ciclo"}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
