import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { UserEntity } from './modules/users/user.entity';
import { UsersService } from './modules/users/users.service';
import { init } from './common/utils';
import { CronJob } from 'cron';

const first = 1000;
let skip = 0;
let isProcessing = false; // 添加处理锁

// curl -s -L 'https://gateway.thegraph.com/api/subgraphs/id/A6resAWaXr7koffpoqWmqfbqtg4QLtVBN2otxNC5dfk' -H 'Content-Type: application/json' -H 'Authorization: Bearer 15e21550a1f515dd302fe54bf5635a40' -H 'Cookie: __cf_bm=nA2eDVKAntYDJ44SA2wM9Mt2yX5b3UsZEs0qyelo0E4-1747050413-1.0.1.1-ykLzdqz_2hVwMkC.d6osBvOyg907stUkDSbdPQyMD3NGja9E5DK.VJhBbkIFFZXMDB5oQkTN4nah.Mse9FN4AYB_XIXGkJGoh6pJ618WJTw' -d '{"query":"{\n  users(skip:0,first: 10,orderDirection: asc){\n    id\n  }\n}","variables":{}}'
const config = {
  method: 'post',
  url: 'https://gateway.thegraph.com/api/subgraphs/id/A6resAWaXr7koffpoqWmqfbqtg4QLtVBN2otxNC5dfk',
  headers: {
    Authorization: 'Bearer 15e21550a1f515dd302fe54bf5635a40',
    Cookie:
      '__cf_bm=nA2eDVKAntYDJ44SA2wM9Mt2yX5b3UsZEs0qyelo0E4-1747050413-1.0.1.1-ykLzdqz_2hVwMkC.d6osBvOyg907stUkDSbdPQyMD3NGja9E5DK.VJhBbkIFFZXMDB5oQkTN4nah.Mse9FN4AYB_XIXGkJGoh6pJ618WJTw',
    'Content-Type': 'application/json',
  },
};

@Injectable()
export class AppService {
  constructor(private readonly usersService: UsersService) {
    // 服务启动时，从数据库获取最新的 skip 值
    this.initSkip();
  }
  // 服务启动时获取最大的 MAX地址
  private async initSkip() {
    try {
      // 获取数据库中最大的 addressId
      const maxId = await this.usersService.getMaxAddressId();
      console.log(maxId);
      skip = Number(maxId ? maxId : 0);
      console.log(`Initialized skip to ${skip}`);

      await this.getUsers(() => {
        if (init.address === false) {
          init.address = true;
          // 开启定时任务
          const job = new CronJob(CronExpression.EVERY_5_SECONDS, () => {
            this.userJob();
          });
          job.start();
        }
      }, true);
    } catch (error) {
      console.error('Error initializing skip:', error);
      skip = 0;
    }
  }

  // 每隔 30分拉一次地址
  // @Cron(CronExpression.EVERY_30_MINUTES)
  async userJob() {
    // 如果正在处理，直接返回
    if (isProcessing) {
      console.log('Previous request still processing, skipping...');
      return 'Hello World!';
    }
    try {
      isProcessing = true;
      await this.getUsers(null);
    } finally {
      isProcessing = false;
    }
  }

  async getUsers(
    callback: (() => void) | null | undefined,
    next: boolean = false,
  ) {
    try {
      const query = {
        query: `{
          users(skip:${skip},first: ${first},orderDirection: asc){
            id
          }
        }`,
        variables: {},
      };

      const res = await axios({
        ...config,
        data: query,
      });

      if (res.data?.errors?.length) {
        throw new Error(res.data.errors[0].message);
      }

      const users = res.data.data.users;
      console.log(users.length, 'length-----------');

      // 如果没有数据了，说明当前没有新数据
      if (!users || users.length === 0) {
        if (typeof callback === 'function') {
          callback();
        }

        console.log('No new users to process');
        return;
      }

      const userEntities = users.map((item, index: number) => {
        const entity = new UserEntity();
        entity.addressId = String(Number(skip) + index + 1);
        entity.address = item.id;
        return entity;
      });

      await this.usersService.batchSave(userEntities);
      console.log(`Processed ${users.length} users, current skip: ${skip}`);

      // 更新 skip 值，准备获取下一页
      skip += users.length;
      console.log(skip);
      if (next) {
        await this.getUsers(callback, next);
      }
    } catch (error) {
      console.error('Error processing users:', error);
    }
  }
}
