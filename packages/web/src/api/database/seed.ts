/**
 * Semilla de datos mock para la V0.1: Cliente 000 — RUTA Travel Design Studio.
 * Ejecutar: cd packages/web && bun --env-file=../../.env src/api/database/seed.ts
 */
import { db } from "./index";
import * as schema from "./schema";

async function seed() {
  await db.delete(schema.attentionItems);
  await db.delete(schema.contentItems);
  await db.delete(schema.pipelineStages);
  await db.delete(schema.agents);
  await db.delete(schema.founderHours);
  await db.delete(schema.manualTasks);
  await db.delete(schema.strategies);
  await db.delete(schema.clients);

  const [ruta] = await db
    .insert(schema.clients)
    .values({
      code: "Cliente 000",
      name: "RUTA Travel Design Studio",
      type: "Piloto interno",
      service: "Marketing Digital",
      objective: "Generar solicitudes reales de diseño de viajes.",
      status: "Activo",
      leads: 0,
      scheduled: 0,
      automationScore: 45,
      standardizedScore: 30,
      manualScore: 25,
      brandVoice: "Cercana, experta y honesta. Habla de viajes como diseño, no como paquetes.",
      brandPillars: "Educación de viaje · Diseño a medida · Errores que evitar · Detrás del proceso",
      brandColors: "Arena, verde profundo, tinta",
      brandNotes: "Evitar clichés de agencia de viajes y promesas de precio.",
      learning: "Todavía no hay suficientes datos publicados para generar conclusiones.",
    })
    .returning();

  const clientId = ruta.id;

  await db.insert(schema.attentionItems).values([
    {
      clientId,
      priority: "critico",
      title: "2 contenidos listos para aprobación",
      detail: "Carrusel Europa y Story CTA esperan tu decisión para poder programarse.",
      link: "/aprobaciones",
      linkLabel: "Ir a Aprobaciones",
    },
    {
      clientId,
      priority: "atencion",
      title: "1 contenido requiere confirmar una afirmación",
      detail: "Reel “¿Agencia de viajes o Travel Designer?” tiene un dato sin verificar.",
      link: "/aprobaciones",
      linkLabel: "Revisar dato",
    },
    {
      clientId,
      priority: "informativo",
      title: "1 tarea manual candidata a automatización",
      detail: "Transferencia de analytics: 30 min al mes recuperables.",
      link: "/hours-automation",
      linkLabel: "Ver backlog",
    },
  ]);

  await db.insert(schema.pipelineStages).values([
    { clientId, position: 1, name: "Idea", count: 8 },
    { clientId, position: 2, name: "Research", count: 8 },
    { clientId, position: 3, name: "Strategy", count: 8 },
    { clientId, position: 4, name: "Content", count: 6 },
    { clientId, position: 5, name: "Brand Review", count: 4 },
    { clientId, position: 6, name: "Reality Check", count: 3 },
    { clientId, position: 7, name: "Approval", count: 2 },
    { clientId, position: 8, name: "Publishing", count: 0 },
  ]);

  await db.insert(schema.contentItems).values([
    {
      clientId,
      type: "Carrusel",
      title: "5 errores que encarecen un viaje a Europa",
      objective: "Generar solicitudes de diseño de viaje",
      cta: "Solicita tu ruta a medida",
      stage: "aprobacion",
      approvalState: "listo",
      brandStatus: "Aprobado",
      realityStatus: "Verificado",
      scheduledLabel: "Martes",
      scheduledBucket: "semana",
      note: "Listo para aprobación.",
    },
    {
      clientId,
      type: "Reel",
      title: "¿Agencia de viajes o Travel Designer?",
      objective: "Diferenciar la propuesta de valor",
      cta: "Escríbenos por WhatsApp",
      stage: "aprobacion",
      approvalState: "dato_por_confirmar",
      brandStatus: "Aprobado",
      realityStatus: "Dato por confirmar",
      scheduledLabel: "Jueves",
      scheduledBucket: "semana",
      note: "Afirmación sobre ahorro promedio sin fuente.",
    },
    {
      clientId,
      type: "Story / CTA",
      title: "Solicitud RUTA: diseña tu viaje",
      objective: "Captar solicitudes directas",
      cta: "Toca para solicitar",
      stage: "quality",
      approvalState: "pendiente",
      brandStatus: "En revisión",
      realityStatus: "Pendiente",
      scheduledLabel: "Sábado",
      scheduledBucket: "semana",
      note: "",
    },
    {
      clientId,
      type: "Carrusel",
      title: "Cómo se diseña un itinerario de 14 días",
      objective: "Mostrar el proceso de trabajo",
      cta: "Agenda una llamada",
      stage: "diseno",
      approvalState: "pendiente",
      brandStatus: "Pendiente",
      realityStatus: "Pendiente",
      scheduledLabel: "",
      scheduledBucket: "",
      note: "",
    },
    {
      clientId,
      type: "Reel",
      title: "3 destinos infravalorados de Italia",
      objective: "Alcance con audiencia nueva",
      cta: "Guarda para tu próximo viaje",
      stage: "copy",
      approvalState: "pendiente",
      brandStatus: "Pendiente",
      realityStatus: "Pendiente",
      scheduledLabel: "",
      scheduledBucket: "",
      note: "",
    },
    {
      clientId,
      type: "Post",
      title: "Qué incluye (y qué no) un viaje diseñado",
      objective: "Resolver objeción de precio",
      cta: "Solicita presupuesto",
      stage: "copy",
      approvalState: "pendiente",
      brandStatus: "Pendiente",
      realityStatus: "Pendiente",
      scheduledLabel: "",
      scheduledBucket: "",
      note: "",
    },
    {
      clientId,
      type: "Carrusel",
      title: "Presupuesto real de un viaje a Japón",
      objective: "Autoridad y confianza",
      cta: "Solicita tu ruta a medida",
      stage: "research",
      approvalState: "pendiente",
      brandStatus: "Pendiente",
      realityStatus: "Pendiente",
      scheduledLabel: "",
      scheduledBucket: "",
      note: "",
    },
    {
      clientId,
      type: "Reel",
      title: "Errores al reservar vuelos con escalas",
      objective: "Educación de viaje",
      cta: "Sigue para más",
      stage: "idea",
      approvalState: "pendiente",
      brandStatus: "Pendiente",
      realityStatus: "Pendiente",
      scheduledLabel: "",
      scheduledBucket: "",
      note: "",
    },
  ]);

  await db.insert(schema.agents).values([
    {
      clientId,
      position: 1,
      name: "Marketing Orchestrator",
      role: "Coordina el ciclo y reparte trabajo",
      status: "completado",
      lastAction: "Ciclo de octubre planificado",
    },
    {
      clientId,
      position: 2,
      name: "Research Agent",
      role: "Investiga audiencia y temas",
      status: "completado",
      lastAction: "8 temas validados",
    },
    {
      clientId,
      position: 3,
      name: "Competitor Agent",
      role: "Observa competencia y referencias",
      status: "completado",
      lastAction: "4 competidores mapeados",
    },
    {
      clientId,
      position: 4,
      name: "Strategy Agent",
      role: "Define pilares y ángulos",
      status: "completado",
      lastAction: "Pilares de contenido definidos",
    },
    {
      clientId,
      position: 5,
      name: "Content Agent",
      role: "Escribe copy y guiones",
      status: "trabajando",
      lastAction: "6 de 8 piezas redactadas",
    },
    {
      clientId,
      position: 6,
      name: "Brand Guardian",
      role: "Verifica tono y coherencia de marca",
      status: "esperando",
      lastAction: "Espera piezas del Content Agent",
    },
    {
      clientId,
      position: 7,
      name: "Reality Checker",
      role: "Comprueba datos y afirmaciones",
      status: "esperando",
      lastAction: "1 afirmación en cola",
    },
    {
      clientId,
      position: 8,
      name: "Analytics Agent",
      role: "Lee resultados y aprendizajes",
      status: "sin_datos",
      lastAction: "Sin datos todavía",
    },
  ]);

  await db.insert(schema.founderHours).values([
    { clientId, category: "Estrategia", minutes: 25 },
    { clientId, category: "Revisión", minutes: 35 },
    { clientId, category: "Diseño", minutes: 20 },
    { clientId, category: "Administración", minutes: 15 },
  ]);

  await db.insert(schema.manualTasks).values([
    {
      clientId,
      task: "Revisión final de contenido",
      frequency: "Por pieza",
      minutes: 8,
      timesPerMonth: 8,
      classification: "founder_only",
      priority: "alta",
      status: "pendiente",
    },
    {
      clientId,
      task: "Preparación gráfica",
      frequency: "Semanal",
      minutes: 25,
      timesPerMonth: 4,
      classification: "estandarizable",
      priority: "alta",
      status: "pendiente",
    },
    {
      clientId,
      task: "Transferencia de analytics",
      frequency: "Mensual",
      minutes: 30,
      timesPerMonth: 1,
      classification: "automatizable",
      priority: "media",
      status: "pendiente",
    },
    {
      clientId,
      task: "Organización de archivos",
      frequency: "Semanal",
      minutes: 15,
      timesPerMonth: 4,
      classification: "automatizable",
      priority: "media",
      status: "pendiente",
    },
    {
      clientId,
      task: "Programación manual de publicaciones",
      frequency: "Semanal",
      minutes: 20,
      timesPerMonth: 4,
      classification: "automatizable",
      priority: "alta",
      status: "en_proceso",
    },
    {
      clientId,
      task: "Respuesta a mensajes recurrentes",
      frequency: "Diaria",
      minutes: 10,
      timesPerMonth: 20,
      classification: "delegable",
      priority: "baja",
      status: "pendiente",
    },
  ]);

  await db.insert(schema.strategies).values({
    clientId,
    objective: "Generar solicitudes reales de diseño de viajes cada mes.",
    audience:
      "Profesionales de 30 a 50 años que quieren viajar bien, sin tiempo para planificar y con presupuesto medio-alto.",
    problems:
      "No saben cuánto cuesta realmente un viaje · Pierden horas comparando opciones · Miedo a equivocarse en la ruta · Confunden agencia tradicional con travel designer.",
    valueProp:
      "Diseñamos el viaje a medida: ruta, ritmo y logística pensados para ti, sin paquetes genéricos.",
    competitors:
      "Agencias tradicionales locales · Plataformas de itinerarios automáticos · Creadores de viajes en Instagram · Booking / OTAs.",
    pillars:
      "Educación de viaje · Errores que evitar · Diseño a medida · Detrás del proceso · Casos reales.",
    channels: "Instagram (principal) · WhatsApp (conversión) · Email (seguimiento).",
    mainCta: "Solicita el diseño de tu viaje.",
    aiStatus: "inactivo",
    aiMessage: "",
  });

  console.log("Semilla lista: RUTA Travel Design Studio (Cliente 000).");
}

await seed();
