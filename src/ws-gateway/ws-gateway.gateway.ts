
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { Agent as PrismaAgent } from '@prisma/client'; // rename to avoid confusion

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

  // in-memory state
  private agents = new Map<string, AgentStatus>();          // agentId -> AgentStatus
  private socketToAgent = new Map<string, string>();         // socketId -> agentId
  private managers = new Map<string, Set<string>>();         // room -> socketIds (optional tracking)

  // ---------- utils ----------
  private getCompanyRoom = (companyId: number) => `managers:${String(companyId)}`;
  private toPlain<T>(v: T): T {
    // ensure serializable payloads (Dates -> ISO strings, drop prototypes)
    return JSON.parse(JSON.stringify(v));
  }

  // ---------- lifecycle ----------
  onModuleInit() {
    // periodic init broadcast per company
    setInterval(() => {
      const grouped = new Map<number, AgentStatus[]>();
      for (const a of this.agents.values()) {
        const list = grouped.get(a.systemCompanyId) ?? [];
        list.push(a);
        grouped.set(a.systemCompanyId, list);
      }
      for (const [companyId, agentList] of grouped.entries()) {
        const room = this.getCompanyRoom(companyId);
        this.server.to(room).emit('agent:init', this.toPlain(agentList));
      }
    }, 10_000);
  }

  afterInit(server: Server) {
    console.log('✨ WsGateway initialized!');
    // If you run multiple instances, enable Redis adapter here.
    // Example:
    // import { createClient } from 'redis';
    // import { createAdapter } from '@socket.io/redis-adapter';
    // const pub = createClient({ url: process.env.REDIS_URL });
    // const sub = pub.duplicate();
    // await pub.connect(); await sub.connect();
    // server.adapter(createAdapter(pub, sub));
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // manager tracking (optional)
    for (const set of this.managers.values()) set.delete(client.id);

    const agentId = this.socketToAgent.get(client.id);
    if (!agentId) {
      console.log(`Client ${client.id} disconnected with no agentId.`);
      return;
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      agent.lastActivity = new Date();
      const room = this.getCompanyRoom(agent.systemCompanyId);
      this.server.to(room).emit('agent:update', this.toPlain(agent));
    }

    this.agents.delete(agentId);
    this.socketToAgent.delete(client.id);
    console.log(`💔 Agent ${agentId} disconnected and removed.`);
  }

  // ---------- manager flow ----------
  @SubscribeMessage('manager:connect')
  handleManagerConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const managerData =
      typeof data?.user === 'string' ? JSON.parse(data.user) : data?.user;

    if (!managerData?.systemCompanyId) {
      console.warn(`[manager:connect] missing systemCompanyId from ${client.id}`);
      client.emit('error', { message: 'Missing systemCompanyId' });
      return;
    }

    const room = this.getCompanyRoom(managerData.systemCompanyId);
    client.join(room);

    // optional local tracking
    const set = this.managers.get(room) ?? new Set<string>();
    set.add(client.id);
    this.managers.set(room, set);

    console.log(`🛡️ Manager ${managerData?.name ?? client.id} joined room: ${room}`);

    // agents for this company
    const agentsForCompany = Array.from(this.agents.values())
      .filter(a => a.systemCompanyId === managerData.systemCompanyId);

    // send current snapshot (direct to the caller)
    client.emit('agent:init', this.toPlain(agentsForCompany));
  }

  // ---------- agent flow ----------
  @SubscribeMessage('agent:status')
  handleAgentStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string; status: string; user: PrismaAgent }
  ) {
    if (!data?.agentId || !data?.user?.systemCompanyId) {
      console.warn('[agent:status] missing agentId/systemCompanyId');
      return;
    }

    console.log(`[SOCKET] Agent ${data.agentId} is now ${data.status}`);
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

    const updatedAgent = this.agents.get(data.agentId)!;
    const room = this.getCompanyRoom(data.user.systemCompanyId);
    console.log(`emitting agent:update to ${room}`);

    this.server.to(room).emit('agent:update', this.toPlain(updatedAgent));
  }
}

