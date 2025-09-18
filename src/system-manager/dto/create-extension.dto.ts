// src/extensions/dto/create-extension.dto.ts
import { IsString, MinLength } from 'class-validator';

export class CreateExtensionDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

