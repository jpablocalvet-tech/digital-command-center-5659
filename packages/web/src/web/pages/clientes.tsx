import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Plus, X } from "lucide-react";
import { Loader, PageHeader } from "../components/layout";
import { Card, CardBody } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useActiveClient } from "../components/active-client";
import { useClients, useCreateClient } from "../queries/clients";
import { formatMinutes } from "@/lib/labels";

function dateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultCycleDates() {
  const now = new Date();
  return {
    start: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateClient();
  const active = useActiveClient();
  const [, navigate] = useLocation();
  const dates = useMemo(defaultCycleDates, []);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"Interno" | "Externo">("Externo");
  const [service, setService] = useState("Sistema de contenido y gestión digital");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState<"Activo" | "Pausado" | "Prospecto">("Activo");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [createInitialCycle, setCreateInitialCycle] = useState(true);
  const [cycleName, setCycleName] = useState("");
  const [cycleStartDate, setCycleStartDate] = useState(dates.start);
  const [cycleEndDate, setCycleEndDate] = useState(dates.end);
  const [cycleBusinessGoal, setCycleBusinessGoal] = useState("");
  const [cycleTargetContentCount, setCycleTargetContentCount] = useState(8);
  const [error, setError] = useState("");

  if (!open) return null;

  const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30";
  const submit = () => {
    setError("");
    if (!code.trim() || !name.trim() || !service.trim()) {
      setError("Completa código, nombre y servicio.");
      return;
    }
    if (createInitialCycle && (!cycleName.trim() || !cycleStartDate || !cycleEndDate)) {
      setError("Completa los datos del ciclo inicial o desactiva su creación.");
      return;
    }

    create.mutate(
      {
        code: code.trim(),
        name: name.trim(),
        type,
        service: service.trim(),
        objective: objective.trim(),
        status,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactWhatsapp: contactWhatsapp.trim(),
        createInitialCycle,
        cycleName: cycleName.trim(),
        cycleStartDate,
        cycleEndDate,
        cycleBusinessGoal: cycleBusinessGoal.trim(),
        cycleTargetContentCount,
      },
      {
        onSuccess: ({ client }) => {
          active.setClientId(client.id);
          onClose();
          navigate(`/clientes/${client.id}`);
        },
        onError: (err) => setError(err instanceof Error ? err.message : "No se pudo crear el cliente."),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/45 px-4 py-6 md:py-10">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="dcc-label">Alta de cliente</p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">Nuevo cliente</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Crea el Client Hub y, si quieres, deja listo su primer ciclo de trabajo.
            </p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-surface-soft"><X className="size-4" /></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="dcc-label" htmlFor="new-client-code">Código interno</label>
            <input id="new-client-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cliente 001" className={inputClass} />
          </div>
          <div>
            <label className="dcc-label" htmlFor="new-client-name">Nombre del negocio</label>
            <input id="new-client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cafetería Ejemplo" className={inputClass} />
          </div>
          <div>
            <label className="dcc-label" htmlFor="new-client-type">Tipo</label>
            <select id="new-client-type" value={type} onChange={(e) => setType(e.target.value as "Interno" | "Externo")} className={inputClass}>
              <option value="Externo">Externo</option>
              <option value="Interno">Interno</option>
            </select>
          </div>
          <div>
            <label className="dcc-label" htmlFor="new-client-status">Estado</label>
            <select id="new-client-status" value={status} onChange={(e) => setStatus(e.target.value as "Activo" | "Pausado" | "Prospecto")} className={inputClass}>
              <option value="Activo">Activo</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Pausado">Pausado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="dcc-label" htmlFor="new-client-service">Servicio</label>
            <input id="new-client-service" value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="dcc-label" htmlFor="new-client-objective">Objetivo general del cliente</label>
            <textarea id="new-client-objective" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ej.: aumentar reservas y ordenar su presencia digital" className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] outline-none" />
          </div>

          <div className="md:col-span-2 border-t border-border pt-4">
            <p className="dcc-label">Contacto principal</p>
          </div>
          <div>
            <label className="dcc-label" htmlFor="new-client-contact">Nombre</label>
            <input id="new-client-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="dcc-label" htmlFor="new-client-whatsapp">WhatsApp</label>
            <input id="new-client-whatsapp" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+52..." className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="dcc-label" htmlFor="new-client-email">Email</label>
            <input id="new-client-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-border bg-surface-soft/50 p-3 md:col-span-2">
            <input type="checkbox" checked={createInitialCycle} onChange={(e) => setCreateInitialCycle(e.target.checked)} className="size-4" />
            <span>
              <span className="block text-[13.5px] font-semibold text-foreground">Crear ciclo inicial</span>
              <span className="block text-[12px] text-muted-foreground">Recomendado para que el cliente quede listo para Strategy Lab y AI Team.</span>
            </span>
          </label>

          {createInitialCycle ? (
            <>
              <div className="md:col-span-2">
                <label className="dcc-label" htmlFor="new-client-cycle-name">Nombre del ciclo</label>
                <input id="new-client-cycle-name" value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Octubre 2026 · Lanzamiento" className={inputClass} />
              </div>
              <div>
                <label className="dcc-label" htmlFor="new-client-cycle-start">Inicio</label>
                <input id="new-client-cycle-start" type="date" value={cycleStartDate} onChange={(e) => setCycleStartDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="dcc-label" htmlFor="new-client-cycle-end">Fin</label>
                <input id="new-client-cycle-end" type="date" value={cycleEndDate} onChange={(e) => setCycleEndDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="dcc-label" htmlFor="new-client-cycle-count">Piezas objetivo</label>
                <input id="new-client-cycle-count" type="number" min={1} max={100} value={cycleTargetContentCount} onChange={(e) => setCycleTargetContentCount(Math.max(1, Number(e.target.value) || 1))} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="dcc-label" htmlFor="new-client-cycle-goal">Prioridad de negocio del ciclo</label>
                <textarea id="new-client-cycle-goal" rows={2} value={cycleBusinessGoal} onChange={(e) => setCycleBusinessGoal(e.target.value)} placeholder="La IA propondrá después el objetivo de marketing" className="mt-1.5 w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13.5px] outline-none" />
              </div>
            </>
          ) : null}

          {error ? <p className="md:col-span-2 text-[13px] font-medium text-critical">{error}</p> : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4 md:col-span-2">
            <Button disabled={create.isPending} onClick={submit}>{create.isPending ? "Creando…" : "Crear cliente"}</Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientesPage() {
  const clients = useClients();
  const [newClientOpen, setNewClientOpen] = useState(false);

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
        action={<Button onClick={() => setNewClientOpen(true)}><Plus className="size-4" />Nuevo cliente</Button>}
      />

      {clients.data.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-display text-lg font-bold text-foreground">Todavía no hay clientes</p>
            <p className="mt-2 text-[13.5px] text-muted-foreground">Crea el primero para comenzar a operar.</p>
            <Button className="mt-4" onClick={() => setNewClientOpen(true)}><Plus className="size-4" />Nuevo cliente</Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.data.map((client) => (
            <Card key={client.id} className="flex flex-col">
              <CardBody className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{client.code}</Badge>
                  <Badge tone="info">{client.type}</Badge>
                  <Badge tone="accent" dot>{client.status}</Badge>
                </div>
                <h2 className="mt-3 font-display text-[18px] font-bold text-foreground">{client.name}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">Objetivo: {client.activeCycleObjective || client.objective || "Por definir"}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">Ciclo: {client.activeCycleName ?? "Sin ciclo"}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <p className="dcc-label">Horas del fundador · ciclo activo</p>
                    <p className="dcc-num mt-1 font-display text-[18px] font-bold text-foreground">{formatMinutes(client.founderMinutes ?? 0)}</p>
                  </div>
                  <div>
                    <p className="dcc-label">Automatización</p>
                    <p className="dcc-num mt-1 font-display text-[18px] font-bold text-accent">{client.automationScore}%</p>
                  </div>
                </div>
              </CardBody>
              <div className="border-t border-border px-5 py-3">
                <Link to={`/clientes/${client.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
                  Abrir Client Hub <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewClientModal open={newClientOpen} onClose={() => setNewClientOpen(false)} />
    </>
  );
}

export default ClientesPage;
