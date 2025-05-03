import { PartialType } from '@nestjs/swagger';
import { CreateRtpAddressDto } from './create-rtp-address.dto';

export class UpdateRtpAddressDto extends PartialType(CreateRtpAddressDto) { }

