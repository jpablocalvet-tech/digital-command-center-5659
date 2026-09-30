import { useMemo, useState } from "react";
import { Clock3, Plus, Trash2 } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { AutomationScorePanel, FounderHoursPanel, KpiCard } from "../components/panels";
import { useActiveClient } from "../components/active-client";
import {
  useCreateTask,
  useCreateTimeEntry,
  useDeleteTimeEntry,
  useHours,
  useUpdateTask,
} from "../queries/hours";
import {
  classificationLabels,
  classificationTones,
  formatMinutes,
  priorityLabels,
  priorityTones,
  taskStatusLabels,
  taskStatusTones,
} from "@/lib/labels";
import type { ManualTaskRow } from "@/types/dcc";

const classifications = ["automatizable", "estandarizable", "delegable", "founder_only"] as const;
const priorities = ["alta", "media", "baja"] as const;
const statuses = ["pendiente", "en_proceso", "resuelto"] as const;
const categories = [
  "Estrategia",
  "Research",
  "Revisión",
  "Diseño",
  "Cliente",
  "Administración",
  "Ventas",
  "Otros",
] as const;

function Select({
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  value: string;
  options: readonly string[];
  labels: Record<string, string>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}

function TimeEntryForm({ clientId, cycleId }: { clientId: number; cycleId: number }) {
  const create = useCreateTimeEntry();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("Revisión");
  const [minutes, setMinutes] = useState("15");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [description, setDescription] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Clock3 className="size-4" />
        Registrar tiempo
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/45 px-4 py-8">
          <Card className="w-full max-w-3xl border-l-[3px] border-l-accent">
            <CardHeader
              title="Registrar tiempo"
              subtitle="Cada entrada alimenta Founder Hours del ciclo actual."
            />
            <CardBody className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="dcc-label" htmlFor="time-date">Fecha</label>
                <input
                  id="time-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
                />
              </div>
              <div>
                <label className="dcc-label" htmlFor="time-category">Categoría</label>
                <select
                  id="time-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
                >
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="dcc-label" htmlFor="time-minutes">Minutos</label>
                <input
                  id="time-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="dcc-label" htmlFor="time-description">Descripción</label>
                <input
                  id="time-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ej.: revisión de 4 copies de RUTA"
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-5">
                <Button
                  disabled={create.isPending || !date || Number(minutes) < 1}
                  onClick={() =>
                    create.mutate(
                      {
                        clientId,
                        cycleId,
                        category,
                        minutes: Number(minutes) || 1,
                        date,
                        description: description.trim(),
                      },
                      {
                        onSuccess: () => {
                          setMinutes("15");
                          setDescription("");
                          setOpen(false);
                        },
                      },
                    )
                  }
                >
                  {create.isPending ? "Guardando…" : "Guardar tiempo"}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function NewTaskForm({ clientId }: { clientId: number }) {
  const create = useCreateTask();
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [frequency, setFrequency] = useState("Semanal");
  const [minutes, setMinutes] = useState("15");
  const [timesPerMonth, setTimesPerMonth] = useState("4");
  const [classification, setClassification] = useState<string>("automatizable");
  const [priority, setPriority] = useState<string>("media");

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Registrar tarea manual
      </Button>
    );
  }

  return (
    <div className="grid w-full gap-3 rounded-md border border-border bg-surface-soft/50 p-4 md:grid-cols-6">
      <div className="md:col-span-2">
        <label className="dcc-label" htmlFor="task">
          Tarea
        </label>
        <input
          id="task"
          value={task}
          onChange={(event) => setTask(event.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
        />
      </div>
      <div>
        <label className="dcc-label" htmlFor="frequency">
          Frecuencia
        </label>
        <input
          id="frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
        />
      </div>
      <div>
        <label className="dcc-label" htmlFor="minutes">
          Minutos
        </label>
        <input
          id="minutes"
          type="number"
          min={1}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
        />
      </div>
      <div>
        <label className="dcc-label" htmlFor="times">
          Veces / mes
        </label>
        <input
          id="times"
          type="number"
          min={1}
          value={timesPerMonth}
          onChange={(event) => setTimesPerMonth(event.target.value)}
          className="mt-1.5 h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] outline-none"
        />
      </div>
      <div className="flex items-end gap-2">
        <Select
          value={classification}
          options={classifications}
          labels={classificationLabels}
          onChange={setClassification}
        />
        <Select
          value={priority}
          options={priorities}
          labels={priorityLabels}
          onChange={setPriority}
        />
      </div>
      <div className="flex gap-2 md:col-span-6">
        <Button
          size="sm"
          disabled={create.isPending || task.trim().length < 2}
          onClick={() =>
            create.mutate(
              {
                clientId,
                task: task.trim(),
                frequency,
                minutes: Number(minutes) || 1,
                timesPerMonth: Number(timesPerMonth) || 1,
                classification: classification as (typeof classifications)[number],
                priority: priority as (typeof priorities)[number],
              },
              {
                onSuccess: () => {
                  setTask("");
                  setOpen(false);
                },
              },
            )
          }
        >
          {create.isPending ? "Guardando…" : "Guardar tarea"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: ManualTaskRow }) {
  const update = useUpdateTask();
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-3 text-[13.5px] font-semibold text-foreground">{task.task}</td>
      <td className="px-3 py-3 text-[13px] text-muted-foreground">{task.frequency}</td>
      <td className="dcc-num px-3 py-3 text-[13px] text-muted-foreground">
        {task.minutes} min × {task.timesPerMonth}
      </td>
      <td className="px-3 py-3">
        <Select
          value={task.classification}
          options={classifications}
          labels={classificationLabels}
          disabled={update.isPending}
          onChange={(value) =>
            update.mutate({
              id: task.id,
              classification: value as (typeof classifications)[number],
            })
          }
        />
      </td>
      <td className="px-3 py-3">
        <Select
          value={task.priority}
          options={priorities}
          labels={priorityLabels}
          disabled={update.isPending}
          onChange={(value) =>
            update.mutate({ id: task.id, priority: value as (typeof priorities)[number] })
          }
        />
      </td>
      <td className="px-3 py-3">
        <Select
          value={task.status}
          options={statuses}
          labels={taskStatusLabels}
          disabled={update.isPending}
          onChange={(value) =>
            update.mutate({ id: task.id, status: value as (typeof statuses)[number] })
          }
        />
      </td>
    </tr>
  );
}

function HoursAutomationPage() {
  const { clientId, cycleId } = useActiveClient();
  const overview = useHours(clientId, cycleId);
  const deleteEntry = useDeleteTimeEntry();

  const cycleLabel = useMemo(() => overview.data?.cycle.name ?? "ciclo actual", [overview.data]);

  if (!cycleId || overview.isLoading || !overview.data) {
    return (
      <>
        <PageHeader title="Hours & Automation" />
        <Loader label={cycleId ? "Cargando horas…" : "Seleccionando ciclo…"} />
      </>
    );
  }

  const {
    distribution,
    totalMinutes,
    targetMinutes,
    tasks,
    backlog,
    recoverableMinutes,
    eliminatedMinutes,
    manualMonthlyMinutes,
    automation,
    entries,
  } = overview.data;

  return (
    <>
      <PageHeader
        title="Hours & Automation"
        description={`Tiempo humano real y oportunidades de automatización · ${cycleLabel}.`}
        action={<TimeEntryForm clientId={clientId} cycleId={cycleId} />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Founder Hours del ciclo"
          value={formatMinutes(totalMinutes)}
          hint={`Objetivo: ≤ ${formatMinutes(targetMinutes)} / mes`}
        />
        <KpiCard
          label="Horas recuperables"
          value={formatMinutes(recoverableMinutes)}
          tone="accent"
          hint="Tareas activas no Founder Only"
        />
        <KpiCard
          label="Horas ya eliminadas"
          value={formatMinutes(eliminatedMinutes)}
          hint="Carga resuelta por automatización/estandarización"
        />
        <KpiCard
          label="Carga manual estimada"
          value={formatMinutes(manualMonthlyMinutes)}
          tone="warning"
          hint="Minutos mensuales que aún dependen del flujo actual"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FounderHoursPanel
          distribution={distribution}
          totalMinutes={totalMinutes}
          targetMinutes={targetMinutes}
        />
        <AutomationScorePanel
          automated={automation.automated}
          standardized={automation.standardized}
          manual={automation.manual}
          tasks={tasks.slice(0, 4)}
        />
      </div>

      <Card className="mt-5">
        <CardHeader title="Registro de tiempo" subtitle="Entradas reales del ciclo; ya no son números mock." />
        <CardBody className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">Todavía no hay tiempo registrado.</p>
          ) : (
            entries
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{entry.category}</Badge>
                      <span className="text-[12px] text-muted-foreground">{entry.date}</span>
                    </div>
                    {entry.description ? (
                      <p className="mt-1.5 text-[13px] text-foreground">{entry.description}</p>
                    ) : null}
                  </div>
                  <span className="dcc-num font-display text-[16px] font-bold text-foreground">
                    {formatMinutes(entry.minutes)}
                  </span>
                  <button
                    type="button"
                    aria-label="Eliminar registro"
                    disabled={deleteEntry.isPending}
                    onClick={() => deleteEntry.mutate({ id: entry.id })}
                    className="rounded-md border border-border p-2 text-muted-foreground hover:bg-surface-soft disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
          )}
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader
          title="Manual Tasks Tracker"
          subtitle="El Automation Score se calcula desde estas tareas; ya no es un porcentaje arbitrario."
          action={<NewTaskForm clientId={clientId} />}
        />
        <CardBody className="dcc-scroll overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Tarea", "Frecuencia", "Minutos", "Clasificación", "Prioridad", "Estado"].map(
                  (head) => (
                    <th key={head} className="dcc-label px-3 pb-2.5">
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader
          title="Automation Backlog"
          subtitle="Prioridad práctica: recuperar horas, no coleccionar automatizaciones bonitas."
        />
        <CardBody className="space-y-2">
          {backlog.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">
              No hay tareas candidatas pendientes. Bien ahí 😄
            </p>
          ) : null}
          {backlog.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3"
            >
              <span className="dcc-num w-7 shrink-0 font-display text-[16px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">{item.task}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {item.frequency} · {item.minutes} min × {item.timesPerMonth} al mes
                </p>
              </div>
              <Badge tone={classificationTones[item.classification] ?? "neutral"}>
                {classificationLabels[item.classification] ?? item.classification}
              </Badge>
              <Badge tone={priorityTones[item.priority] ?? "neutral"}>
                {priorityLabels[item.priority] ?? item.priority}
              </Badge>
              <Badge tone={taskStatusTones[item.status] ?? "neutral"}>
                {taskStatusLabels[item.status] ?? item.status}
              </Badge>
              <span className="dcc-num w-[92px] text-right font-display text-[15px] font-bold text-accent">
                {formatMinutes(item.recoverableMinutes)}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

export default HoursAutomationPage;
