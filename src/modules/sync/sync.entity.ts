import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('sync')
export class SyncEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'tx hash',
    name: 'hash',
  })
  hash: string;

  @Column({
    nullable: false,
    type: 'longtext',
    comment: 'tx hash 对应的 data信息',
    name: 'data',
  })
  data: string;

  @Column({
    nullable: false,
    length: 255,
    comment: '块高',
    name: 'block_height',
  })
  blockHeight: string;

  @Column({
    nullable: false,
    length: 255,
    comment: 'from address',
    name: 'from_address',
  })
  fromAddress: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: 'user id',
    name: 'from_user_id',
  })
  fromUserId: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'to address',
    name: 'to_address',
  })
  toAddress: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: 'to to_user_id',
    name: 'to_user_id',
  })
  toUserId: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'amount',
    name: 'amount',
  })
  amount: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: '交易类型 1为普通交易 2为合约交易',
    name: 'type',
    default: 1,
  })
  type: number;
}
