// src/sip-endpoints/dto/update-sip-endpoint.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSipEndpointDto } from './create-sip-endpoints.dto';

export class UpdateSipEndpointDto extends PartialType(CreateSipEndpointDto) { }

