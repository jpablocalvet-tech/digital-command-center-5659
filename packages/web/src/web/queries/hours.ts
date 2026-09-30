import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useHours(clientId: number, cycleId: number) {
  return useQuery(
    orpc.hours.overview.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}

function useHoursInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: orpc.hours.key() });
    queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
  };
}

export function useCreateTimeEntry() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.createTimeEntry.mutationOptions({ onSuccess: invalidate }));
}

export function useDeleteTimeEntry() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.deleteTimeEntry.mutationOptions({ onSuccess: invalidate }));
}

export function useUpdateTask() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.updateTask.mutationOptions({ onSuccess: invalidate }));
}

export function useCreateTask() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.createTask.mutationOptions({ onSuccess: invalidate }));
}
