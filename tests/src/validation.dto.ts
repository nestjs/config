import { IsNumber, IsString, Max, Min } from "class-validator";

export class ValidationClassDTO {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  DATABASE_NAME!: string;
}