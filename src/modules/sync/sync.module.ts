import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncEntity } from './sync.entity';
import { ContractModule } from '../contract/contract.module';
import { UsersModule } from '../users/users.module';
import { BlackModule } from '../black/black.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncEntity]),
    ContractModule,
    UsersModule,
    BlackModule,
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
