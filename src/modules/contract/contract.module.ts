import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractEntity } from './contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContractEntity])],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
