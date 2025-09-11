import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';


@WebSocketGateway({ cors: { origin: '*' } })
export class DialerGateway {
  @WebSocketServer() io!: Server;


  emit(event: string, payload: unknown) { this.io.emit(event, payload); }
}
