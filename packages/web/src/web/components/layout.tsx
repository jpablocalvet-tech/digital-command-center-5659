import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bot,
  CheckSquare,
  ChevronDown,
  Clock,
  FlaskConical,
  Home,
  KanbanSquare,
  Menu,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveClient } from "./active-client";

const nav = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/strategy-lab", label: "Strategy Lab", icon: FlaskConical },
  { href: "/ai-team", label: "AI Team", icon: Bot },
  { href: "/produccion", label: "Producción", icon: KanbanSquare },
  { href: "/aprobaciones", label: "Aprobaciones", icon: CheckSquare },
  { href: "/hours-automation", label: "Hours & Automation", icon: Clock },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const active =
          item.href === "/" ? location === "/" : location.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "bg-white/12 text-white"
                : "text-white/65 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.9} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-6 py-6">
      <p className="font-display text-[15px] font-extrabold leading-tight text-white">
        Digital
        <br />
        Command Center
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
        V0.1 · Validación
      </p>
    </div>
  );
}

function ClientSwitcher() {
  const { clients, clientId, setClientId, isLoading } = useActiveClient();
  const active = clients.find((c) => c.id === clientId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="dcc-label hidden sm:inline">Cliente activo</span>
      <div className="relative">
        <select
          value={clientId || ""}
          disabled={isLoading}
          onChange={(event) => setClientId(Number(event.target.value))}
          className="h-10 appearance-none rounded-md border border-border bg-card pl-3 pr-9 text-[13.5px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {isLoading ? <option value="">Cargando…</option> : null}
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
          <option value="" disabled>
            Todos los clientes (próximamente)
          </option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {active ? (
        <span className="hidden rounded-full bg-surface-soft px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground md:inline">
          {active.code}
        </span>
      ) : null}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-primary lg:flex">
        <Brand />
        <NavLinks />
        <div className="mt-auto px-6 py-6 text-[11.5px] leading-relaxed text-white/40">
          Agencia digital semi-automatizada
          <br />
          para PYMES
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[264px] flex-col bg-primary">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-6 text-white/70"
            >
              <X className="size-5" />
            </button>
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-card/95 px-5 py-3 backdrop-blur md:px-8">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="rounded-md border border-border p-2 text-foreground lg:hidden"
          >
            <Menu className="size-4" />
          </button>
          <ClientSwitcher />
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight text-foreground md:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[14px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Loader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="dcc-card flex items-center gap-3 px-5 py-6 text-[13.5px] text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}
