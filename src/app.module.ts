import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './modules/users/users.module';
import * as config from 'config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlackModule } from './modules/black/black.module';
import { ContractModule } from './modules/contract/contract.module';
import { SyncModule } from './modules/sync/sync.module';

const dbConfig = config.get<any>('typeorm');

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
