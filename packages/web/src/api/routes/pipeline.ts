import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { ORPCError } from '@orpc/server';
import { base } from '../__core/app';
import { db } from '../database';
import { opportunities } from '../database/schema';
export const stages = ['Prospecto','Calificado','Contactado','Respondió','Diagnóstico','Propuesta','Ganado','Perdido'] as const;
const date = z.union([z.literal(''), z.iso.date()]);
const fields = z.object({
  business:z.string().trim().min(1).max(200), segment:z.string().max(200), location:z.string().max(200),
  contact:z.string().max(500), fit:z.string().max(4000), priority:z.enum(['Alta','Media','Baja']),
  score:z.number().int().min(0).max(100).nullable(), offer:z.string().max(2000),
  estimatedValue:z.number().int().min(0).max(100000000).nullable(), monthlyRevenue:z.number().int().min(0).max(100000000),
  state:z.enum(stages), lastContact:date, nextAction:z.string().max(2000), followUpDate:date, notes:z.string().max(12000),
});
export const pipeline = {
  list:base.handler(async()=>db.select().from(opportunities).orderBy(desc(opportunities.updatedAt),desc(opportunities.id))),
  create:base.input(fields).handler(async({input})=>{
    const [row]=await db.insert(opportunities).values({...input,updatedAt:new Date()}).returning(); return row;
  }),
  update:base.input(fields.extend({id:z.number().int().positive()})).handler(async({input})=>{
    const {id,...data}=input;
    const [row]=await db.update(opportunities).set({...data,updatedAt:new Date()}).where(eq(opportunities.id,id)).returning();
    if(!row)throw new ORPCError('NOT_FOUND',{message:'Oportunidad no encontrada'});return row;
  }),
};
