import { Injectable, OnModuleInit } from '@nestjs/common';
import { BlackEntity } from './black.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { abi } from '../../abi/StakingContractV3.json';
import { ContractService } from '../contract/contract.service';
import { UsersService } from '../users/users.service';

import * as config from 'config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlackDataDto } from './blackData.dto';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const { url } = config.get('rpc');
console.log(url, '-------');
const provider = new JsonRpcProvider(url);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

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
        await this.blackEntityRepository.upsert(entity, ['address']);
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
        unBlackedEntity.blacked = true;
        await this.blackEntityRepository.save(unBlackedEntity);
      } catch (e) {
        console.log(e.message);
      }
    }
  }

  async setAllBlack(blackData: BlackDataDto) {
    if (!this.contractAddress) return;
    const contract = new Contract(this.contractAddress, abi, wallet);
    const readContract = new Contract(this.contractAddress, abi, provider);

    const { startId, endId } = blackData;
    const userList = await this.usersService.getAllUser(
      parseInt(startId),
      parseInt(endId),
    );

    for (const user of userList) {
      const address = user.address.toLowerCase();
      const hasBlack = await readContract.isInBlacklist(address);
      if (!hasBlack) {
        const tx = await contract.setBlacklist(address, true);
        console.log(`address ${address} has blacked, hash: ${tx.hash}`);
      }
      //   延时500ms
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return true;
  }

  getBuilder() {
    const builder = this.blackEntityRepository.createQueryBuilder('black');
    builder
      .leftJoin('sync', 'sync', 'black.sync_id = sync.id')
      .addSelect('black.*')
      .addSelect('sync.*');
    return builder;
  }
  async getList(): Promise<any[]> {
    const builder = this.getBuilder().take(30).addOrderBy('black.id', 'DESC');
    return await builder.getRawMany();
  }

  async searchBlack(address: string): Promise<any> {
    const builder = this.getBuilder().where('black.address = :address', {
      address,
    });
    return await builder.getRawOne();
  }
}
