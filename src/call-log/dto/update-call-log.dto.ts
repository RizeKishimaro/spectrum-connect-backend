// src/call-log/dto/update-call-log.dto.ts
import { PartialType } from '@nestjs/swagger'
import { CreateCallLogDto } from './create-call-log.dto'

export class UpdateCallLogDto extends PartialType(CreateCallLogDto) { }

