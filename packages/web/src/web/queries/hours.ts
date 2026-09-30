import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useHours(clientId: number) {
  return useQuery(orpc.hours.overview.queryOptions({ input: { clientId }, enabled: clientId > 0 }));
}

function useHoursInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: orpc.hours.key() });
    queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
  };
}

export function useUpdateTask() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.updateTask.mutationOptions({ onSuccess: invalidate }));
}

export function useCreateTask() {
  const invalidate = useHoursInvalidation();
  return useMutation(orpc.hours.createTask.mutationOptions({ onSuccess: invalidate }));
}
