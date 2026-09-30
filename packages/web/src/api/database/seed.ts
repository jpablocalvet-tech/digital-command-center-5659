/**
 * Semilla de datos para V0.2 CORE: Cliente 000 — RUTA Travel Design Studio.
 * Ejecutar: cd packages/web && bun --env-file=../../.env src/api/database/seed.ts
 */
import { db } from "./index";
import * as schema from "./schema";

async function seed() {
  await db.delete(schema.approvalEvents);
  await db.delete(schema.attentionItems);
  await db.delete(schema.contentItems);
  await db.delete(schema.agents);
  await db.delete(schema.timeEntries);
  await db.delete(schema.manualTasks);
  await db.delete(schema.strategies);
  await db.delete(schema.contentCycles);
  await db.delete(schema.clients);

  const [ruta] = await db
    .insert(schema.clients)
    .values({
      code: "Cliente 000",
      name: "RUTA Travel Design Studio",
      type: "Piloto interno",
      service: "Sistema de contenido y gestión digital",
      objective: "Conseguir solicitudes reales de diseño de viajes.",
      status: "Activo",
      leads: 0,
      scheduled: 0,
      brandVoice:
        "Cercana, experta y honesta. Habla de viajes como diseño, no como paquetes. Clara y útil, sin exageraciones.",
      brandPillars:
        "Educación de viaje · Diseño a medida · Errores que evitar · Detrás del proceso · Casos reales",
      brandColors: "Arena, verde profundo, tinta",
      brandNotes: "Evitar clichés de agencia de viajes y promesas de ahorro no demostrables.",
      brandUseWords: "diseño de viaje · ruta · estrategia de reservas · a medida · acompañamiento",
      brandAvoidWords: "curaduría · paquete turístico · viaje perfecto · barato garantizado",
      allowedPromises:
        "Diseño personalizado, claridad de ruta, estrategia de reservas, organización y acompañamiento según el servicio contratado.",
      communicationRestrictions:
        "No prometer disponibilidad, precios, descuentos ni ahorros sin fuente vigente. No presentar RUTA como OTA.",
      learning: "Todavía no hay suficientes datos publicados para generar conclusiones.",
    })
    .returning();

  const clientId = ruta.id;

  const [cycle] = await db
    .insert(schema.contentCycles)
    .values({
      clientId,
      name: "RUTA · Octubre 2026",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      businessGoal:
        "Conseguir las primeras solicitudes reales de diseño de viajes sin depender de publicidad pagada.",
      objective:
        "Generar solicitudes cualificadas para RUTA y establecer una línea base de conversión orgánica durante octubre.",
      objectiveSource: "manual_bootstrap",
      objectiveStatus: "aprobado",
      primaryMetric: "Solicitudes cualificadas",
      baseline: "Sin línea base validada todavía",
      target: "Establecer línea base; no inventar meta numérica antes del primer ciclo",
      objectiveRationale:
        "Es el primer ciclo operativo. La prioridad es obtener evidencia real de interés y medir el embudo antes de fijar objetivos cuantitativos.",
      status: "Activo",
      targetContentCount: 8,
    })
    .returning();

  const cycleId = cycle.id;

  const insertedContent = await db
    .insert(schema.contentItems)
    .values([
      {
        clientId,
        cycleId,
        type: "Carrusel",
        title: "5 errores que encarecen un viaje a Europa",
        objective: "Generar solicitudes de diseño de viaje",
        cta: "Solicita tu ruta a medida",
        pillar: "Errores que evitar",
        channel: "Instagram",
        hook: "Cinco decisiones aparentemente pequeñas pueden encarecer mucho un viaje por Europa.",
        body:
          "Borrador de carrusel: 1) reservar sin estrategia de fechas; 2) cambiar de ciudad demasiado; 3) ignorar costos de traslado; 4) comprar entradas tarde; 5) comparar solo el precio inicial.",
        caption:
          "Planear bien no significa llenar cada minuto: significa tomar las decisiones importantes en el momento correcto.",
        visualBrief: "Carrusel limpio, editorial, 6 slides, iconografía de viaje y datos concretos.",
        sourceNotes: "Verificar cualquier cifra o afirmación de precio antes de publicar.",
        brandReviewNotes: "Tono aprobado; evitar lenguaje de agencia tradicional.",
        realityReviewNotes: "Conceptos generales verificados; no usar porcentajes sin fuente.",
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
        cycleId,
        type: "Reel",
        title: "¿Agencia de viajes o Travel Designer?",
        objective: "Diferenciar la propuesta de valor",
        cta: "Cuéntanos sobre tu viaje",
        pillar: "Diseño a medida",
        channel: "Instagram",
        hook: "No todas las personas que te ayudan a viajar hacen el mismo trabajo.",
        body:
          "Guion preliminar explicando la diferencia entre vender productos turísticos y cobrar por diseñar la lógica completa del viaje.",
        caption: "RUTA cobra por pensar el viaje contigo; no por empujarte un paquete genérico.",
        visualBrief: "Reel talking-head/motion typography, 25–35 segundos.",
        sourceNotes: "Evitar generalizaciones sobre todas las agencias de viajes.",
        brandReviewNotes: "Alineado con posicionamiento 'no vendemos, diseñamos'.",
        realityReviewNotes: "Revisar afirmación comparativa antes de publicar.",
        stage: "aprobacion",
        approvalState: "dato_por_confirmar",
        brandStatus: "Aprobado",
        realityStatus: "Dato por confirmar",
        scheduledLabel: "Jueves",
        scheduledBucket: "semana",
        note: "Afirmación comparativa requiere revisión.",
      },
      {
        clientId,
        cycleId,
        type: "Story / CTA",
        title: "Solicitud RUTA: diseña tu viaje",
        objective: "Captar solicitudes directas",
        cta: "Cuéntanos sobre tu viaje",
        pillar: "Diseño a medida",
        channel: "Instagram Stories",
        hook: "¿Ya sabes a dónde quieres ir, pero no cómo convertirlo en un viaje que funcione?",
        body: "Story de 3 frames: problema → qué hace RUTA → CTA al formulario.",
        caption: "",
        visualBrief: "3 historias verticales, tipografía grande, CTA claro.",
        stage: "quality",
        approvalState: "pendiente",
        brandStatus: "En revisión",
        realityStatus: "Pendiente",
        scheduledLabel: "Sábado",
        scheduledBucket: "semana",
      },
      {
        clientId,
        cycleId,
        type: "Carrusel",
        title: "Cómo se diseña un itinerario de 14 días",
        objective: "Mostrar el proceso de trabajo",
        cta: "Conoce RUTA Completo",
        pillar: "Detrás del proceso",
        channel: "Instagram",
        stage: "diseno",
        approvalState: "pendiente",
        brandStatus: "Pendiente",
        realityStatus: "Pendiente",
      },
      {
        clientId,
        cycleId,
        type: "Reel",
        title: "3 destinos infravalorados de Italia",
        objective: "Alcance con audiencia nueva",
        cta: "Guarda para tu próximo viaje",
        pillar: "Educación de viaje",
        channel: "Instagram",
        stage: "copy",
        approvalState: "pendiente",
        brandStatus: "Pendiente",
        realityStatus: "Pendiente",
      },
      {
        clientId,
        cycleId,
        type: "Post",
        title: "Qué incluye (y qué no) un viaje diseñado",
        objective: "Resolver objeción de precio",
        cta: "Solicita información",
        pillar: "Diseño a medida",
        channel: "Instagram",
        stage: "copy",
        approvalState: "pendiente",
        brandStatus: "Pendiente",
        realityStatus: "Pendiente",
      },
      {
        clientId,
        cycleId,
        type: "Carrusel",
        title: "Presupuesto realista de un viaje a Japón",
        objective: "Autoridad y confianza",
        cta: "Solicita tu ruta a medida",
        pillar: "Educación de viaje",
        channel: "Instagram",
        stage: "research",
        approvalState: "pendiente",
        brandStatus: "Pendiente",
        realityStatus: "Pendiente",
      },
      {
        clientId,
        cycleId,
        type: "Reel",
        title: "Errores al reservar vuelos con escalas",
        objective: "Educación de viaje",
        cta: "Sigue para más",
        pillar: "Errores que evitar",
        channel: "Instagram",
        stage: "idea",
        approvalState: "pendiente",
        brandStatus: "Pendiente",
        realityStatus: "Pendiente",
      },
    ])
    .returning();

  const first = insertedContent[0];
  const second = insertedContent[1];
  await db.insert(schema.approvalEvents).values([
    {
      contentId: first.id,
      decision: "quality_ready",
      note: "Brand Guardian y Reality Checker completaron revisión inicial.",
    },
    {
      contentId: second.id,
      decision: "dato_por_confirmar",
      note: "Reality Checker detectó una afirmación comparativa que requiere ajuste.",
    },
  ]);

  await db.insert(schema.agents).values([
    {
      clientId,
      cycleId,
      position: 1,
      name: "Marketing Orchestrator",
      role: "Coordina el ciclo y reparte trabajo",
      status: "completado",
      lastAction: "Ciclo de octubre planificado",
    },
    {
      clientId,
      cycleId,
      position: 2,
      name: "Research Agent",
      role: "Investiga audiencia y temas",
      status: "completado",
      lastAction: "8 temas validados",
    },
    {
      clientId,
      cycleId,
      position: 3,
      name: "Competitor Agent",
      role: "Observa competencia y referencias",
      status: "completado",
      lastAction: "4 competidores mapeados",
    },
    {
      clientId,
      cycleId,
      position: 4,
      name: "Strategy Agent",
      role: "Define pilares y ángulos",
      status: "completado",
      lastAction: "Pilares de contenido definidos",
    },
    {
      clientId,
      cycleId,
      position: 5,
      name: "Content Agent",
      role: "Escribe copy y guiones",
      status: "trabajando",
      lastAction: "6 de 8 piezas redactadas",
    },
    {
      clientId,
      cycleId,
      position: 6,
      name: "Brand Guardian",
      role: "Verifica tono y coherencia de marca",
      status: "esperando",
      lastAction: "Espera piezas del Content Agent",
    },
    {
      clientId,
      cycleId,
      position: 7,
      name: "Reality Checker",
      role: "Comprueba datos y afirmaciones",
      status: "esperando",
      lastAction: "1 afirmación en cola",
    },
    {
      clientId,
      cycleId,
      position: 8,
      name: "Analytics Agent",
      role: "Lee resultados y aprendizajes",
      status: "sin_datos",
      lastAction: "Sin datos todavía",
    },
  ]);

  await db.insert(schema.timeEntries).values([
    {
      clientId,
      cycleId,
      category: "Estrategia",
      minutes: 25,
      date: "2026-09-30",
      description: "Definición inicial del piloto RUTA como Cliente 000.",
    },
    {
      clientId,
      cycleId,
      category: "Revisión",
      minutes: 35,
      date: "2026-09-30",
      description: "Revisión inicial de piezas del ciclo.",
    },
    {
      clientId,
      cycleId,
      category: "Diseño",
      minutes: 20,
      date: "2026-09-30",
      description: "Ajustes visuales de prueba.",
    },
    {
      clientId,
      cycleId,
      category: "Administración",
      minutes: 15,
      date: "2026-09-30",
      description: "Organización del piloto.",
    },
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
    cycleId,
    objective: cycle.objective,
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
    mainCta: "Cuéntanos sobre tu viaje.",
    aiStatus: "inactivo",
    aiMessage: "",
  });

  console.log("Semilla lista: RUTA · Octubre 2026 (Digital Command Center V0.2 CORE). ");
}

await seed();
