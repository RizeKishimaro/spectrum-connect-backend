
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Client, Channel } from 'ari-client';
import { ARI_CLIENT } from 'src/utils/ari/ari.module';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { LockService } from './locks/lock.service';
import { CustomerCrmService } from 'src/customer-crm/customer-crm.service';
import { AgentService } from 'src/agent/agent.service';
import { AMIProvider } from 'src/utils/providers/ami/ami-provider.service';
import { $Enums } from '@prisma/client';
import { WsGatewayGateway } from 'src/ws-gateway/ws-gateway.gateway';

type Meta = { callLogId: string; role: 'customer' | 'agent'; agentId?: string | null };

type PendingTransfer = {
  digits: string[];
  agentChannelId: string;
  customerChannelId: string;
};

@Injectable()
export class DialerService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(DialerService.name);

  // state (plain Records)
  private agentRunning: Record<string, { slots: number; active: number }> = {};
  private channelToMeta: Record<string, Meta> = {};
  private onHoldTimers: Record<string, NodeJS.Timeout> = {};
  private holdQueue: Record<string, string> = {}; // callLogId -> customerChannelId
  private holdTickTimer?: NodeJS.Timeout;

  // transfers
  private pendingTransfers = new Map<string, PendingTransfer>();
  private lastDtmf: Record<string, string | undefined> = {}; // dedupe

  constructor(
    @Inject(ARI_CLIENT) private readonly ari: Client,
    private readonly ami: AMIProvider,
    private readonly prisma: PrismaService,
    private readonly agents: AgentService,
    private readonly leads: CustomerCrmService,
    private readonly locks: LockService,
    private readonly ws: WsGatewayGateway,
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('DialerService initialized 💕');

    this.ari.on('StasisStart', (ev, ch: Channel) =>
      this.onStasisStart(ev, ch).catch((e) => this.logger.error(e)),
    );
    this.ari.on('ChannelStateChange', (ev, ch: Channel) =>
      this.onChannelStateChange(ev, ch).catch((e) => this.logger.error(e)),
    );
    this.ari.on('ChannelDestroyed', (ev, ch: Channel) =>
      this.onChannelDestroyed(ev, ch).catch((e) => this.logger.error(e)),
    );
    this.ari.on('ChannelDtmfReceived', (ev, ch: Channel) =>
      this.onDtmfReceived(ev, ch).catch((e) => this.logger.error(e)),
    );

    // start a tiny scheduler to re-attempt pairing held customers with agents
    this.startHoldTicker();
  }

  // ===== Public controls =====================================================


  async startAgentDial(agentId: string, dto: { slots?: number }) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');
    const { slots = 1 } = dto;

    // Track how many concurrent calls this agent can handle
    this.agentRunning[agentId] = { slots, active: 0 };

    await this.agents.markStatus(agentId, 'AVAILABLE');

    this.ws.emit('dialer:start', { agentId, name: agent.name, systemCompanyId: agent.systemCompanyId, slots });

    await this.blastDial(agent.systemCompanyId);
  }


  async stopAgentDial(agentId: string, reason = 'stopped') {
    delete this.agentRunning[agentId];
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    // await this.agents.markStatus(agentId, 'OFFLINE');
    if (!agent) return;
    this.ws.emit('dialer:stop', { agentId, name: agent.name, systemCompanyId: agent.systemCompanyId, reason });
  }

  // ===== Dialer core =========================================================

  private async replenish(agentId: string) {
    const run = this.agentRunning[agentId];
    if (!run) return;

    while (run.active < run.slots) {
      const got = await this.locks.acquire(`dialer:${agentId}`, 500);
      if (!got) break;

      try {
        const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, include: { systemCompany: true } });
        if (!agent) break;

        const lead = await this.leads.nextLead(agent.systemCompanyId);
        if (!lead) break;

        const callLog = await this.prisma.callLog.create({
          data: {
            callerId: lead.phone,
            action: 'PREDICTIVE_DIAL',
            direction: 'OUTBOUND',
            status: 'WAITING',
            systemName: agent.systemCompany.name,
            userId: agentId,
          },
        });

        const channel = this.ari.Channel();
        channel.originate(
          {
            endpoint: `PJSIP/${lead.phone}`,
            app: process.env.ARI_APP,
            variables: {
              CALLLOG_ID: callLog.id,
              ROLE: 'customer',
            },
          },
          (err) => {
            if (err) this.logger.error('Originate failed', err.stack);
          },
        );

        run.active++;
        this.ws.emit('dialer:attempt', {
          agentId,
          leadId: lead.id,
          name: agent.name,
          systemCompanyId: agent.systemCompanyId,
          callLogId: callLog.id,
        });
      } finally {
        await this.locks.release(`dialer:${agentId}`);
      }
    }
  }

  // ===== Helpers =============================================================

  private async safeStopMoh(ch: Channel) {
    try {
      await ch.stopMoh();
    } catch (e: any) {
      if (!`${e?.message || e}`.includes('not in MOH')) {
        this.logger.warn(`stopMoh warn on ${ch.id}: ${e?.message || e}`);
      }
    }
  }

  private async safeHangup(ch: Channel) {
    try {
      await ch.hangup();
    } catch (err: any) {
      if (err?.message?.includes('Channel not found')) {
        this.logger.warn(`Channel ${ch.id} already gone, skipping hangup`);
      } else {
        this.logger.error(`Error hanging up channel ${ch.id}`, err);
      }
    }
  }

  private setHoldTimeout(channelId: string, callLogId: string, ms = 45_000) {
    this.clearHoldTimeout(channelId);
    this.onHoldTimers[channelId] = setTimeout(async () => {
      const meta = this.channelToMeta[channelId];
      if (!meta || meta.role !== 'customer') return;
      this.logger.warn(`⏳ On-hold timeout for channel ${channelId}`);
      const callLog = await this.prisma.callLog.update({
        where: { id: callLogId },
        data: { status: $Enums.CallStatus.NO_ANSWER },
        include: { agent: true }
      });
      this.ws.emit('dialer:dropped', { callLogId, systemCompanyId: callLog.agent?.systemCompanyId, reason: 'timeout-no-agent' });

      // hangup customer nicely
      try {
        const ch = this.ari.Channel(channelId);
        await this.safeStopMoh(ch);
        await this.safeHangup(ch);
      } catch { }
      delete this.holdQueue[callLogId];
    }, ms);
  }

  private clearHoldTimeout(channelId: string) {
    const t = this.onHoldTimers[channelId];
    if (t) {
      clearTimeout(t);
      delete this.onHoldTimers[channelId];
    }
  }

  private startHoldTicker() {
    if (this.holdTickTimer) return;
    const tick = async () => {
      try {
        // any held customers? try to grab a free agent and bridge
        const held = Object.entries(this.holdQueue); // [callLogId, customerChId]
        if (!held.length) return;

        const free = await this.agents.findFreeAgent();
        if (!free) return;

        // pick oldest held customer
        const [callLogId, customerChId] = held[0];
        const agentEndpoint = await this.agents.getAgentEndpoint(free.id);
        if (!agentEndpoint) return;

        await this.agents.markStatus(free.id, 'RINGING');

        const agentCh = this.ari.Channel();
        agentCh.originate({
          endpoint: agentEndpoint,
          app: process.env.ARI_APP,
          appArgs: `ROLE=agent,CALLLOG_ID=${callLogId},AGENT_ID=${free.id}`,
          variables: {
            CALLLOG_ID: callLogId,
            ROLE: 'agent',
            AGENT_ID: free.id,
            DYNAMIC_FEATURES: 'atxfer,blindxfer',
          },
        });

        this.logger.log(`🪄 Retried pairing held call ${callLogId} with agent ${free.id}`);
      } catch (e) {
        this.logger.warn(`hold-tick error: ${(e as Error).message}`);
      }
    };

    this.holdTickTimer = setInterval(tick, 2000);
  }

  private async blastDial(systemcompanyId: number) {
    const freeAgents = await this.agents.findAllFreeAgent(systemcompanyId);
    const freeCount = freeAgents.length;

    if (freeCount === 0) {
      this.logger.warn('❌ No free agents – stopping call attempts');
      return;
    }

    const blast = freeCount * 2;
    this.logger.log(`🚀 Blasting ${blast} calls for ${freeCount} free agents`);

    for (let i = 0; i < blast; i++) {
      const lead = await this.leads.nextLead(systemcompanyId);
      if (!lead) break;

      const callLog = await this.prisma.callLog.create({
        data: {
          callerId: lead.phone,
          action: 'PREDICTIVE_DIAL',
          direction: 'OUTBOUND',
          status: 'WAITING',
          systemName: 'predictive',
        },
      });

      const ch = this.ari.Channel();
      try {
        const settings = await this.prisma.settings.findFirst({
          where: {
            systemCompanyId: systemcompanyId
          },
          include: {
            sipProvider: true
          }
        });
        if (!settings) {
          this.logger.warn(`No System Settings found for this company ID.Stopping The Process.`);
          return;
        }
        ch.originate(
          {
            endpoint: `PJSIP/${lead.phone}@${settings?.sipProvider?.name}`,
            app: process.env.ARI_APP,
            variables: {
              CALLLOG_ID: callLog.id,
              ROLE: 'customer',
            },
          },
          (err) => {
            if (err) this.logger.error(`Originate failed: ${err.message}`);
          },
        );
      } catch (e) {
        this.logger.error(`Originate failed: ${(e as Error).message}`);
      }
    }
  }

  private findCustomerChannel(callLogId: string): string | undefined {
    return Object.entries(this.channelToMeta).find(
      ([, m]) => m.callLogId === callLogId && m.role === 'customer',
    )?.[0];
  }

  // ===== ARI Event Handlers ==================================================

  private async onStasisStart(ev: any, ch: any) {
    // Gather vars (ARI can deliver in different places)
    const vars: Record<string, string> = {
      ...(ch.channelvars || {}),
      ...(ch.variables || {}),
    };
    if (Array.isArray(ev?.args)) {
      for (const arg of ev.args) {
        const [k, v] = String(arg).split('=');
        if (k && v != null) vars[k] = v;
      }
    }

    let callLogId: string | null = vars.CALLLOG_ID ?? null;
    const role: 'customer' | 'agent' =
      (vars.ROLE?.toLowerCase() as any) === 'agent' ? 'agent' : 'customer';
    const agentId: string | null = vars.AGENT_ID ?? null;

    if (!callLogId) {
      const newLog = await this.prisma.callLog.create({
        data: {
          callerId: ch.caller?.number || ch.name,
          action: 'PREDICTIVE_DIAL',
          direction: role === 'customer' ? 'INBOUND' : 'OUTBOUND',
          status: $Enums.CallStatus.RINGING,
          systemName: 'predictive',
        },
      });
      callLogId = newLog.id;
      this.logger.log(`📝 Created new callLog ${callLogId} for channel ${ch.id}`);
    }

    this.channelToMeta[ch.id] = { callLogId, role, agentId };
    this.emit(`meta:ready:${ch.id}`);
    const callLog = await this.prisma.callLog.update({
      where: { id: callLogId },
      data: { status: $Enums.CallStatus.RINGING },
      include: { agent: true }
    });

    if (!callLog) this.logger.warn(`No agent found for callLog ${callLogId}`);

    // customer enters on-hold immediately (audible feedback while we look for agent)
    if (role === 'customer') {
      try {
        await ch.startMoh();
      } catch (e) {
        this.logger.warn(`Could not start MOH on ${ch.id}: ${(e as Error).message}`);
      }
      // queue for hold-ticker pairing
      this.holdQueue[callLogId] = ch.id;
      this.setHoldTimeout(ch.id, callLogId);
      this.ws.emit('dialer:ringing', { callLogId, systemCompanyId: callLog.agent?.systemCompanyId, channelId: ch.id });
    }


  }

  private async onChannelStateChange(ev: any, ch: Channel) {
    this.logger.debug({ channelId: ch.id, state: ch.state }, '📞 [STATE CHANGE]');
    if (ch.state !== 'Up') return;

    let meta = this.channelToMeta[ch.id];
    if (!meta) {
      // race protect
      this.logger.warn(`⚠️ No meta yet for ${ch.id}, queuing state change...`);
      this.once(`meta:ready:${ch.id}`, () => {
        this.logger.log(`🔄 Re-running state change for ${ch.id} after meta ready`);
        this.onChannelStateChange(ev, ch).catch((e) => this.logger.error(e));
      });
      return;
    }

    if (meta.role === 'customer') {
      const free = await this.agents.findFreeAgent();
      this.logger.debug({ freeAgent: free }, '👀 [AGENT SEARCH]');
      if (!free) {
        // remain on MOH; hold-ticker will retry later
        this.holdQueue[meta.callLogId] = ch.id;
        return;
      }

      await this.agents.markStatus(free.id, 'RINGING');
      const agentEndpoint = await this.agents.getAgentEndpoint(free.id);
      if (!agentEndpoint) return;

      const agentCh = this.ari.Channel();
      agentCh.originate({
        endpoint: agentEndpoint,
        app: process.env.ARI_APP,
        appArgs: `ROLE=agent,CALLLOG_ID=${meta.callLogId},AGENT_ID=${free.id}`,
        variables: {
          CALLLOG_ID: meta.callLogId,
          ROLE: 'agent',
          AGENT_ID: free.id,
          DYNAMIC_FEATURES: 'atxfer,blindxfer',
        },
      });
    } else if (meta.role === 'agent') {
      // agent answered → bridge with customer
      const customerChId = this.findCustomerChannel(meta.callLogId);
      if (!customerChId) {
        this.logger.error(`❌ No customer channel found for callLog ${meta.callLogId}`);
        return;
      }

      // stop MOH before bridging
      try {
        await this.safeStopMoh(this.ari.Channel(customerChId));
      } catch { }

      const bridge = this.ari.Bridge();
      await bridge.create({ type: 'mixing' });
      await bridge.addChannel({ channel: [customerChId, ch.id] });

      // remove from hold queue if present
      delete this.holdQueue[meta.callLogId];
      this.clearHoldTimeout(customerChId);

      const callLog = await this.prisma.callLog.update({
        where: { id: meta.callLogId },
        data: { status: $Enums.CallStatus.CONNECTED, agentId: meta.agentId },
        include: { agent: true }
      });
      if (meta.agentId) await this.agents.markStatus(meta.agentId, 'BUSY');

      // enable dynamic features for both legs (optional)
      try {
        await this.ari.Channel(customerChId).setChannelVar({
          variable: 'DYNAMIC_FEATURES',
          value: 'atxfer,blindxfer',
        });
        await ch.setChannelVar({
          variable: 'DYNAMIC_FEATURES',
          value: 'atxfer,blindxfer',
        });
      } catch { }

      this.ws.emit('dialer:bridged', { callLogId: meta.callLogId, phoneNumber: callLog.calleeId, systemCompanyId: callLog.agent?.systemCompanyId, agentId: meta.agentId });
      const vars: Record<string, string> = {
        ...(ch.channelvars || {}),
      };
      if (Array.isArray(ev?.args)) {
        for (const arg of ev.args) {
          const [k, v] = String(arg).split('=');
          if (k && v != null) vars[k] = v;
        }
      }
      let callLogId: string | null = vars.CALLLOG_ID ?? null;
      try {
        await this.prisma.callLog.update({
          where: { id: callLogId },
          data: { status: $Enums.CallStatus.CONNECTED, agentId: meta.agentId },
        });
        this.logger.log(`✔️ Updating Call Log as status CONNECTED`, { callLogId: meta.callLogId });
      } catch (e) {
        this.logger.error(`❌ Error updating Call Log`, { callLogId: meta.callLogId });

      }
      this.logger.log('✅ Call bridged successfully', { callLogId: meta.callLogId });
    }
  }

  private async onChannelDestroyed(ev: any, ch: Channel) {
    const meta = this.channelToMeta[ch.id];
    if (!meta) return;

    this.clearHoldTimeout(ch.id);

    // clean transfer state if any
    if (meta.callLogId) this.pendingTransfers.delete(meta.callLogId);

    // if customer hung up while ringing → mark no answer
    try {
      const cl = await this.prisma.callLog.findUnique({ where: { id: meta.callLogId } });
      if (cl && cl.status === $Enums.CallStatus.RINGING) {
        await this.prisma.callLog.update({
          where: { id: cl.id },
          data: { status: $Enums.CallStatus.NO_ANSWER },
        });
      }
    } catch { }

    if (meta.role === 'customer' && meta.callLogId) {
      // Customer hung up → kill the agent leg too
      const agentEntry = Object.entries(this.channelToMeta)
        .find(([_, m]) => m.role === 'agent' && m.callLogId === meta.callLogId);

      if (agentEntry) {
        const [agentChId, agentMeta] = agentEntry;
        try {
          await this.ari.channels.hangup({ channelId: agentChId });
          this.logger.log(`Hung up agent ${agentChId} because customer left`);
        } catch (e) {
          this.logger.warn(`Could not hangup agent channel: ${e.message}`);
        }
      }
    }

    if (meta.role === 'agent' && meta.callLogId) {
      // Agent hung up → kill the customer leg too
      const custEntry = Object.entries(this.channelToMeta)
        .find(([_, m]) => m.role === 'customer' && m.callLogId === meta.callLogId);

      if (custEntry) {
        const [custChId, custMeta] = custEntry;
        try {
          await this.ari.channels.hangup({ channelId: custChId });
          this.logger.log(`Hung up customer ${custChId} because agent left`);
        } catch (e) {
          this.logger.warn(`Could not hangup customer channel: ${e.message}`);
        }
      }
    }
    delete this.holdQueue[meta.callLogId];
    delete this.channelToMeta[ch.id];
  }

  // ===== DTMF & Transfers ====================================================

  private async onDtmfReceived(ev: any, ch: Channel) {
    // de-dup very chatty DTMF events
    if (this.lastDtmf[ch.id] === ev.digit) {
      this.logger.debug(`Ignoring duplicate DTMF ${ev.digit} on ${ch.id}`);
      this.lastDtmf[ch.id] = undefined;
      return;
    }
    this.lastDtmf[ch.id] = ev.digit;

    this.logger.log(`📟 DTMF ${ev.digit} on ${ch.id}`);
    const meta = this.channelToMeta[ch.id];
    if (!meta) return;

    const transfer = meta.callLogId ? this.pendingTransfers.get(meta.callLogId) : undefined;

    if (ev.digit === '#') {
      if (!transfer) {
        await this.handleBlindTransfer(meta);
      } else {
        // finalize transfer: stop MOH (if any) and send customer to dialplan
        const ext = transfer.digits.join('');
        this.logger.log(`🔀 Transfer to ${ext}@dialer-ext`);
        try {
          const customerCh = this.ari.Channel(transfer.customerChannelId);
          await this.safeStopMoh(customerCh);
          await customerCh.continueInDialplan({
            context: 'dialer-ext',
            extension: ext || '200',
            priority: 1,
          });
        } catch (e) {
          this.logger.error(`Blind transfer failed`, e);
        }
        // hang up agent leg after initiating transfer
        try {
          await this.safeHangup(this.ari.Channel(transfer.agentChannelId));
        } catch { }
        this.pendingTransfers.delete(meta.callLogId);
      }
      return;
    }

    // collect digits while in transfer mode
    if (transfer) {
      transfer.digits.push(ev.digit);
      this.logger.debug(`DTMF during transfer: digits=${transfer.digits.join('')}`);
      return;
    }

    // attended transfer control
    switch (ev.digit) {
      case '*':
        await this.startAttendedTransfer(meta, ch);
        break;
      case '1':
        await this.confirmAttendedTransfer(meta.callLogId);
        break;
      case '0':
        await this.cancelAttendedTransfer(meta.callLogId);
        break;
    }
  }

  // Blind transfer: play pbx tone to agent, put customer on MOH, collect digits until next '#'
  private async handleBlindTransfer(meta: Meta) {
    const customerChId = this.findCustomerChannel(meta.callLogId);
    if (!customerChId) return;
    const agentChId = Object.entries(this.channelToMeta).find(
      ([, m]) => m.callLogId === meta.callLogId && m.role === 'agent',
    )?.[0];
    if (!agentChId) return;

    const customerCh = this.ari.Channel(customerChId);
    const agentCh = this.ari.Channel(agentChId);

    this.logger.log(`🚀 Blind transfer start for call ${meta.callLogId}`);

    // init buffer
    this.pendingTransfers.set(meta.callLogId, {
      digits: [],
      agentChannelId: agentChId,
      customerChannelId: customerChId,
    });

    // tone to agent
    try {
      const pbx = this.ari.Playback();
      agentCh.play({ media: 'sound:pbx-transfer' }, pbx);
    } catch { }

    // hold the customer during entry
    try {
      await customerCh.startMoh();
    } catch { }
  }

  // (Optional) attended transfer scaffolding
  private async startAttendedTransfer(meta: Meta, ch: Channel) {
    // you can extend this to create a consult call, etc.
    this.logger.log(`🤝 Attended transfer requested for ${meta.callLogId} (stub)`);
  }
  private async confirmAttendedTransfer(callLogId: string) {
    this.logger.log(`✅ Attended transfer confirm for ${callLogId} (stub)`);
  }
  private async cancelAttendedTransfer(callLogId: string) {
    this.logger.log(`❌ Attended transfer cancel for ${callLogId} (stub)`);
  }
}

