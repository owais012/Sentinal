import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { databaseProvider } from './database.provider';

@Module({
  imports: [ConfigModule],
  providers: [databaseProvider, DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}