import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'address 地址',
    name: 'address',
  })
  address: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: 'address 地址',
    name: 'address_id',
  })
  addressId: string;
}
