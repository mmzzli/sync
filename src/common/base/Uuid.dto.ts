import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UuidDto {
  @ApiProperty({ description: 'uuid' })
  @IsUUID()
  readonly uuid: string;
}
