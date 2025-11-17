import { Injectable, OnModuleInit } from '@nestjs/common';
import * as dgram from 'dgram';
import * as hepjs from 'hep-js';
import { SipSessionService } from '../sip-session/sip-session.service';
import { SipGateway } from './sip.gateway';

// Define the port constant
const HEP_PORT = 9060;

@Injectable()
export class SipListenerService implements OnModuleInit {
  private server = dgram.createSocket('udp4');
  // 💥 REMOVED: private callStats map is removed as data is now saved to the DB/Service


  constructor(
    private readonly sessionService: SipSessionService,
    private readonly sipGateway: SipGateway,
  ) { }

  private lastStats: Record<
    string,
    { tx: number; rx: number; timestamp: number, lost: number }
  > = {};


  private callTimeouts: Record<string, NodeJS.Timeout> = {};

  private updateCallStatus(callId: string, status: string) {
    this.sipGateway.broadcast("call-status", {
      callId,
      status,
      timestamp: Date.now(),
    });
  }
  onModuleInit() {
    this.server.on('message', async (msg, rinfo) => {
      try {
        // --- 1. Basic HEP Check ---
        const isHEP =
          msg.length > 4 &&
          msg[0] === 0x48 &&
          msg[1] === 0x45 &&
          msg[2] === 0x50;

        if (!isHEP) return;

        // --- 2. Decapsulate and Check Type ---
        const hep = hepjs.decapsulate(msg);
        if (!hep || !hep.rcinfo) return;

        const rc = hep.rcinfo;
        const payloadType = rc.payloadType;

        const srcIp = rc.srcIp ?? 'unknown';
        const srcPort = rc.srcPort ?? 0;
        const dstIp = rc.dstIp ?? 'unknown';
        const dstPort = rc.dstPort ?? 0;
        const callId = rc.correlation_id ?? 'NO-CORRELATION-ID';

        // --- 3. Handle SIP (Payload Type 1) ---
        if (payloadType === 1) {
          const payload = (hep.payload as Buffer)
            .toString()
            .replace(/\0/g, '')
            .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

          const method = payload.split('\n')[0]?.trim() || 'UNKNOWN';
          if (method.startsWith("BYE")) {
            this.updateCallStatus(callId, "ended");

            delete this.lastStats[callId];
            delete this.callTimeouts[callId];

            console.log(`📞 Call BYE received → cleaned: ${callId}`);
          }
          await this.sessionService.saveSipMessage({
            callId,
            source: `${srcIp}:${srcPort}`,
            destination: `${dstIp}:${dstPort}`,
            method,
            body: payload,
          });

          // 2. Parse and Save SDP Media Offer/Answer
          if (payload.includes('Content-Type: application/sdp')) {
            const isOffer = method.startsWith('INVITE');
            const isAnswer = method.startsWith('SIP/2.0 200 OK');

            if (isOffer || isAnswer) {
              const cLineMatch = payload.match(/c=IN IP4\s*([0-9.]+)/);
              const mLineMatch = payload.match(/m=audio\s*(\d+)\s*(\w+)\s*(\d+)/);

              if (cLineMatch && mLineMatch) {
                const mediaC_IP = cLineMatch[1];
                const mediaM_Port = parseInt(mLineMatch[1], 10);
                const mediaM_Protocol = mLineMatch[2];
                const offerType = isOffer ? 'offer' : 'answer';

                await this.sessionService.saveMediaOffer({
                  callId,
                  sourceIp: srcIp, // The IP that sent the SDP
                  mediaC_IP,
                  mediaM_Port,
                  mediaM_Protocol,
                  type: offerType,
                });
              }
            }
          }
        }

        // --- 4. Handle RTCP/QoS (Payload Type 5, 6, or 7) ---

        // --- 4. Handle RTCP/QoS (Payload Type 5, 6, or 7) ---

        else if ([5, 6, 7].includes(payloadType)) {
          let qosReport: any;

          try {
            qosReport = JSON.parse(hep.payload.toString());
          } catch (e) {
            console.error("Failed to parse QoS JSON payload:", e);
            return;
          }

          // Reset timeout
          if (this.callTimeouts[callId]) clearTimeout(this.callTimeouts[callId]);
          this.callTimeouts[callId] = setTimeout(() => {
            this.updateCallStatus(callId, "ended");
            delete this.lastStats[callId];
            delete this.callTimeouts[callId];
          }, 5000);

          this.updateCallStatus(callId, "active");

          let rawTx = 0;
          let rawRx = 0;
          let rawLost = 0;
          let jitter = 0;
          let rtt = 0;
          let mos = qosReport.mos || 0;

          // --- RTCP Sender Report (TX packets) ---
          if (qosReport.type === 200 && qosReport.sender_information) {
            rawTx = qosReport.sender_information.packets || 0;
          }

          // --- RTCP Receiver Report (RX, Loss, RTT) ---

          if (qosReport.type === 201 && qosReport.report_blocks?.length > 0) {
            const block = qosReport.report_blocks[0];

            // Jitter
            jitter = block.ia_jitter || 0;

            const lostTotal = block.packets_lost || 0;
            const seq = block.highest_seq_no || 0;

            // Mila's correct formula for inbound receive throughput:
            rawRx = Math.max(seq - lostTotal, 0);

            rawLost = lostTotal;

            // RTT (correct 16.16 format)
            const dlsr = block.dlsr || 0;
            rtt = Math.round((dlsr / 65536) * 1000);
          }
          // --- HEP JSON (Optional override) ---
          if (payloadType === 6 || payloadType === 7) {
            jitter = qosReport.rtp_jitter_in_ms || jitter;
            rtt = qosReport.rtp_rtt_in_ms || rtt;
            rawTx = qosReport.packets_sent || rawTx;
            rawRx = qosReport.packets_received || rawRx;
          }

          // Restore last stats (to prevent SR wiping RX)
          const now = Date.now();
          const last = this.lastStats[callId] || {
            tx: rawTx,
            rx: rawRx,
            lost: rawLost,
            timestamp: now
          };

          const deltaSeconds = (now - last.timestamp) / 1000;

          // Compute deltas
          const txDelta = rawTx - last.tx;
          const rxDelta = rawRx - last.rx;
          const lostDelta = rawLost - last.lost;

          // Convert packets to kbps
          const PACKET_SIZE = 172; // bytes
          const txKbps = Math.max(0, Math.round((txDelta * PACKET_SIZE * 8) / 1024 / (deltaSeconds || 1)));
          const rxKbps = Math.max(0, Math.round((rxDelta * PACKET_SIZE * 8) / 1024 / (deltaSeconds || 1)));

          // Save last stats
          this.lastStats[callId] = {
            tx: rawTx,
            rx: rawRx,
            lost: rawLost,
            timestamp: now
          };

          // Emit QoS report
          this.sipGateway.broadcast("qos-report", {
            callId,
            localIp: srcIp,
            remoteIp: dstIp,

            txPackets: txKbps, // kb/s
            rxPackets: rxKbps, // kb/s

            packetLoss: lostDelta,
            totalLoss: rawLost,

            jitter,
            rtt,
            mos,
          });
        }
        else if (payloadType === 5) {
          console.log(`💬 [HEP-REG] Registration/Keep-Alive from Capture ID: ${rc.captureId}`);
        } else {
          console.log(`❓ [HEP] Unknown Payload Type: ${payloadType}`);
        }

      } catch (err) {
        console.error('⚠️ Failed to process HEP packet:', err);
      }
    });

    this.server.bind(HEP_PORT, '0.0.0.0', () => {
      console.log(`🚀 HEP listener running on UDP port ${HEP_PORT}`);
    });
  }

  // 💥 REMOVED: private logChannelStats is removed as aggregation is handled in the DB/Portal
}
