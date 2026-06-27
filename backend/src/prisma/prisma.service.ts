import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;

  constructor() {
    // 1. Initialize a native PostgreSQL connection pool using your local database URL
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // 2. Wrap it cleanly inside the official Prisma 7 Driver Adapter
    const adapter = new PrismaPg(pool);

    // 3. Pass the driver adapter straight to the client constructor
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}