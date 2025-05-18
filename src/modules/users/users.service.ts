import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  //  批量保存
  async batchSave(users: UserEntity[]) {
    await this.userRepository.save(users);
  }

  // 获取最大的 addressId
  async getMaxAddressId(): Promise<number> {
    const result: any = await this.userRepository
      .createQueryBuilder('user')
      .select('MAX(CAST(user.addressId AS SIGNED))', 'maxId')
      .getRawOne();

    return Number(result?.maxId) || 0;
  }

  async changeAddress(id: number, address: string) {
    const entity = await this.userRepository.findOne({
      where: { id, address },
    });
    if (!entity) {
      console.log(`id:${id}  address:${address}不存在`);
      return;
    }
    entity.status = 0;
    await this.userRepository.save(entity);
  }

  async findFromAndTo(from: string, to: string) {
    return await this.userRepository.find({
      where: {
        address: In([from, to]),
      },
    });
  }
}
