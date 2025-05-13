import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractEntity } from './contract.entity';
import { Repository } from 'typeorm';
import axios from 'axios';
const { apikey: bscApiKey } = { apikey: 'VBABEJWKPJ9HRNX18WXWZHDUN2C22ENUYD' };

@Injectable()
export class ContractService implements OnModuleInit {
  constructor(
    @InjectRepository(ContractEntity)
    private readonly contractRepository: Repository<ContractEntity>,
  ) {}

  async onModuleInit() {
    await this.getContractHeight();
  }

  async getContractHeight() {
    const contractAddressArr = await this.contractRepository.find();
    let changed = false;
    if (bscApiKey && contractAddressArr) {
      for (const contractItem of contractAddressArr) {
        if (!contractItem.blockHeight) {
          const res: any = await axios.get(
            `https://api.bscscan.com/api?module=contract&action=getcontractcreation&contractaddresses=${contractItem.address}&apikey=${bscApiKey}`,
          );
          const { blockNumber } = res.data.result[0];
          changed = true;
          contractItem.blockHeight = blockNumber;
        }
      }
    }
    if (changed) {
      await this.contractRepository.save(contractAddressArr);
    }
  }

  async getMinBlockNumber(): Promise<any> {
    const result = await this.contractRepository
      .createQueryBuilder('contract')
      .select('MIN(CAST(contract.block_height AS SIGNED))', 'minBlockNumber')
      .getRawOne();
    return result?.minBlockNumber || '0';
  }

  async getAllContract() {
    return await this.contractRepository.find();
  }
}
