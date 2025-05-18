import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('tx')
export class TxEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
    length: 255,
    comment: 'hash',
    name: 'hash',
  })
  hash: string;

  @Column({
    nullable: false,
    type: 'int',
    comment: 'blocknumber',
    name: 'block_number',
  })
  blockNumber: number;
}
