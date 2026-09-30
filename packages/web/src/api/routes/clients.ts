import { z } from "zod";
import { asc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";
import { calculateAutomation } from "../lib/metrics";

async function loadClient(id: number) {
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, id));
  if (!client) throw new ORPCError("NOT_FOUND", { message: "Cliente no encontrado" });
  return client;
}

async function loadCycle(clientId: number, cycleId?: number) {
  if (cycleId) {
    const [cycle] = await db
      .select()
      .from(schema.contentCycles)
      .where(
        and(eq(schema.contentCycles.id, cycleId), eq(schema.contentCycles.clientId, clientId)),
      );
    if (!cycle) throw new ORPCError("NOT_FOUND", { message: "Ciclo no encontrado" });
    return cycle;
  }

  const [active] = await db
    .select()
    .from(schema.contentCycles)
    .where(
      and(eq(schema.contentCycles.clientId, clientId), eq(schema.contentCycles.status, "Activo")),
    );
  if (active) return active;

  const cycles = await db
    .select()
    .from(schema.contentCycles)
    .where(eq(schema.contentCycles.clientId, clientId))
    .orderBy(asc(schema.contentCycles.startDate));
  const fallback = cycles.length ? cycles[cycles.length - 1] : undefined;
  if (!fallback) throw new ORPCError("NOT_FOUND", { message: "El cliente todavía no tiene ciclos" });
  return fallback;
}

const pipelineMeta = [
  ["idea", "Idea"],
  ["research", "Research"],
  ["copy", "Copy"],
  ["diseno", "Diseño"],
  ["quality", "Quality Check"],
  ["aprobacion", "Aprobación"],
  ["programado", "Programado"],
  ["publicado", "Publicado"],
] as const;

function dynamicAttention(
  content: (typeof schema.contentItems.$inferSelect)[],
  tasks: (typeof schema.manualTasks.$inferSelect)[],
) {
  const rows: {
    id: number;
    priority: string;
    title: string;
    detail: string;
    link: string;
    linkLabel: string;
  }[] = [];
  let id = -1;

  const ready = content.filter((item) => item.approvalState === "listo").length;
  if (ready > 0) {
    rows.push({
      id: id--,
      priority: "critico",
      title: `${ready} ${ready === 1 ? "contenido listo" : "contenidos listos"} para aprobación`,
      detail: "Hay piezas que ya pasaron revisión y esperan una decisión humana.",
      link: "/aprobaciones",
      linkLabel: "Ir a Aprobaciones",
    });
  }

  const confirmations = content.filter(
    (item) =>
      item.approvalState === "dato_por_confirmar" || item.realityStatus === "Dato por confirmar",
  ).length;
  if (confirmations > 0) {
    rows.push({
      id: id--,
      priority: "atencion",
      title: `${confirmations} ${confirmations === 1 ? "pieza requiere" : "piezas requieren"} confirmar datos`,
      detail: "Reality Checker detectó afirmaciones o datos que deben validarse antes de publicar.",
      link: "/aprobaciones",
      linkLabel: "Revisar dato",
    });
  }

  const automationCandidates = tasks
    .filter((task) => task.classification !== "founder_only" && task.status !== "resuelto")
    .map((task) => ({ ...task, monthly: task.minutes * task.timesPerMonth }))
    .sort((a, b) => b.monthly - a.monthly);

  if (automationCandidates[0]) {
    const top = automationCandidates[0];
    rows.push({
      id: id--,
      priority: "informativo",
      title: "Oportunidad de recuperar tiempo",
      detail: `${top.task}: ${top.monthly} min/mes potencialmente recuperables.`,
      link: "/hours-automation",
      linkLabel: "Ver backlog",
    });
  }

  return rows;
}

