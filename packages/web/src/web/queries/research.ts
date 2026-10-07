import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useResearchBrief(clientId: number, cycleId: number) {
  return useQuery(
    orpc.research.latest.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}

export function useGenerateResearchBrief() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.research.generate.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: orpc.research.key() });
        queryClient.invalidateQueries({ queryKey: orpc.ai.key() });
      },
    }),
  );
}

export function useReviewResearchBrief(clientId: number, cycleId: number) {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.research.review.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.research.latest.key({ input: { clientId, cycleId } }),
        }),
    }),
  );
}