
import { Agi } from 'ts-agi';
import { CallService } from 'src/call/call.service';
import { AgentService } from 'src/agent/agent.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';
import { PrismaService } from '../prisma/prisma.service';
import { Agent } from "@prisma/client";


export interface IVRNode {
  id: string;
  name: string;
  action?: 'Playback' | 'PlayWithDTMF' | 'transfer' | string;
  dtmfKey?: string;
  parameter?: (string | { option: string[] })[];
  audioFile?: string;
  insertDatabase?: boolean;
  children?: IVRNode[];
}


export function createAgiServer(
  callService: CallService,
  agentService: AgentService,
  rootIVR: IVRNode,
  parkedCallService: ParkedCallService,
  prismaService: PrismaService
) {
  const agi = new Agi();

  async function handleIVRNode(ctx: any, node: IVRNode) {
    const did = ctx.variables['dnid']
    const company = await prismaService.sIPProvider.findFirst({
    })
    switch (node.action) {
      case 'Playback':
        if (node.audioFile) {
          await ctx.streamFile(node.audioFile);
        }
        for (const child of node.children || []) {
          await handleIVRNode(ctx, child);
        }
        break;

      case 'PlayWithDTMF':
        if (node.audioFile) {
          const result = await ctx.getData(node.audioFile, 5000, 1);
          const pressed = result?.value;
          const nextNode = node.children?.find(c => c.dtmfKey === pressed);
          if (nextNode) {
            await handleIVRNode(ctx, nextNode);
          } else {
            await ctx.streamFile('invalid');
          }
        }
        break;

      case 'transfer':
        const availableAgents = await agentService.getAvailableAgent();
        if (availableAgents && availableAgents.length > 0) {
          const targetAgent: Agent = availableAgents[0];
          await ctx.exec('Dial', `PJSIP/${targetAgent.sipUname}`);
        } else {
          const channel = ctx.variables['channel'] || ctx.variables['agi_channel']
          await parkedCallService.createParkedCall({
            DIDNumber: ctx.variables['dnid'],
            sipChannel: channel,
          });
          console.log("| parking | ");

          await ctx.exec('MusicOnHold', 'default');
          await ctx.exec('Park');


        }
        break;
    }
  }

  agi.use(async (ctx, next) => {
    const callerId = ctx.variables['callerid'] || 'unknown';
    console.log(`📞💫 AGI Call from ${callerId}`);

    const session = await callService.logCall(callerId, 'incoming-call');
    await ctx.answer();

    // 💖 Handle IVR Logic here
    await handleIVRNode(ctx, rootIVR);

    await callService.updateCallStatus(session.id, 'CONNECTED');
    await ctx.hangup();

    await next();
  });

  agi.listen(4573, () => {
    console.log('🌸 AGI Server running on port 4573 uwu~ ✨');
  });
}

