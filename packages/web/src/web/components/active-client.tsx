import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useClients } from "../queries/clients";
import { useCycles } from "../queries/cycles";

type ActiveClientValue = {
  clientId: number;
  setClientId: (id: number) => void;
  clients: { id: number; name: string; code: string }[];
  cycleId: number;
  setCycleId: (id: number) => void;
  cycles: { id: number; name: string; status: string; objective: string }[];
  isLoading: boolean;
  isCycleLoading: boolean;
};

const ActiveClientContext = createContext<ActiveClientValue | null>(null);
const CLIENT_STORAGE_KEY = "dcc.activeClient";
const cycleStorageKey = (clientId: number) => `dcc.activeCycle.${clientId}`;

export function ActiveClientProvider({ children }: { children: React.ReactNode }) {
  const clients = useClients();
  const [clientId, setClientIdState] = useState(0);
  const cyclesQuery = useCycles(clientId);
  const [cycleId, setCycleIdState] = useState(0);

  useEffect(() => {
    if (!clients.data?.length) return;
    const stored = Number(localStorage.getItem(CLIENT_STORAGE_KEY) ?? 0);
    const exists = clients.data.some((client) => client.id === stored);
    setClientIdState((current) => (current > 0 ? current : exists ? stored : clients.data[0].id));
  }, [clients.data]);

  useEffect(() => {
    const cycles = cyclesQuery.data ?? [];
    if (!clientId || cycles.length === 0) {
      setCycleIdState(0);
      return;
    }
    const stored = Number(localStorage.getItem(cycleStorageKey(clientId)) ?? 0);
    const storedExists = cycles.some((cycle) => cycle.id === stored);
    const active = cycles.find((cycle) => cycle.status === "Activo");
    const next = storedExists ? stored : active?.id ?? cycles[cycles.length - 1].id;
    setCycleIdState(next);
    localStorage.setItem(cycleStorageKey(clientId), String(next));
  }, [clientId, cyclesQuery.data]);

  const value = useMemo<ActiveClientValue>(
    () => ({
      clientId,
      setClientId: (id) => {
        localStorage.setItem(CLIENT_STORAGE_KEY, String(id));
        setClientIdState(id);
        setCycleIdState(0);
      },
      clients: clients.data ?? [],
      cycleId,
      setCycleId: (id) => {
        if (clientId) localStorage.setItem(cycleStorageKey(clientId), String(id));
        setCycleIdState(id);
      },
      cycles: cyclesQuery.data ?? [],
      isLoading: clients.isLoading,
      isCycleLoading: cyclesQuery.isLoading,
    }),
    [clientId, clients.data, clients.isLoading, cycleId, cyclesQuery.data, cyclesQuery.isLoading],
  );

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>;
}

export function useActiveClient() {
  const context = useContext(ActiveClientContext);
  if (!context) throw new Error("useActiveClient debe usarse dentro de ActiveClientProvider");
  return context;
}
