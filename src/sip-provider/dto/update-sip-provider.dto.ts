import { PartialType } from '@nestjs/swagger';
import { CreateSIPProviderDto } from './create-sip-provider.dto';

export class UpdateSIPProviderDto extends PartialType(CreateSIPProviderDto) { }

