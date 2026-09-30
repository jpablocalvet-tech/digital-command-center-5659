import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useCycles(clientId: number) {
  return useQuery(orpc.cycles.list.queryOptions({ input: { clientId }, enabled: clientId > 0 }));
}

export function useCycle(id: number) {
  return useQuery(orpc.cycles.get.queryOptions({ input: { id }, enabled: id > 0 }));
}

export function useCreateCycle() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.cycles.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.cycles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
      },
    }),
  );
}

export function useUpdateCycleObjective() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.cycles.updateObjective.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.cycles.key() });
        queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
        queryClient.invalidateQueries({ queryKey: orpc.strategy.key() });
      },
    }),
  );
}

export function usePreviewObjective() {
  return useMutation(orpc.cycles.previewObjective.mutationOptions());
}
