import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useStrategy(clientId: number) {
  return useQuery(orpc.strategy.get.queryOptions({ input: { clientId }, enabled: clientId > 0 }));
}

export function useSaveStrategy() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.strategy.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.strategy.key() }),
    }),
  );
}

export function useSimulateStrategy() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.strategy.simulateGeneration.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.strategy.key() }),
    }),
  );
}
