
import { Injectable, Inject, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Client, Channel } from 'ari-client';
import { ARI_CLIENT } from 'src/utils/ari/ari.module';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { LockService } from './locks/lock.service';
import { CustomerCrmService } from 'src/customer-crm/customer-crm.service';
import { AgentService } from 'src/agent/agent.service';
import { AMIProvider } from 'src/utils/providers/ami/ami-provider.service';
import { $Enums, Agent } from '@prisma/client';
import { WsGatewayGateway } from 'src/ws-gateway/ws-gateway.gateway';
import { randomUUID } from 'crypto';

type Meta = { callLogId: string; role: 'customer' | 'agent'; agentId?: string | null, phone?: string | null, leadId?: string | null };

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
  private agentTimers: Record<string, NodeJS.Timeout> = {};

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
    // this.startHoldTicker();
  }

  // ===== Public controls =====================================================


  async startAgentDial(agentId: string, dto: { slots?: number }) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new BadRequestException("Invalid Agent Detected By System!")
    const agentInformation = await this.prisma.agentInformation.findFirst({
      where: {
        agentId: agent.id
      }
    })
    let agentSettings;
    if (!agentInformation) {
      agentSettings = await this.prisma.agentInformation.create({
        data: {
          agentId: agent.id
        }
      })
    } else {
      agentSettings = agentInformation
    }
    if (!agent) throw new BadRequestException('Agent not found');
    await this.prisma.agentInformation.update({
      where: {
        id: agentSettings.id,
      },
      data: {
        isInPredictiveDialer: true
      }
    })
    const { slots = 1 } = dto;

    // Track how many concurrent calls this agent can handle
    this.agentRunning[agentId] = { slots, active: 0 };

    await this.agents.markStatus(agentId, 'AVAILABLE');

    this.ws.emit('dialer:start', { agentId, name: agent.name, systemCompanyId: agent.systemCompanyId, slots });

    await this.blastDial(agent.systemCompanyId, agent.id);
  }


  async getAgentMetadata(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: {
        id: agentId
      }
    });
    if (!agent) throw new BadRequestException("Agent Not Found Please Login Again");
    const agentMetadata = await this.prisma.agentInformation.findFirst({
      where: {
        agentId: agent.id
      }
    });
    return agentMetadata;
  }


  async stopAgentDial(agentId: string, reason = "stopped") {
    delete this.agentRunning[agentId];

    if (this.agentTimers[agentId]) {
      clearTimeout(this.agentTimers[agentId]);
      delete this.agentTimers[agentId];
    }

    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });

    if (!agent) throw new BadRequestException('Agent not found');
    const agentInformation = await this.prisma.agentInformation.findFirst({
      where: {
        agentId: agent.id
      }
    })
    let agentSettings;
    if (!agentInformation) {
      agentSettings = await this.prisma.agentInformation.create({
        data: {
          agentId: agent.id
        }
      })
    } else {
      agentSettings = agentInformation
    }
    await this.prisma.agentInformation.update({
      where: {
        id: agentSettings.id,
      },
      data: {
        isInPredictiveDialer: false
      }
    })
    if (!agent) return;

    this.ws.emit("dialer:stop", {
      agentId,
      name: agent.name,
      systemCompanyId: agent.systemCompanyId,
      reason,
    });

    this.logger.log(`🛑 Dialer stopped for agent ${agent.name} (${agentId})`);
  }


  // ===== Dialer core =========================================================
  private stopHoldTicker() {
    if (this.holdTickTimer) {
      clearInterval(this.holdTickTimer);
      this.holdTickTimer = undefined;
      this.logger.log(`⏹️ Stopped hold ticker (no held calls)`);
    }
  }
  // private async replenish(agentId: string) {
  //   const run = this.agentRunning[agentId];
  //   if (!run) return;

  //   while (run.active < run.slots) {
  //     const got = await this.locks.acquire(`dialer:${agentId}`, 500);
  //     if (!got) break;

  //     try {
  //       const agent = await this.prisma.agent.findUnique({ where: { id: agentId }, include: { systemCompany: true } });
  //       if (!agent) break;

  //       const lead = await this.leads.nextLead(agent.systemCompanyId);
  //       if (!lead) break;

  //       const callLog = await this.prisma.callLog.create({
  //         data: {
  //           callerId: lead.phone,
  //           action: 'PREDICTIVE_DIAL',
  //           direction: 'OUTBOUND',
  //           status: 'WAITING',
  //           systemName: agent.systemCompany.name,
  //           userId: agentId,
  //         },
  //       });

  //       const channel = this.ari.Channel();
  //       channel.originate(
  //         {
  //           endpoint: `PJSIP/${lead.phone}`,
  //           app: process.env.ARI_APP,
  //           variables: {
  //             CALLLOG_ID: callLog.id,
  //             ROLE: 'customer',
  //           },
  //         },
  //         async (err) => {
  //           if (err) {
  //             this.logger.error('Originate failed', err.stack);
  //             await this.prisma.cRMLeads.update({
  //               where: { id: lead.id },
  //               data: { isContacted: true, contactStatus: 'FAILED' },
  //             })
  //           };
  //         },
  //       );

  //       run.active++;
  //       this.ws.emit('dialer:attempt', {
  //         agentId,
  //         leadId: lead.id,
  //         name: agent.name,
  //         systemCompanyId: agent.systemCompanyId,
  //         callLogId: callLog.id,
  //       });
  //     } finally {
  //       await this.locks.release(`dialer:${agentId}`);
  //     }
  //   }
  // }

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

  // private startHoldTicker() {
  //   if (this.holdTickTimer) return; // already running

  //   const tick = async () => {
  //     try {
  //       const held = Object.entries(this.holdQueue); // [callLogId, customerChId]
  //       if (!held.length) {
  //         // No more held calls → stop ticker
  //         this.stopHoldTicker();
  //         return;
  //       }

  //       const free = await this.agents.findFreeAgent();
  //       if (!free) return;

  //       // pick oldest held customer
  //       const [callLogId, customerChId] = held[0];
  //       const agentEndpoint = await this.agents.getAgentEndpoint(free.id);
  //       const meta = this.channelToMeta[customerChId];
  //       const customerPhone = meta?.phone;
  //       if (!agentEndpoint) return;
  //       this.logger.debug(customerPhone)

  //       await this.agents.markStatus(free.id, 'RINGING');

  //       const agentCh = this.ari.Channel();

  //       agentCh.originate({
  //         endpoint: agentEndpoint,
  //         app: process.env.ARI_APP,
  //         appArgs: `ROLE=agent,CALLLOG_ID=${callLogId},AGENT_ID=${free.id}`,
  //         callerId: customerPhone as string,
  //         timeout: 30,
  //         variables: {
  //           CALLLOG_ID: callLogId,
  //           ROLE: 'agent',
  //           AGENT_ID: free.id,
  //           DYNAMIC_FEATURES: 'atxfer,blindxfer',
  //           "PJSIP_HEADER(add,X-CallLogId)": callLogId,
  //           "PJSIP_HEADER(add,X-Role)": "agent",
  //           "PJSIP_HEADER(add,X-AgentId)": free.id,
  //           "PJSIP_HEADER(add,X-CUSTOMER_PHONE)": customerPhone
  //         },
  //       });


  //       this.logger.log(`🪄 Retried pairing held call ${callLogId} with agent ${free.id}`);
  //     } catch (e) {
  //       this.logger.warn(`hold-tick error: ${(e as Error).message}`);
  //     }
  //   };

  //   this.logger.log(`▶️ Starting hold ticker`);
  //   this.holdTickTimer = setInterval(tick, 2000);
  // }




  private async blastDial(systemCompanyId: number, agentId: string) {
    // check if agent is still running
    if (!this.agentRunning[agentId]) {
      this.logger.warn(`⏹️ Agent ${agentId} not running anymore, stopping blast`);
      return;
    }

    const freeAgents = await this.agents.findAllFreeAgent(systemCompanyId);
    const freeCount = freeAgents.length;

    if (freeCount === 0) {
      this.logger.warn("❌ No free agents – retrying in 5s");
      setTimeout(() => this.blastDial(systemCompanyId, agentId), 5000);
      return;
    }

    const blast = freeCount * 2;
    this.logger.log(`🚀 Blasting ${blast} calls for ${freeCount} free agents`);

    for (let i = 0; i < blast; i++) {
      const lead = await this.leads.nextLead(systemCompanyId);
      if (!lead) {
        this.logger.warn("📭 No more leads to call – retrying in 30s");
        setTimeout(() => this.blastDial(systemCompanyId, agentId), 30000);
        return;
      }

      const callLog = await this.prisma.callLog.create({
        data: {
          callerId: lead.phone,
          action: "PREDICTIVE_DIAL",
          direction: "OUTBOUND",
          status: "WAITING",
          systemName: "predictive",
          agentId,
        },
      });

      const ch = this.ari.Channel();
      try {
        const settings = await this.prisma.settings.findFirst({
          where: { systemCompanyId },
          include: {
            sipProvider: true,
            ivr: true,
            DIDNumber: true
          },
        });

        if (!settings?.sipProvider || !settings?.ivr || !settings.DIDNumber) {
          this.logger.warn(`⚠️ No System Settings found. Retrying in 10s.`);
          setTimeout(() => this.blastDial(systemCompanyId, agentId), 10000);
          return;
        }

        ch.originate(
          {
            // endpoint: `PJSIP/${lead.phone}@${settings.sipProvider.name}`,
            endpoint: `PJSIP/${lead.phone}`,
            callerId: settings.DIDNumber?.didNumber,
            app: process.env.ARI_APP,
            timeout: 30,
            variables: {
              CALLLOG_ID: callLog.id,
              ROLE: "customer",
              CUSTOMER_PHONE: lead.phone,
              LEAD_ID: lead.id,
              "PJSIP_HEADER(add,X-CallLogId)": callLog.id,
              "PJSIP_HEADER(add,X-Role)": "customer",
              "PJSIP_HEADER(add,X-CustomerPhone)": lead.phone,
              "PJSIP_HEADER(add,X-LeadId)": lead.id,
            },
          },
          async (err) => {
            if (err) {
              this.logger.error(`Originate failed: ${err.message}`);
              await this.prisma.callLog.update({
                where: { id: callLog.id },
                data: { status: $Enums.CallStatus.INTERNAL_ERROR, agentId },
              });
              await this.prisma.cRMLeads.update({
                where: { id: lead.id },
                data: { contactStatus: $Enums.CallStatus.INTERNAL_ERROR },
              });
            }
          }
        );

        this.channelToMeta[ch.id] = {
          callLogId: callLog.id,
          role: "customer",
          agentId,
          phone: lead.phone,
          leadId: lead.id,
        };
      } catch (e) {
        this.logger.error(`Originate failed: ${(e as Error).message}`);
      }
    }


    this.agentTimers[agentId] = setTimeout(
      () => this.blastDial(systemCompanyId, agentId),
      5000
    );

  }


  private findCustomerChannel(callLogId: string): string | undefined {
    return Object.entries(this.channelToMeta).find(
      ([, m]) => m.callLogId === callLogId && m.role === 'customer',
    )?.[0];
  }

  // ===== ARI Event Handlers ==================================================



  // 🌸 Handle Stasis start
  private async onStasisStart(ev: any, ch: Channel) {
    const vars: Record<string, string> = { ...(ch.channelvars || {}) };
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

    // Create new callLog if customer leg starts without one
    if (!callLogId && role === 'customer') {
      const newLog = await this.prisma.callLog.create({
        data: {
          callerId: ch.caller?.number || ch.name,
          action: 'PREDICTIVE_DIAL',
          direction: 'OUTBOUND',
          status: $Enums.CallStatus.RINGING,
          systemName: 'predictive',
          agentId: agentId,
        },
      });
      callLogId = newLog.id;
      this.logger.log(`📝 Created new callLog ${callLogId} for customer channel ${ch.id}`);
    }

    // If agent leg has no callLogId, try to link to customer
    if (!callLogId && role === 'agent') {
      const custEntry = Object.entries(this.channelToMeta)
        .find(([_, m]) => m.role === 'customer');
      if (custEntry) {
        callLogId = custEntry[1].callLogId;
        this.logger.log(`🔗 Agent channel ${ch.id} linked to customer callLog ${callLogId}`);
      }
    }

    // Save/merge channel meta (preserve agentId from pre-registration)
    // this.channelToMeta[ch.id] = {
    //   callLogId,
    //   role,
    //   agentId: agentId ?? this.channelToMeta[ch.id]?.agentId ?? null,
    //   phone: vars.CUSTOMER_PHONE || ch.caller?.number,
    // };
    this.emit(`meta:ready:${ch.id}`);

    // Update callLog status if exists
    if (callLogId) {
      try {
        const callLog = await this.prisma.callLog.update({
          where: { id: callLogId },
          data: { status: $Enums.CallStatus.RINGING },
          include: { agent: true },
        });

        if (!callLog.agent && role === 'agent') {
          this.logger.warn(`⚠️ No agent linked in callLog ${callLogId}`);
        }
      } catch (e) {
        this.logger.warn(`⚠️ Could not update callLog ${callLogId}: ${(e as Error).message}`);
      }
    }

    // Customer-specific handling
    if (role === 'customer' && callLogId) {
      try {
        await ch.startMoh();
      } catch (e) {
        this.logger.warn(`Could not start MOH on ${ch.id}: ${(e as Error).message}`);
      }
      this.holdQueue[callLogId] = ch.id;
      this.setHoldTimeout(ch.id, callLogId);
      this.ws.emit('dialer:ringing', {
        callLogId,
        systemCompanyId: (await this.prisma.callLog.findUnique({
          where: { id: callLogId },
          include: { agent: true },
        }))?.agent?.systemCompanyId,
        channelId: ch.id,
      });
    }
  }

  // 🌸 Handle channel state changes
  private async onChannelStateChange(ev: any, ch: Channel) {
    this.logger.debug({ channelId: ch.id, state: ch.state }, '📞 [STATE CHANGE]');
    if (ch.state !== 'Up') return;

    let meta = this.channelToMeta[ch.id];
    if (!meta) {
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
        this.logger.warn(`⚠️ No free agents → keeping customer ${ch.id} on hold`);
        this.holdQueue[meta.callLogId] = ch.id;
        return;
      }

      // Mark agent RINGING
      await this.agents.markStatus(free.id, 'RINGING');

      // 💡 LINK agentId to customer meta *immediately*
      meta.agentId = free.id;
      this.channelToMeta[ch.id] = meta;

      // Also update callLog with agentId immediately
      await this.prisma.callLog.update({
        where: { id: meta.callLogId },
        data: { agentId: free.id },
      });

      const agentEndpoint = await this.agents.getAgentEndpoint(free.id);
      const customerPhone = meta?.phone;
      if (!agentEndpoint) {
        this.logger.error(`❌ No endpoint for agent ${free.id}, aborting originate`);
        return;
      }

      this.logger.debug(`📡 Originate agent for callLog ${meta.callLogId}`, {
        agent: free.id,
        endpoint: agentEndpoint,
        customerPhone,
      });

      const agentCh = this.ari.Channel();
      const agentChannelId = agentCh.id;
      this.channelToMeta[agentChannelId] = {
        callLogId: meta.callLogId,
        role: 'agent',
        agentId: free.id,
        phone: free.phoneNumber,
      };

      agentCh.originate({
        endpoint: agentEndpoint,
        app: process.env.ARI_APP,
        callerId: customerPhone as string,
        appArgs: `ROLE=agent,CALLLOG_ID=${meta.callLogId},AGENT_ID=${free.id}`,
        variables: {
          CALLLOG_ID: meta.callLogId,
          ROLE: 'agent',
          AGENT_ID: free.id,
          DYNAMIC_FEATURES: 'atxfer,blindxfer',
          "PJSIP_HEADER(add,X-Role)": "agent",
          "PJSIP_HEADER(add,X-AgentId)": free.id,
          "PJSIP_HEADER(add,X-CUSTOMER_PHONE)": customerPhone,
          "PJSIP_HEADER(add,X-LeadId)": meta.leadId,
        },
      });
    } else if (meta.role === 'agent') {
      // Bridge with customer
      const customerChId = this.findCustomerChannel(meta.callLogId);
      if (!customerChId) {
        this.logger.error(`❌ No customer channel found for callLog ${meta.callLogId}, hanging up agent...`);
        try { await ch.hangup(); } catch { }
        return;
      }

      try {
        await this.safeStopMoh(this.ari.Channel(customerChId));
      } catch { }

      const bridge = this.ari.Bridge();
      await bridge.create({ type: 'mixing' });
      await bridge.addChannel({ channel: [customerChId, ch.id] });

      delete this.holdQueue[meta.callLogId];
      this.clearHoldTimeout(customerChId);

      const callLog = await this.prisma.callLog.update({
        where: { id: meta.callLogId },
        data: { status: $Enums.CallStatus.CONNECTED, agentId: meta.agentId },
        include: { agent: true },
      });
      if (meta.agentId) await this.agents.markStatus(meta.agentId, 'BUSY');

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

      this.ws.emit('dialer:bridged', {
        callLogId: meta.callLogId,
        phoneNumber: callLog.calleeId,
        systemCompanyId: callLog.agent?.systemCompanyId,
        agentId: meta.agentId,
      });

      this.logger.log('✅ Call bridged successfully', { callLogId: meta.callLogId });
    }
  }






  private async onChannelDestroyed(ev: any, ch: Channel) {
    this.logger.debug("🗑️ Channel destroyed bye", { channelId: ch.id, state: ch.state });

    const meta = this.channelToMeta[ch.id];
    if (!meta) {
      this.logger.debug(`⚠️ No meta found for destroyed channel ${ch.id}`);
      return;
    }

    this.logger.debug("🔎 Destroy meta", meta);
    this.clearHoldTimeout(ch.id);

    if (meta.callLogId) {
      this.logger.debug(`🧹 Cleaning pending transfer for callLog ${meta.callLogId}`);
      this.pendingTransfers.delete(meta.callLogId);
    }

    try {
      const cl = meta.callLogId
        ? await this.prisma.callLog.findUnique({ where: { id: meta.callLogId } })
        : null;

      this.logger.debug("📒 CallLog before update", cl);

      if (cl) {

        let finalStatus: $Enums.CallStatus | null = null;
        let newContactStatus: string | null = null;

        if (cl.status === $Enums.CallStatus.RINGING) {
          // lead never picked up
          await this.prisma.callLog.update({
            where: { id: cl.id },
            data: { status: $Enums.CallStatus.NO_ANSWER, agentId: meta.agentId },
          });
          finalStatus = $Enums.CallStatus.NO_ANSWER;
          newContactStatus = "No Answer";
        }
        else if (cl.status === $Enums.CallStatus.CONNECTED) {
          // lead DID answer at some point, then hung up
          await this.prisma.callLog.update({
            where: { id: cl.id },
            data: { status: $Enums.CallStatus.HUNGUP, agentId: meta.agentId },
          });
          finalStatus = $Enums.CallStatus.HUNGUP;
          newContactStatus = "Answered";
        }
        else if (cl.status === $Enums.CallStatus.BUSY) {
          await this.prisma.callLog.update({
            where: { id: cl.id },
            data: { status: $Enums.CallStatus.BUSY, agentId: meta.agentId },
          });
          finalStatus = $Enums.CallStatus.BUSY;
          newContactStatus = "Busy";
        }
        else if (cl.status === $Enums.CallStatus.FAILED) {
          await this.prisma.callLog.update({
            where: { id: cl.id },
            data: { status: $Enums.CallStatus.FAILED, agentId: meta.agentId },
          });
          finalStatus = $Enums.CallStatus.FAILED;
          newContactStatus = "Failed";
        }
        else {
          // fallback
          await this.prisma.callLog.update({
            where: { id: cl.id },
            data: { status: $Enums.CallStatus.NO_ANSWER, agentId: meta.agentId },
          });
          finalStatus = $Enums.CallStatus.NO_ANSWER;
          newContactStatus = "No Answer";
        }

        if (meta.leadId && newContactStatus) {
          await this.prisma.cRMLeads.update({
            where: { id: meta.leadId },
            data: {
              contactStatus: newContactStatus,
              isContacted: true,
            },
          });

          this.logger.log(
            `💾 Lead ${meta.leadId} (${meta.phone}) → contactStatus=${newContactStatus}`
          );
        }
      }
    } catch (e) {
      this.logger.error(
        `❌ Error updating Call Log/Lead ${meta.callLogId}: ${(e as Error).message}`
      );
    }
    // Handle paired legs (only if still alive in channelToMeta)
    if (meta.role === 'customer' && meta.callLogId) {
      this.logger.debug(`👤 Customer leg ${ch.id} destroyed → checking for paired agent...`);
      const agentEntry = Object.entries(this.channelToMeta)
        .find(([_, m]) => m.role === 'agent' && m.callLogId === meta.callLogId);

      if (agentEntry) {
        const [agentChId, agentMeta] = agentEntry;
        this.logger.debug(`Found agent leg ${agentChId}`, agentMeta);

        try {
          await this.ari.Channel(agentChId).hangup();
          this.logger.log(`💔 Hung up agent ${agentChId} because customer ${ch.id} left`);
        } catch (e) {
          this.logger.warn(`Could not hangup agent channel ${agentChId}: ${(e as Error).message}`);
        }
      }
    }

    if (meta.role === 'agent' && meta.callLogId) {
      this.logger.debug(`🤖 Agent leg ${ch.id} destroyed → checking for paired customer...`);
      const custEntry = Object.entries(this.channelToMeta)
        .find(([_, m]) => m.role === 'customer' && m.callLogId === meta.callLogId);

      if (custEntry) {
        const [custChId, custMeta] = custEntry;
        this.logger.debug(`Found customer leg ${custChId}`, custMeta);

        try {
          await this.ari.Channel(custChId).hangup();
          this.logger.log(`💔 Hung up customer ${custChId} because agent ${ch.id} left`);
        } catch (e) {
          this.logger.warn(`Could not hangup customer channel ${custChId}: ${(e as Error).message}`);
        }
      }
    }

    // Cleanup
    if (meta.callLogId) {
      this.logger.debug(`🧹 Cleaning holdQueue for callLog ${meta.callLogId}`);
      delete this.holdQueue[meta.callLogId];
    }

    this.logger.debug(`🧹 Removing channel meta for ${ch.id}`);
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

