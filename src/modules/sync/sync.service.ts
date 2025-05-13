import { Injectable, OnModuleInit } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';
import * as config from 'config';
import { ethers, JsonRpcProvider, TransactionReceipt } from 'ethers';
import * as fs from 'node:fs';
import pLimit from 'p-limit';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncEntity } from './sync.entity';
import { BlackService } from '../black/black.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { init } from '../../common/utils';

const batchSize = 20;
const limit = pLimit(batchSize);

const rpcUrl: string = config.get('rpc.url');
const provider = new JsonRpcProvider(rpcUrl);
let blockNumber = '0';
@Injectable()
export class SyncService implements OnModuleInit {
  private addresses: UserEntity[] = [];
  private isProcessing = false;
  constructor(
    private readonly contractService: ContractService,
    private readonly usersService: UsersService,
    private readonly blackService: BlackService,
    @InjectRepository(SyncEntity)
    private readonly syncEntityRepository: Repository<SyncEntity>,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async sync() {
    console.log(blockNumber, 'blockNumber');

    if (!init.address) {
      console.log('地址初始化未结束');
      return;
    }
    if (this.isProcessing) {
      console.log('Previous request still processing, skipping...');
      return;
    }

    try {
      this.addresses = await this.usersService.getAllAddress();
      if (!this.addresses.length) {
        console.log('用户地址还不存在');
        return;
      }
      this.isProcessing = true;
      await this.syncBlock();
      blockNumber = (BigInt(blockNumber) + BigInt(1)).toString();
      fs.writeFileSync('blockHeight', blockNumber, 'utf-8');
    } finally {
      this.isProcessing = false;
    }
  }

  async onModuleInit() {
    console.log(blockNumber, '-----blockNumber');
    try {
      const height = fs.readFileSync('blockHeight', 'utf-8');
      if (height) {
        blockNumber = height;
      } else {
        blockNumber = await this.contractService.getMinBlockNumber();
      }
    } catch (e) {
      blockNumber = await this.contractService.getMinBlockNumber();
    }

    const addresses = await this.usersService.getAllAddress();
    if (!addresses.length) {
      console.log('用户地址还不存在');
      return;
    }
    this.addresses = addresses;
  }
  async syncBlock() {
    // 检查区块号格式
    const blockNumberBigInt = BigInt(blockNumber);
    console.log('Block number as BigInt:', blockNumberBigInt.toString());

    // 将区块号转换为十六进制
    const blockNumberHex = `0x${BigInt(blockNumber).toString(16)}`;
    console.log('Block number as hex:', blockNumberHex);

    // 直接使用 RPC 调用
    const block: any = await provider.send('eth_getBlockByNumber', [
      blockNumberHex,
      true, // 获取完整交易信息
    ]);
    const contractTransactions = block.transactions.filter((item) => {
      return item.input !== '0x';
    });
    const transactions = block.transactions.filter((item) => {
      return item.input == '0x';
    });

    await this.syncContractTransaction(contractTransactions);
    await this.syncTransaction(transactions);
  }

  async syncTransaction(transactions: any[]) {
    for (const transaction of transactions) {
      const { from, to } = transaction;
      const fromUserEntity = this.addresses.find(
        (item) => item.address.toLowerCase() === from.toLowerCase(),
      );
      const toUserEntity = this.addresses.find(
        (item) => item.address.toLowerCase() === to.toLowerCase(),
      );
      if (fromUserEntity && toUserEntity) {
        const entity = new SyncEntity();
        entity.hash = transaction.hash;
        entity.data = JSON.stringify({
          hash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          blockNumber: transaction.blockNumber,
        });
        entity.blockHeight = transaction.blockNumber.toString();
        entity.fromAddress = from;
        entity.fromUserId = fromUserEntity.id;
        entity.toAddress = to;
        entity.toUserId = toUserEntity.id;
        entity.amount = BigInt(transaction.value).toString();
        entity.type = 1;
        await this.syncEntityRepository.save(entity);
        const arr = [
          {
            address: from,
            userId: fromUserEntity.id,
            syncId: entity.id,
          },
          {
            address: to,
            userId: toUserEntity.id,
            syncId: entity.id,
          },
        ];
        await this.blackService.batchSave(arr);
      }
    }
  }

  async syncContractTransaction(transactions: any[]) {
    const txs: any[] = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const tasks = batch.map((transation) => {
        return limit(async () => {
          const tx = await provider.getTransactionReceipt(transation.hash);
          if (!tx) return;
          await this.parseContractTransaction(tx);
        });
      });
      const result = await Promise.all(tasks);
      txs.push(...result);
      console.log(
        `Processed ${i + batch.length} of ${transactions.length} transactions`,
      );
    }
  }

  async parseContractTransaction(transaction: TransactionReceipt) {
    //  input 存在，且 input 以 transfer开头 合约
    const logs = transaction.logs;
    if (!logs.length) {
      return;
    }
    for (const log of logs) {
      const { topics } = log;

      if (
        log.address === '0x55d398326f99059fF775485246999027B3197955' &&
        topics[0] ===
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      ) {
        //   from to
        const from = ethers
          .getAddress('0x' + topics[1].slice(26))
          .toLowerCase();
        const to = ethers.getAddress('0x' + topics[2].slice(26)).toLowerCase();
        const fromUserEntity = this.addresses.find(
          (item) => item.address.toLowerCase() === from.toLowerCase(),
        );
        const toUserEntity = this.addresses.find(
          (item) => item.address.toLowerCase() === to.toLowerCase(),
        );

        if (fromUserEntity && toUserEntity) {
          const entity = new SyncEntity();
          entity.hash = transaction.hash;
          entity.data = JSON.stringify({
            hash: transaction.hash,
            from: transaction.from,
            to: transaction.to,
            blockNumber: transaction.blockNumber,
            logs: transaction.logs,
          });
          entity.blockHeight = transaction.blockNumber.toString();
          entity.fromAddress = from;
          entity.fromUserId = fromUserEntity.id;
          entity.toAddress = to;
          entity.toUserId = toUserEntity.id;
          entity.type = 2;
          entity.amount = BigInt(log.data).toString();
          await this.syncEntityRepository.save(entity);

          const arr = [
            {
              address: from,
              userId: fromUserEntity.id,
              syncId: entity.id,
            },
            {
              address: to,
              userId: toUserEntity.id,
              syncId: entity.id,
            },
          ];
          await this.blackService.batchSave(arr);
        }
      }
    }
  }
}
