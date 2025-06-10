import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BlackDataDto {
  @IsOptional()
  @IsString({ message: '起始 ID' })
  startId: string;

  @IsOptional()
  @IsString({ message: '结束 ID' })
  endId: string;

  @IsNotEmpty()
  @IsString({ message: '密码必须是字符串' })
  password: string;
}
