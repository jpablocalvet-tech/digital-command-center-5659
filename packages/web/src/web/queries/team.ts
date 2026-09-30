import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useTeam(clientId: number, cycleId: number) {
  return useQuery(
    orpc.team.list.queryOptions({
      input: { clientId, cycleId },
      enabled: clientId > 0 && cycleId > 0,
    }),
  );
}
