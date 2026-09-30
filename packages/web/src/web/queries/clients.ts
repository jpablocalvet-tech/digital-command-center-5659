import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useClients() {
  return useQuery(orpc.clients.list.queryOptions());
}

export function useClient(id: number) {
  return useQuery(orpc.clients.get.queryOptions({ input: { id }, enabled: id > 0 }));
}

export function useDashboard(clientId: number) {
  return useQuery(
    orpc.clients.dashboard.queryOptions({ input: { clientId }, enabled: clientId > 0 }),
  );
}
