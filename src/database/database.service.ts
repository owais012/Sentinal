import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { DATABASE_CONNECTION } from './database.provider';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly pool: Pool) {
    this.pool.on('error', (err) => {
      this.logger.error('Database pool error:', err);
    });
  }
  //to check if query resoponse is important to put as <T> or not
  
  async query(text: string, params?: any[]): Promise<QueryResult<any>> {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${text}`, error);
      throw error;
    }
  }

  async transaction(callback: (pool: Pool) => Promise<any>): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client as any);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database connection pool closed');
  }
}