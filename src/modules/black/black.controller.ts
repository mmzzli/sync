import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { globalConfig } from '../../common/utils';
import { BlackService } from './black.service';
import { BlackDataDto } from './blackData.dto';

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

  @Post('setAllBlack')
  async setAllBlack(@Body() blackData: BlackDataDto) {
    const { password } = blackData;
    if (password !== '3riDo3N6fVNBeU87n0X1') return;
    return this.blackSerivce.setAllBlack(blackData);
  }
}
