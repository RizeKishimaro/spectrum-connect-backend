// sip.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway(9090, {
  cors: { origin: '*' },
})
export class SipGateway {
  @WebSocketServer()
  server: Server;

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}

