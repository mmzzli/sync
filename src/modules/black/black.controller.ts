import { Controller, Get, Query } from '@nestjs/common';
import { globalConfig } from '../../common/utils';
import { BlackService } from './black.service';

@Controller('black')
export class BlackController {
  //   查询当前块高

  constructor(private readonly blackSerivce: BlackService) {}

  @Get('info')
  async getInfo() {
    const list = await this.blackSerivce.getList();
    const blockNumber = globalConfig.baseBlockNumber;
    return {
      blockNumber,
      list,
    };
  }

  @Get('search')
  async search(@Query('address') address: string) {
    if (!address?.trim()) {
      return this.blackSerivce.getList();
    }
    const res = await this.blackSerivce.searchBlack(address);
    if (res) {
      return [res];
    }
    return [];
  }
}
