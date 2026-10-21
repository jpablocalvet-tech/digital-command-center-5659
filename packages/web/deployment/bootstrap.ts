import { db } from '../src/api/database';
import * as s from '../src/api/database/schema';
import { eq } from 'drizzle-orm';
/** Explicit, idempotent operator setup. Never deletes or replaces existing records. */
export async function bootstrap(){
  let [ruta]=await db.select().from(s.clients).where(eq(s.clients.code,'Cliente 000'));
  if(!ruta){[ruta]=await db.insert(s.clients).values({code:'Cliente 000',name:'RUTA Travel Design Studio',type:'Piloto interno',service:'Sistema de contenido y gestión digital',objective:'Conseguir solicitudes reales de diseño de viajes.',status:'Activo',brandVoice:'Cercana, experta y honesta. Clara y útil, sin exageraciones.',brandNotes:'Piloto interno. No representa facturación externa.',allowedPromises:'Diseño personalizado según el servicio contratado.',communicationRestrictions:'No prometer disponibilidad, precios, descuentos ni ahorros sin fuente vigente.'}).returning();}
  const cycles=await db.select().from(s.contentCycles).where(eq(s.contentCycles.clientId,ruta.id));
  if(!cycles.length){await db.insert(s.contentCycles).values({clientId:ruta.id,name:'RUTA · Octubre 2026',startDate:'2026-10-01',endDate:'2026-10-31',businessGoal:'Validar captación y entrega con evidencia real.',objective:'Establecer una línea base de solicitudes cualificadas.',objectiveSource:'manual_bootstrap',objectiveStatus:'aprobado',baseline:'Sin línea base validada',target:'Establecer línea base',status:'Activo'});}
  await db.insert(s.opportunities).values([
    {seedKey:'gestion-visible-90',business:'Administración Residencial',segment:'Administración residencial',fit:'Oportunidad real conocida para GESTIÓN VISIBLE 90.',offer:'GESTIÓN VISIBLE 90',estimatedValue:14900,state:'Calificado',nextAction:'Revisar la propuesta preparada y confirmar alcance y siguiente paso.',notes:'Valor objetivo $14,900 MXN indicado por el operador; no es ingreso ni mensualidad confirmada. Hay propuesta en preparación según conversación Diseñar propuesta comercial. Estado comercial inicial por confirmar. Contacto, ubicación y fechas pendientes de confirmar.'},
    {seedKey:'casem',business:'CASEM',segment:'Psicólogos',fit:'Oportunidad comercial real indicada por el operador; rediseño de logo como posible gancho.',offer:'Evaluar imagen, comunicación, captación y seguimiento según diagnóstico; no limitar automáticamente al logo.',state:'Calificado',nextAction:'Revisar evidencia disponible y precisar necesidad, alcance y propuesta.',notes:'No hay valor, contacto, ubicación ni fechas confirmados en la evidencia recuperada. Estado comercial inicial por confirmar. No asumir propuesta enviada ni aceptación.'}
  ]).onConflictDoNothing({target:s.opportunities.seedKey});
  return {ok:true,opportunities:2};
}
