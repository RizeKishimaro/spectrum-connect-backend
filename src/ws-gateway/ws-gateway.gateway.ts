
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { Agent as PrismaAgent } from '@prisma/client';

type AgentStatus = {
  id: string;
  name: string;
  status: string;
  extension?: string;
  department?: string;
  lastActivity?: Date;
  totalCallsToday?: number;
  avgCallDuration?: number;
  currentCall?: any;
  systemCompanyId: number;
  user?: PrismaAgent;
};

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

const ADMIN_ROOM = 'managers:__admins__';
const companyRoom = (companyId: number) => `managers:${String(companyId)}`;

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WsGatewayGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private agents = new Map<string, AgentStatus>();   // agentId -> AgentStatus
  private socketToAgent = new Map<string, string>();  // socketId -> agentId

  private toPlain<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
  }

  onModuleInit() {
    setInterval(() => {
      // group per company for company users
      const grouped = new Map<number, AgentStatus[]>();
      for (const a of this.agents.values()) {
        const list = grouped.get(a.systemCompanyId) ?? [];
        list.push(a);
        grouped.set(a.systemCompanyId, list);
      }
      for (const [companyId, list] of grouped.entries()) {
        this.server.to(companyRoom(companyId)).emit('agent:init', this.toPlain(list));
      }

      // admins get the full list
      const allAgents = Array.from(this.agents.values());
      this.server.to(ADMIN_ROOM).emit('agent:init', this.toPlain(allAgents));
    }, 10_000);
  }

  afterInit() {
    console.log('✨ WsGateway initialized (roles aware) ✨');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const agentId = this.socketToAgent.get(client.id);
    if (!agentId) {
      console.log(`Client ${client.id} disconnected (no agentId)`);
      return;
    }
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      agent.lastActivity = new Date();

      // notify company users
      this.server.to(companyRoom(agent.systemCompanyId)).emit('agent:update', this.toPlain(agent));
      // notify admins globally
      this.server.to(ADMIN_ROOM).emit('agent:update', this.toPlain(agent));
    }
    this.agents.delete(agentId);
    this.socketToAgent.delete(client.id);
    console.log(`💔 Agent ${agentId} disconnected and removed.`);
  }

  // ====== manager/admin connects ======
  @SubscribeMessage('manager:connect')
  handleManagerConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const managerData = typeof data?.user === 'string' ? JSON.parse(data.user) : data?.user;
    const role = managerData?.roles; // expect 'admin' or something else

    if (role === 'admin') {
      // admins join the global room and see EVERYONE
      client.join(ADMIN_ROOM);
      console.log(`🛡️ Admin ${managerData?.name ?? client.id} joined room: ${ADMIN_ROOM}`);

      const allAgents = Array.from(this.agents.values());
      client.emit('agent:init', this.toPlain(allAgents));
      return;
    }

    // company user flow
    if (!managerData?.systemCompanyId) {
      console.warn(`[manager:connect] non-admin missing systemCompanyId from ${client.id}`);
      client.emit('error', { message: 'Missing systemCompanyId' });
      return;
    }

    const room = companyRoom(managerData.systemCompanyId);
    client.join(room);
    console.log(`👔 Manager ${managerData?.name ?? client.id} joined room: ${room}`);

    const agentsForCompany = Array.from(this.agents.values())
      .filter(a => a.systemCompanyId === managerData.systemCompanyId);
    client.emit('agent:init', this.toPlain(agentsForCompany));
  }

  // ====== agent status updates ======
  @SubscribeMessage('agent:status')
  handleAgentStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string; status: string; user: PrismaAgent }
  ) {
    if (!data?.agentId || !data?.user?.systemCompanyId) {
      console.warn('[agent:status] missing agentId/systemCompanyId');
      return;
    }

    console.log(`[SOCKET] Agent ${data.agentId} -> ${data.status}`);
    this.socketToAgent.set(client.id, data.agentId);

    const existing = this.agents.get(data.agentId);
    if (existing) {
      existing.status = data.status;
      existing.lastActivity = new Date();
    } else {
      this.agents.set(data.agentId, {
        id: data.agentId,
        name: data.user.name,
        status: data.status,
        extension: data.user.phoneNumber,
        systemCompanyId: data.user.systemCompanyId,
        department: 'Support',
        lastActivity: new Date(),
        totalCallsToday: 0,
        avgCallDuration: 0,
      });
    }

    const updated = this.agents.get(data.agentId)!;
    const room = companyRoom(data.user.systemCompanyId);
    console.log(`emitting agent:update -> ${room} + ${ADMIN_ROOM}`);

    this.server.to(room).emit('agent:update', this.toPlain(updated));
    this.server.to(ADMIN_ROOM).emit('agent:update', this.toPlain(updated));
  }
  emit(event: string, payload: any) {
    const room = companyRoom(payload.systemCompanyId);
    this.server.to(room).emit(event, payload);
  }
}

