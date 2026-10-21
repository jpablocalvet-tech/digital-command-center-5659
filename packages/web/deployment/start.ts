import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from '../src/api/database';
import { bootstrap } from './bootstrap';
import { createProductionApp } from './app';

// Validate operator access before migrations, seeds or accepting traffic.
const app=createProductionApp(process.env.OPERATOR_USERNAME || '',process.env.OPERATOR_PASSWORD || '');
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; use the persistent disk.');
await migrate(db,{migrationsFolder:resolve(import.meta.dirname,'../../../drizzle')});
await bootstrap();
const server=Bun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT || 3000),fetch:app.fetch});
console.log(`TZALAM Command listening on port ${server.port}; owner authentication required.`);
