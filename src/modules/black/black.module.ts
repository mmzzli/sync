import { Module } from '@nestjs/common';
import { BlackService } from './black.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlackEntity } from './black.entity';
import { ContractModule } from '../contract/contract.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlackEntity]),
    ContractModule,
    UsersModule,
  ],
  providers: [BlackService],
  exports: [BlackService],
})
export class BlackModule {}
