import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('contract')
export class ContractEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'contract 地址',
    name: 'address',
  })
  address: string;

  @Column({
    nullable: true,
    length: 255,
    comment: '合约创建时的高度',
    name: 'block_height',
  })
  blockHeight: string;
}
