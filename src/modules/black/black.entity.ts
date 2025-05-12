import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('black')
export class BlackEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    nullable: false,
    type: 'int',
    comment: 'user表中对应的user address id',
    name: 'user_id',
  })
  userId: string;

  @Column({
    unique: true,
    nullable: false,
    type: 'varchar',
    comment: '拉黑的地址',
    name: 'address',
  })
  address: string;

  @Column({
    nullable: false,
    type: 'boolean',
    comment: '是否拉黑',
    name: 'blacked',
    default: false,
  })
  blacked: boolean;

  @Column({
    nullable: true,
    length: 255,
    comment: 'hash',
    name: 'hash',
  })
  hash: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: 'sync 表的主键 ID',
    name: 'sync_id',
  })
  syncId: number;
}
