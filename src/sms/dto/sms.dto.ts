// sms.dto.ts
import { IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator'

export class SendSmsDto {
  @IsNotEmpty()
  @IsString()
  message: string

  @IsNotEmpty()
  @IsString({ each: true })
  numbers: string[] // multiple numbers supported

  @IsNotEmpty()
  @IsString()
  route: string

  @IsNotEmpty()
  @IsString()
  sender: string
}

