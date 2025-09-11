
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LockService } from './locks/lock.service';
import { DialerGateway } from './dialer.gateway';
import { AriClient } from 'src/utils/ari/ari-utils';
import { AMIProvider } from 'src/utils/providers/ami/ami-provider.service';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { AgentService } from 'src/agent/agent.service';
import { CustomerCrmService } from 'src/customer-crm/customer-crm.service';

interface StartArgs { slots?: number }

@Injectable()
export class DialerService {
  private readonly log = new Logger(DialerService.name);
  private agentRunning = new Map<string, { slots: number, active: number }>();
  private channelToMeta = new Map<string, { callLogId: string; role: 'customer' | 'agent'; agentId?: string; }>();

  constructor(
    @Inject('DIALER_OPTS') private opts: any,
    private readonly ari: AriClient,
    private readonly ami: AMIProvider,
    private readonly prisma: PrismaService,
    private readonly agents: AgentService,
    private readonly leads: CustomerCrmService,
    private readonly locks: LockService,
    private readonly ws: DialerGateway,
  ) {
    // Subscribe ARI events
    this.ari.onEvent(ev => this.onAriEvent(ev));
  }

  // Public API
  async startAgentDial(agentId: string, { slots }: StartArgs) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const capacity = Math.max(1, slots ?? this.opts.maxQueuePerAgent);
    this.agentRunning.set(agentId, { slots: capacity, active: 0 });
    await this.agents.markStatus(agentId, 'AVAILABLE');

