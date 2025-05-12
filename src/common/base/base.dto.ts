import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BaseDto {
  @ApiProperty({
    description: '是否是无效数据',
    example: undefined,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dr: boolean | undefined;
}
