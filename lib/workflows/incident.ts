import { IncidentAction, IncidentStatus } from "@prisma/client";

export function nextStatus(current: IncidentStatus, target: IncidentStatus) {
  const transitions: Record<IncidentStatus, IncidentStatus[]> = {
    open: ["acknowledged"],
    acknowledged: ["resolved"],
    resolved: [],
  };
  if (current === target) return true;
  return transitions[current].includes(target);
}

export function mapStatusToAction(status: IncidentStatus): IncidentAction {
  if (status === "acknowledged") return "acknowledged";
  if (status === "resolved") return "resolved";
  return "updated";
}
