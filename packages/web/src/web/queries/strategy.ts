import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useStrategy(clientId: number, cycleId: number) {
  return useQuery(
    orpc.strategy.get.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}

export function useSaveStrategy() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.strategy.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.strategy.key() }),
    }),
  );
}

export function useGenerateStrategy() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.strategy.generate.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orpc.ai.key() });
      },
    }),
  );
}

export function useAIStatus() {
  return useQuery(orpc.ai.status.queryOptions());
}

export function useAIExecutions(clientId: number, cycleId: number) {
  return useQuery(
    orpc.ai.executions.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
      refetchInterval: 2000,
    }),
  );
}
