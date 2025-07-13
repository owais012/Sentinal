import { Pool } from 'pg';
import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  useFactory: async (configService: ConfigService): Promise<Pool> => {
    try {
      const pool = new Pool({
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        user: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        max: configService.get<number>('DB_POOL_SIZE', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        // ssl: {
        //   rejectUnauthorized: false, 
        // },
      });

      // Test the connection
      await pool.connect();
      Logger.log(
        'Database connection established successfully',
        'DatabaseProvider',
      );
      return pool;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  },
  inject: [ConfigService],
};
