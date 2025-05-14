import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './modules/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlackModule } from './modules/black/black.module';
import { ContractModule } from './modules/contract/contract.module';
import { SyncModule } from './modules/sync/sync.module';

const dbConfig: any = {
  name: 'default',
  type: 'mysql',
  host: process.env.DBHOST_ || '127.0.0.1',
  port: process.env.DBPORT_ || 3306,
  username: process.env.SDBUSER_ || 'root',
  password: process.env.DBPWD_ || 'm123456!@~',
  database: process.env.DBNAME_ || 'sync',
  synchronize: true,
  logging: false,
  // uuidExtension: true,
  entities: ['dist/**/**/**.entity.js'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  // entitySchemas: ['src/schema/**/*.json'],
  cli: {
    entitiesDir: 'src/**/**.entity.ts',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscribers',
  },
  uuidExtension: 'uuid-ossp', //pgcrypto
  charset: 'utf8mb4',
};
@Module({
  imports: [
    ScheduleModule.forRoot(),
    UsersModule,
    TypeOrmModule.forRoot(dbConfig),
    BlackModule,
    ContractModule,
    SyncModule,
  ],
  providers: [AppService],
})
export class AppModule {}
