import { Injectable, OnModuleInit } from '@nestjs/common';
import { BlackEntity } from './black.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as config from 'config';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { abi } from '../../abi/StakingContractV3.json';
import { ContractService } from '../contract/contract.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';
const privateKey: string = config.get('privateKey');
const rpcUrl: string = config.get('rpc.url');
const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);

@Injectable()
export class BlackService implements OnModuleInit {
  private contractAddress: string;
  constructor(
    @InjectRepository(BlackEntity)
    private readonly blackEntityRepository: Repository<BlackEntity>,
    private readonly contractService: ContractService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const res = await this.contractService.getAllContract();
    if (res && res.length) {
      this.contractAddress = res[0].address;
    }
  }

  async batchSave(data: any[]) {
    try {
      for (const item of data) {
        const entity = new BlackEntity();
        entity.address = item.address;
        entity.userId = item.userId;
        entity.syncId = item.syncId;
        await this.blackEntityRepository.save(entity);
      }
    } catch (e) {
      console.log(e.message);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async setBlack() {
    if (!this.contractAddress) return;
    const contract = new Contract(this.contractAddress, abi, wallet);
    const readContract = new Contract(this.contractAddress, abi, provider);
    // 查询 address
    const unBlackedEntitys = await this.blackEntityRepository.find({
      where: { blacked: false },
    });

    for (const unBlackedEntity of unBlackedEntitys) {
      try {
        const hasBlack = await readContract.isInBlacklist(
          unBlackedEntity.address,
        );
        console.log(hasBlack, '------hasBlack-----');
        if (!hasBlack) {
          const tx = await contract.setBlacklist(unBlackedEntity.address, true);
          unBlackedEntity.hash = tx.hash;
        }
        await this.usersService.changeAddress(
          Number(unBlackedEntity.userId),
          unBlackedEntity.address,
        );
        await this.blackEntityRepository.save(unBlackedEntity);
      } catch (e) {
        console.log(33333);
        console.log(e.message);
      }
    }
  }
}