    this.ws.emit('dialer:start', { agentId, slots: capacity });
    // Prime the pump
    this.replenish(agentId).catch(err => this.log.error(err));
    return { ok: true, agentId, slots: capacity };
  }

  async stopAgentDial(agentId: string, reason: string) {
    this.agentRunning.delete(agentId);
    await this.agents.markStatus(agentId, 'OFFLINE');
    this.ws.emit('dialer:stop', { agentId, reason });
    return { ok: true };
  }

  // Core logic: keep dialing until slots filled
  private async replenish(agentId: string) {
    const run = this.agentRunning.get(agentId);
    if (!run) return; // stopped

    while (run.active < run.slots) {
      // lock per-agent to avoid overlap
      const got = await this.locks.acquire(`dialer:${agentId}`, 500);
      if (!got) break;
      try {
        const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent) return;
        const lead = await this.leads.nextLead(agent.systemCompanyId);
        if (!lead) { this.log.warn('No more leads'); break; }

        const callLog = await this.prisma.callLog.create({
          data: {
            callerId: lead.phone,
            action: 'PREDICTIVE_DIAL',
            direction: 'OUTBOUND',
            status: 'WAITING',
            systemName: 'predictive',
            userId: agentId,
          } as any,
        });

        // ARI originate customer → app: dialer-app, pass callLogId & agentId hint
        await this.ari.originateToEndpoint(`PJSIP/${lead.phone}@provider`, { 'variables[CALLLOG_ID]': callLog.id, 'variables[AGENT_ID]': agentId, 'variables[ROLE]': 'customer' }, `${this.opts.callerIdName} <${lead.phone}>`);

        run.active++;
        this.ws.emit('dialer:attempt', { agentId, leadId: lead.id, callLogId: callLog.id });
      } finally { await this.locks.release(`dialer:${agentId}`); }
    }
  }

  // ARI event dispatcher
  private async onAriEvent(ev: any) {
    try {
      switch (ev.type) {
        case 'StasisStart':
          await this.onStasisStart(ev);
          break;
        case 'ChannelStateChange':
          await this.onChannelStateChange(ev);
          break;
        case 'ChannelDestroyed':
          await this.onChannelDestroyed(ev);
          break;
      }
    } catch (e) { this.log.error('onAriEvent error', e as any); }
  }

  private async onStasisStart(ev: any) {
    const ch = ev.channel;
    const vars = ch && ch.channelvars ? ch.channelvars : {};
    const callLogId = vars.CALLLOG_ID || ev.args?.[0];
    const role = (vars.ROLE as 'customer' | 'agent') || 'customer';
    const agentId = vars.AGENT_ID;

    if (callLogId) {
      this.channelToMeta.set(ch.id, { callLogId, role, agentId });
      await this.prisma.callLog.update({ where: { id: callLogId }, data: { status: 'RINGING' as any } });
    }

    // Put customers into holding bridge (music) until agent ready
    if (role === 'customer') {
      const holdBridge = await this.ari.createBridge('holding');
      await this.ari.addChannelsToBridge(holdBridge, [ch.id]);
      this.ws.emit('dialer:ringing', { callLogId, channelId: ch.id });
    }
  }

  private async onChannelStateChange(ev: any) {
    const ch = ev.channel;
    if (!ch) return;

    // State Up means answered. If customer answered, we need a free agent.
    if (ev.channel?.state === 'Up') {
      const meta = this.channelToMeta.get(ch.id);
      if (!meta) return;

      if (meta.role === 'customer') {
        // Find a free agent
        const free = await this.agents.findFreeAgent();
        if (!free) {
          // No agent free, drop gently
          await this.ari.hangupChannel(ch.id);
          await this.prisma.callLog.update({ where: { id: meta.callLogId }, data: { status: 'NO_ANSWER' as any } });
          this.ws.emit('dialer:dropped', { callLogId: meta.callLogId, reason: 'no-agent' });
          return;
        }

        // Ring agent via ARI
        await this.agents.markStatus(free.id, 'RINGING');
        const agentEndpoint = await this.agents.getAgentEndpoint(free.id);
        await this.ari.ringAndAnswerAgent(agentEndpoint!, { 'variables[CALLLOG_ID]': meta.callLogId, 'variables[ROLE]': 'agent', 'variables[AGENT_ID]': free.id }, this.opts.ringTimeoutSec);
        // When agent answers (another Channel becomes Up with ROLE=agent), we'll bridge in that event.
      } else if (meta.role === 'agent') {
        // Find the waiting customer by same CALLLOG_ID
        const customerChannelId = [...this.channelToMeta.entries()].find(([, m]) => m.callLogId === meta.callLogId && m.role === 'customer')?.[0];
        if (!customerChannelId) return;
        const bridgeId = await this.ari.createBridge('mixing');
        await this.ari.addChannelsToBridge(bridgeId, [customerChannelId, ch.id]);
        await this.prisma.callLog.update({ where: { id: meta.callLogId }, data: { status: 'CONNECTED' as any, agentId: meta.agentId } });
        await this.agents.markStatus(meta.agentId!, 'BUSY');
        this.ws.emit('dialer:bridged', { callLogId: meta.callLogId, agentId: meta.agentId });
      }
    }
  }

  private async onChannelDestroyed(ev: any) {
    const chId = ev.channel?.id;
    if (!chId) return;
    const meta = this.channelToMeta.get(chId);
    if (!meta) return;

    // Update call log if still in ringing
    const cl = await this.prisma.callLog.findUnique({ where: { id: meta.callLogId } });
    if (cl && (cl.status as any) === 'RINGING') {
      await this.prisma.callLog.update({ where: { id: cl.id }, data: { status: 'NO_ANSWER' as any } });
    }

    // Free slot when customer leg ends
    if (meta.role === 'customer' && meta.agentId) {
      const run = this.agentRunning.get(meta.agentId);
      if (run) {
        run.active = Math.max(0, run.active - 1);
        this.replenish(meta.agentId).catch(() => { });
      }
    }

    // If agent leg ends, set AVAILABLE to allow next bridge
    if (meta.role === 'agent' && meta.agentId) {
      await this.agents.markStatus(meta.agentId, 'AVAILABLE');
      const run = this.agentRunning.get(meta.agentId);
      if (run) this.replenish(meta.agentId).catch(() => { });
    }

    this.channelToMeta.delete(chId);
  }
}



