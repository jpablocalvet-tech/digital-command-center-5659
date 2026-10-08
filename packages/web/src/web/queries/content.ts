import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import type { Stage } from "../lib/labels";

export function useContent(clientId: number, cycleId: number) {
  return useQuery(
    orpc.content.list.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}

export function useGenerateContentBatch(clientId: number, cycleId: number) {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.content.generateBatch.mutationOptions({
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.content.list.key({ input: { clientId, cycleId } }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.ai.executions.key({ input: { clientId, cycleId } }),
          }),
        ]),
    }),
  );
}

export function useContentDetail(id: number) {
  return useQuery(orpc.content.detail.queryOptions({ input: { id }, enabled: id > 0 }));
}

function useContentInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: orpc.content.key() });
    queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
    queryClient.invalidateQueries({ queryKey: orpc.hours.key() });
  };
}

export function useSetStage(clientId: number, cycleId: number) {
  const queryClient = useQueryClient();
  const invalidate = useContentInvalidation();
  const listKey = orpc.content.list.queryOptions({ input: { clientId, cycleId } }).queryKey;

  return useMutation(
    orpc.content.setStage.mutationOptions({
      onMutate: async ({ id, stage }: { id: number; stage: Stage }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const prev = queryClient.getQueryData(listKey);
        queryClient.setQueryData(listKey, (old: unknown) =>
          Array.isArray(old)
            ? old.map((item: { id: number }) => (item.id === id ? { ...item, stage } : item))
            : old,
        );
        return { prev };
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(listKey, (context as { prev?: unknown } | undefined)?.prev);
      },
      onSettled: invalidate,
    }),
  );
}

export function useUpdateContent() {
  const invalidate = useContentInvalidation();
  return useMutation(orpc.content.updateDetails.mutationOptions({ onSuccess: invalidate }));
}

export function useDecideContent() {
  const invalidate = useContentInvalidation();
  return useMutation(orpc.content.decide.mutationOptions({ onSuccess: invalidate }));
}
