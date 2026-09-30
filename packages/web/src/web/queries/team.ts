import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useTeam(clientId: number) {
  return useQuery(orpc.team.list.queryOptions({ input: { clientId }, enabled: clientId > 0 }));
}
