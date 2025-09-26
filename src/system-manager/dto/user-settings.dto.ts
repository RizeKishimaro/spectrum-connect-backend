
import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString } from "class-validator"

export class UserSettingsDto {
  @Type(() => Number)
  @IsInt()
  blastCount: number

  @Type(() => Number)
  @IsInt()
  callLimit: number

  @IsString()
  sipProviderId: string

  @IsString()
  ivrId: string

  @IsString()
  @IsOptional()
  didNumberId?: string
}

