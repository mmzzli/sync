import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContractService } from '../contract/contract.service';
import * as config from 'config';
import { ethers, JsonRpcProvider } from 'ethers';
import { UsersService } from '../users/users.service';
import * as fs from 'node:fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncEntity } from './sync.entity';
import { BlackService } from '../black/black.service';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { globalConfig, init } from '../../common/utils';
import Bull from '../../common/utils/bull';
import { BlockEntity } from './block.entity';
import { TxEntity } from './tx.entity';

const { number: queueNumber, baseBlockNumber } = globalConfig;
// 创建队列实例
const blockQueue = new Bull('block-queue', {
  concurrent: 100, // 同时处理3个任务
  maxRetries: 3, // 最多重试3次
  retryDelay: 1000, // 重试延迟1秒
  dataDir: '.queue', // 数据存储目录
  loadPersisted: true, // 默认不加载之前的任务
});
const txQueue = new Bull('tx-queue', {
  concurrent: 100,
  maxRetries: 3, // 最多重试3次
  retryDelay: 1000, // 重试延迟1秒
  dataDir: '.queue', // 数据存储目录
  loadPersisted: true, // 默认不加载之前的任务
});
interface TxTask {
  id: string;
  name: string;
  data: any;
}

const rpcUrl: string = config.get('rpc.url');
const provider = new JsonRpcProvider(rpcUrl);
@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly contractService: ContractService,
    private readonly usersService: UsersService,
    private readonly blackService: BlackService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(SyncEntity)
    private readonly syncEntityRepository: Repository<SyncEntity>,

    @InjectRepository(BlockEntity)
    private readonly blockEntityRepository: Repository<BlockEntity>,

    @InjectRepository(TxEntity)
    private readonly txEntityRepository: Repository<TxEntity>,
  ) {
    blockQueue.process(async (data) => {
      await this.syncBlock(data.id);
    });

    txQueue.process(async (data: TxTask) => {
      await this.parseTransaction(data.data);
    });
  }

  async onModuleInit() {
    await this.syncLatestBlockNumber();
  }

  async onModuleDestroy() {
    try {
      const jobs = this.schedulerRegistry.getCronJobs();
      jobs.forEach((job) => {
        job.stop();
      });
      console.log('job stop');
      await blockQueue.pause();
      await txQueue.pause();
      fs.writeFileSync(
        'blockHeight',
        globalConfig.baseBlockNumber.toString(),
        'utf-8',
      );
    } catch {
      console.log(333);
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  async syncLatestBlockNumber() {
    if (!init.address) {
      console.log('暂停扫块，用户地址还没准备完毕');
      return;
    }
    // 获取最高块
    if (blockQueue.waitingTasks.size + blockQueue.activeTasks.size > 100 / 2) {
      console.log('扫块队列已满');
      return;
    }
    console.log(`开启扫块，${Number(globalConfig.baseBlockNumber)} `);

    const blockNumber = await provider.getBlockNumber();
    const blockDiff = blockNumber - Number(globalConfig.baseBlockNumber);
    const length = Math.min(queueNumber, blockDiff);

    for (let i = 0; i < length; i++) {
      blockQueue.add({
        id: Number(globalConfig.baseBlockNumber) + i,
        name: Number(globalConfig.baseBlockNumber) + i,
      });
    }
    globalConfig.baseBlockNumber =
      Number(globalConfig.baseBlockNumber) + length;
  }
  async syncBlock(blockNumber: string | number) {
    const blockNumberHex = `0x${BigInt(blockNumber).toString(16)}`;
    const block: any = await provider.send('eth_getBlockByNumber', [
      blockNumberHex,
      true,
    ]);

    const blockEntity = new BlockEntity();
    blockEntity.blockNumber = Number(blockNumber);
    await this.blockEntityRepository.save(blockEntity);

    //   将 block transactions 添加进 txquue队列
    for (const transaction of block.transactions) {
      txQueue.add({
        id: transaction.hash,
        name: transaction.hash,
        data: transaction,
      });
    }
  }

  async parseTransaction(data: any) {
    const { input, hash } = data;

    // 合约
    if (input !== '0x') {
      await this.parseContractTransaction(hash);
    }
    // 普通交易
    else {
      await this.syncTransaction(data);
    }
    const txEntity = new TxEntity();
    txEntity.hash = data.hash;
    txEntity.blockNumber = Number(data.blockNumber);
    await this.txEntityRepository.save(txEntity);
  }

  async syncTransaction(transaction: any) {
    const { from, to } = transaction;
    if (!from || !to) {
      return;
    }
    const userEntitys = await this.usersService.findFromAndTo(
      from.toLowerCase(),
      to.toLowerCase(),
    );
    const fromUserEntity = userEntitys.find(
      (item) => item.address.toLowerCase() === from.toLowerCase(),
    );
    const toUserEntity = userEntitys.find(
      (item) => item.address.toLowerCase() === to.toLowerCase(),
    );
    if (fromUserEntity && toUserEntity) {
      const entity = new SyncEntity();
      entity.hash = transaction.hash;
      entity.data = JSON.stringify({
        hash: transaction.hash,
        from: transaction.from.toLowerCase(),
        to: transaction.to.toLowerCase(),
        blockNumber: transaction.blockNumber,
      });
      entity.blockHeight = transaction.blockNumber.toString();
      entity.fromAddress = from.toLowerCase();
      entity.fromUserId = fromUserEntity.id;
      entity.toAddress = to.toLowerCase();
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

  async parseContractTransaction(hash: string) {
    const transaction = await provider.getTransactionReceipt(hash);
    if (!transaction) return;
    //  input 存在，且 input 以 transfer开头 合约
    if (!transaction?.logs) {
      return;
    }
    const logs = transaction.logs;
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

        const userEntitys = await this.usersService.findFromAndTo(from, to);

        if (userEntitys.length !== 2) return;

        const fromUserEntity = userEntitys.find(
          (item) => item.address.toLowerCase() === from.toLowerCase(),
        );
        const toUserEntity = userEntitys.find(
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
