import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { WsGatewayService } from './ws-gateway.service';
import { Server, Socket } from 'socket.io';
import type { Agent, User } from '@prisma/client';
import { OnModuleInit } from '@nestjs/common';

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
  user?: Agent;
};
@WebSocketGateway({
  namespace: "socket.io",
  cors: {
    origin: ['http://localhost:3001', "http://localhost:5173"],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WsGatewayGateway implements OnModuleInit {
  constructor(private readonly wsGatewayService: WsGatewayService) { }

  @WebSocketServer()
  server: Server;

  private agents: Map<string, AgentStatus> = new Map();
  private socketToAgent = new Map<string, string>()
  private manager = new Map<string, string>
  onModuleInit() {
    setInterval(() => {
      const agentsArray = Array.from(this.agents.values());

      const grouped = new Map<number, AgentStatus[]>(); // systemCompanyId => agents

      for (const agent of agentsArray) {
        const list = grouped.get(agent.systemCompanyId) ?? [];
        list.push(agent);
        grouped.set(agent.systemCompanyId, list);
      }

      for (const [companyId, agentList] of grouped.entries()) {
        this.server.to(`managers:${companyId}`).emit("agent:init", agentList);
      }
    }, 10000);
  }

  afterInit(server: Server) {
    console.log('✨ AgentGateway initialized! ✨');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    console.log(this.agents.values())
    client.emit('agent:init', Array.from(this.agents.values()));
  }



  handleDisconnect(client: Socket) {
    const agentId = this.socketToAgent.get(client.id);

    if (agentId) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = "offline";
        agent.lastActivity = new Date();
        this.server.emit("agent:update", agent);
      }

      this.agents.delete(agentId);
      this.socketToAgent.delete(client.id);
      console.log(`💔 Agent ${agentId} disconnected and removed.`);
    } else {
      console.log(`Client ${client.id} disconnected with no agentId.`);
    }
  }


  @SubscribeMessage("manager:connect")
  handleManagerConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { user: User }
  ) {
    const room = `managers:${data.user.systemCompanyId}`;
    client.join(room);
    console.log(`🛡️ Manager ${data.user.name} joined room: ${room}`);

    // Emit current agents of their company only
    const agentsForCompany = Array.from(this.agents.values()).filter(
      (agent) => agent.systemCompanyId === data.user.systemCompanyId
    );
    client.emit("agent:init", agentsForCompany);
  }




  @SubscribeMessage('agent:status')
  handleAgentStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string; status: string; user: Agent }
  ) {
    console.log(`[SOCKET] Agent ${data.agentId} is now ${data.status}`);

    this.socketToAgent.set(client.id, data.agentId); // ✨ track who sent this

    const existingAgent = this.agents.get(data.agentId);

    if (existingAgent) {
      existingAgent.status = data.status;
      existingAgent.lastActivity = new Date();
      this.agents.set(data.agentId, existingAgent);
    } else {
      this.agents.set(data.agentId, {
        id: data.agentId,
        name: data.user.name,
        status: data.status,
        extension: data.user.phoneNumber,
        systemCompanyId: data.user.systemCompanyId,
        department: "Support",
        lastActivity: new Date(),
        totalCallsToday: 0,
        avgCallDuration: 0,
      });
    }

    const updatedAgent = this.agents.get(data.agentId);
    this.server.emit('agent:update', updatedAgent);
  }

}
