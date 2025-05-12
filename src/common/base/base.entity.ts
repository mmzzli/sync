import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({
    name: 'created_at',
    nullable: true,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    nullable: true,
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt: Date;

  @Column({
    type: 'int',
    default: 1,
    comment: '0-100,越大越靠前',
  })
  sort: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '0|1  1有效或显示（默认）',
  })
  status: number;
}
