import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from "../generated/prisma/client.js"; 

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

//RLS Prisma Extension
export const withTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Bypass global models
          if (model === 'Tenant') return query(args);

          const anyArgs = args as any;

          //Enforce tenantId on all filtering operations
          if (['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'update', 'updateMany', 'delete', 'deleteMany', 'aggregate', 'groupBy'].includes(operation)) {
            anyArgs.where = { ...anyArgs.where, tenantId };
            return query(anyArgs);
          }

          //Convert findUnique to findFirst to avoid strict index requirement errors
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            anyArgs.where = { ...anyArgs.where, tenantId };
            const method = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
            const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
            return (prisma as any)[modelKey][method](anyArgs);
          }

          //Force tenantId into all inserts
          if (operation === 'create' || operation === 'createMany') {
            if (anyArgs.data) {
              if (Array.isArray(anyArgs.data)) {
                anyArgs.data = anyArgs.data.map((d: any) => ({ ...d, tenantId }));
              } else {
                anyArgs.data = { ...anyArgs.data, tenantId };
              }
            }
          }

          return query(anyArgs);
        }
      }
    }
  });
};