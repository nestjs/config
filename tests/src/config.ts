import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class Config {
  @IsNotEmpty()
  @Expose({ name: 'PORT' })
  port: string | undefined;

  @IsNumber()
  @Type(() => Number)
  @Expose({ name: 'TIMEOUT' })
  timeout: string | undefined;
}
