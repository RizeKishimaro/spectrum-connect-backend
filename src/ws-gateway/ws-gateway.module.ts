import { Module } from '@nestjs/common';
import { WsGatewayService } from './ws-gateway.service';
import { WsGatewayGateway } from './ws-gateway.gateway';

@Module({
  providers: [WsGatewayGateway, WsGatewayService],
})
export class WsGatewayModule {}
