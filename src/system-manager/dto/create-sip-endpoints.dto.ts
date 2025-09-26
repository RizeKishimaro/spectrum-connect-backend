
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class CreateSipEndpointDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  ipHost?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sipTech?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  didIds?: string[];
}