export const clients = {
  /** Lista para selector y pantalla de clientes, con métricas derivadas. */
  list: base.handler(async () => {
    const rows = await db.select().from(schema.clients).orderBy(asc(schema.clients.id));
    const [entries, tasks, cycles] = await Promise.all([
      db.select().from(schema.timeEntries),
      db.select().from(schema.manualTasks),
      db.select().from(schema.contentCycles),
    ]);

    return rows.map((client) => {
      const activeCycle =
        cycles.find((cycle) => cycle.clientId === client.id && cycle.status === "Activo") ??
        (() => {
          const clientCycles = cycles.filter((cycle) => cycle.clientId === client.id);
          return clientCycles.length ? clientCycles[clientCycles.length - 1] : undefined;
        })();
      const cycleEntries = activeCycle
        ? entries.filter((entry) => entry.clientId === client.id && entry.cycleId === activeCycle.id)
        : [];
      const automation = calculateAutomation(tasks.filter((task) => task.clientId === client.id));
      return {
        ...client,
        founderMinutes: cycleEntries.reduce((total, entry) => total + entry.minutes, 0),
        automationScore: automation.automated,
        standardizedScore: automation.standardized,
        manualScore: automation.manual,
        activeCycleId: activeCycle?.id ?? null,
        activeCycleName: activeCycle?.name ?? "Sin ciclo",
        activeCycleObjective: activeCycle?.objective ?? client.objective,
      };
    });
  }),

  get: base
    .input(z.object({ id: z.number(), cycleId: z.number().optional() }))
    .handler(async ({ input }) => {
      const client = await loadClient(input.id);
      const cycle = await loadCycle(client.id, input.cycleId);
      const [entries, tasks] = await Promise.all([
        db
          .select()
          .from(schema.timeEntries)
          .where(
            and(
              eq(schema.timeEntries.clientId, client.id),
              eq(schema.timeEntries.cycleId, cycle.id),
            ),
          ),
        db.select().from(schema.manualTasks).where(eq(schema.manualTasks.clientId, client.id)),
      ]);
      const automation = calculateAutomation(tasks);
      return {
        ...client,
        founderMinutes: entries.reduce((total, entry) => total + entry.minutes, 0),
        automationScore: automation.automated,
        standardizedScore: automation.standardized,
        manualScore: automation.manual,
        cycle,
      };
    }),

  create: base
    .input(
      z.object({
        code: z.string().min(2),
        name: z.string().min(2),
        type: z.enum(["Interno", "Externo"]),
        service: z.string().min(2),
        objective: z.string().default(""),
        status: z.enum(["Activo", "Pausado", "Prospecto"]).default("Activo"),
        contactName: z.string().default(""),
        contactEmail: z.string().default(""),
        contactWhatsapp: z.string().default(""),
        createInitialCycle: z.boolean().default(true),
        cycleName: z.string().default(""),
        cycleStartDate: z.string().default(""),
        cycleEndDate: z.string().default(""),
        cycleBusinessGoal: z.string().default(""),
        cycleTargetContentCount: z.number().int().min(1).max(100).default(8),
      }),
    )
    .handler(async ({ input }) => {
      if (input.createInitialCycle && (!input.cycleName.trim() || !input.cycleStartDate || !input.cycleEndDate)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Para crear el ciclo inicial indica nombre, fecha de inicio y fecha de fin",
        });
      }
      if (input.createInitialCycle && input.cycleEndDate < input.cycleStartDate) {
        throw new ORPCError("BAD_REQUEST", { message: "La fecha de fin no puede ser anterior a la de inicio" });
      }

      const duplicate = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.code, input.code));
      if (duplicate.length) {
        throw new ORPCError("BAD_REQUEST", { message: "Ese código de cliente ya existe" });
      }

      const [created] = await db
        .insert(schema.clients)
        .values({
          code: input.code.trim(),
          name: input.name.trim(),
          type: input.type,
          service: input.service.trim(),
          objective: input.objective.trim(),
          status: input.status,
          contactName: input.contactName.trim(),
          contactEmail: input.contactEmail.trim(),
          contactWhatsapp: input.contactWhatsapp.trim(),
        })
        .returning();

      let cycle = null;
      if (input.createInitialCycle) {
        [cycle] = await db
          .insert(schema.contentCycles)
          .values({
            clientId: created.id,
            name: input.cycleName.trim(),
            startDate: input.cycleStartDate,
            endDate: input.cycleEndDate,
            businessGoal: input.cycleBusinessGoal.trim(),
            objective: "",
            objectiveSource: "manual",
            objectiveStatus: "borrador",
            primaryMetric: "",
            baseline: "",
            target: "",
            objectiveRationale: "",
            status: "Activo",
            targetContentCount: input.cycleTargetContentCount,
          })
          .returning();

        await db.insert(schema.strategies).values({
          clientId: created.id,
          cycleId: cycle.id,
          objective: "",
          audience: "",
          problems: "",
          valueProp: "",
          competitors: "",
          pillars: "",
          channels: "",
          mainCta: "",
          aiStatus: "inactivo",
          aiMessage: "",
        });

        const templates = [
          ["Marketing Orchestrator", "Coordina el ciclo y reparte trabajo"],
          ["Research Agent", "Investiga audiencia y temas"],
          ["Competitor Agent", "Observa competencia y referencias"],
          ["Strategy Agent", "Define pilares y ángulos"],
          ["Content Agent", "Escribe copy y guiones"],
          ["Brand Guardian", "Verifica tono y coherencia de marca"],
          ["Reality Checker", "Comprueba datos y afirmaciones"],
          ["Analytics Agent", "Lee resultados y aprendizajes"],
        ] as const;

        await db.insert(schema.agents).values(
          templates.map(([name, role], index) => ({
            clientId: created.id,
            cycleId: cycle!.id,
            position: index + 1,
            name,
            role,
            status: "esperando",
            lastAction: "Cliente nuevo; ciclo listo para configurar",
          })),
        );
      }

      return { client: created, cycle };
    }),

  updateBrand: base
    .input(
      z.object({
        id: z.number(),
        brandVoice: z.string(),
        brandPillars: z.string(),
        brandColors: z.string(),
        brandNotes: z.string(),
        brandUseWords: z.string(),
        brandAvoidWords: z.string(),
        allowedPromises: z.string(),
        communicationRestrictions: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...patch } = input;
      const [updated] = await db
        .update(schema.clients)
        .set(patch)
        .where(eq(schema.clients.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Cliente no encontrado" });
      return updated;
    }),

  /** Todo lo necesario para Inicio, derivado de datos reales del ciclo. */
  dashboard: base
    .input(z.object({ clientId: z.number(), cycleId: z.number().optional() }))
    .handler(async ({ input }) => {
      const client = await loadClient(input.clientId);
      const cycle = await loadCycle(client.id, input.cycleId);
      const [manualAttention, content, agents, entries, tasks] = await Promise.all([
        db
          .select()
          .from(schema.attentionItems)
          .where(eq(schema.attentionItems.clientId, client.id))
          .orderBy(asc(schema.attentionItems.id)),
        db
          .select()
          .from(schema.contentItems)
          .where(
            and(
              eq(schema.contentItems.clientId, client.id),
              eq(schema.contentItems.cycleId, cycle.id),
            ),
          )
          .orderBy(asc(schema.contentItems.id)),
        db
          .select()
          .from(schema.agents)
          .where(
            and(eq(schema.agents.clientId, client.id), eq(schema.agents.cycleId, cycle.id)),
          )
          .orderBy(asc(schema.agents.position)),
        db
          .select()
          .from(schema.timeEntries)
          .where(
            and(
              eq(schema.timeEntries.clientId, client.id),
              eq(schema.timeEntries.cycleId, cycle.id),
            ),
          )
          .orderBy(asc(schema.timeEntries.id)),
        db
          .select()
          .from(schema.manualTasks)
          .where(eq(schema.manualTasks.clientId, client.id))
          .orderBy(asc(schema.manualTasks.id)),
      ]);

      const founderMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);
      const readyForApproval = content.filter(
        (item) => item.approvalState === "listo" || item.approvalState === "dato_por_confirmar",
      ).length;
      const automation = calculateAutomation(tasks);

      const pipeline = pipelineMeta.map(([stage, name], index) => ({
        id: index + 1,
        position: index + 1,
        name,
        count: content.filter((item) => item.stage === stage).length,
      }));

      const attention = [
        ...dynamicAttention(content, tasks),
        ...manualAttention
          .filter((item) => item.cycleId === null || item.cycleId === cycle.id)
          .map((item) => ({
            id: item.id,
            priority: item.priority,
            title: item.title,
            detail: item.detail,
            link: item.link,
            linkLabel: item.linkLabel,
          })),
      ];

      const distribution = Object.entries(
        entries.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.category] = (acc[entry.category] ?? 0) + entry.minutes;
          return acc;
        }, {}),
      ).map(([category, minutes], index) => ({ id: index + 1, category, minutes }));

      return {
        client: {
          ...client,
          founderMinutes,
          automationScore: automation.automated,
          standardizedScore: automation.standardized,
          manualScore: automation.manual,
        },
        cycle,
        attention,
        content,
        pipeline,
        agents,
        hours: distribution,
        tasks,
        automation,
        kpis: {
          cycleContent: content.length,
          targetContent: cycle.targetContentCount,
          readyForApproval,
          scheduled: content.filter((item) => item.stage === "programado").length,
          published: content.filter((item) => item.stage === "publicado").length,
          leads: client.leads,
          founderMinutes,
          automationScore: automation.automated,
        },
      };
    }),
};
