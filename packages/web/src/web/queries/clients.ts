import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useClients() {
  return useQuery(orpc.clients.list.queryOptions());
}

export function useClient(id: number, cycleId?: number) {
  return useQuery(
    orpc.clients.get.queryOptions({ input: { id, cycleId }, enabled: id > 0 && (cycleId ?? 0) > 0 }),
  );
}

export function useDashboard(clientId: number, cycleId: number) {
  return useQuery(
    orpc.clients.dashboard.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.clients.updateBrand.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
      },
    }),
  );
}
