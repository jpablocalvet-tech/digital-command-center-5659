import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useClients } from "../queries/clients";

type ActiveClientValue = {
  clientId: number;
  setClientId: (id: number) => void;
  clients: { id: number; name: string; code: string }[];
  isLoading: boolean;
};

const ActiveClientContext = createContext<ActiveClientValue | null>(null);
const STORAGE_KEY = "dcc.activeClient";

export function ActiveClientProvider({ children }: { children: React.ReactNode }) {
  const clients = useClients();
  const [clientId, setClientId] = useState(0);

  useEffect(() => {
    if (!clients.data?.length) return;
    const stored = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const exists = clients.data.some((c) => c.id === stored);
    setClientId((current) => (current > 0 ? current : exists ? stored : clients.data[0].id));
  }, [clients.data]);

  const value = useMemo<ActiveClientValue>(
    () => ({
      clientId,
      setClientId: (id) => {
        localStorage.setItem(STORAGE_KEY, String(id));
        setClientId(id);
      },
      clients: clients.data ?? [],
      isLoading: clients.isLoading,
    }),
    [clientId, clients.data, clients.isLoading],
  );

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>;
}

export function useActiveClient() {
  const context = useContext(ActiveClientContext);
  if (!context) throw new Error("useActiveClient debe usarse dentro de ActiveClientProvider");
  return context;
}
