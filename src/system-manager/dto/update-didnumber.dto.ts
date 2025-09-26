import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateDIDNumberDTO {
  @ApiProperty()
  @IsString()
  didNumber: string
}
