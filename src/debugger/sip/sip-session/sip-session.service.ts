import { Injectable } from '@nestjs/common';
import { SipSession } from '@prisma/client'; // Assuming you have Prisma models imported or available
import { PrismaService } from 'src/utils/prisma/prisma.service';

interface MediaOfferData {
  callId: string;
  sourceIp: string;
  mediaC_IP: string;
  mediaM_Port: number;
  mediaM_Protocol: string;
  type: 'offer' | 'answer';
}
interface QosReportData {
  callId: string;
  reportType: string; // 'SR', 'RR', 'QoS'
  packetsTransmitted?: number;
  packetsLost?: number;
  jitterMs?: number;
  rttMs?: number;
  mos?: number;
}

@Injectable()
export class SipSessionService {

  constructor(private prisma: PrismaService) { }

  /**
   * Finds an existing SipSession by callId or creates a new one.
   * @param callId The correlation_id from the HEP packet.
   * @returns The SipSession object.
   */
  // src/sip/sip-session/sip-session.service.ts

  private async findOrCreateSession(callId: string): Promise<SipSession> {
    // 1. Try to find the session using findUnique (more precise than findFirst for unique fields)
    let session = await this.prisma.sipSession.findUnique({
      where: { callId },
    });

    if (session) {
      return session; // Session found, return it immediately
    }

    // 2. If not found, try to create it. Use a try/catch to handle the race condition.
    try {
      return await this.prisma.sipSession.create({
        data: { callId },
      });
    } catch (e) {
      // 3. If creation failed due to a unique constraint violation (P2002),
      // it means a concurrent process just created it.
      if (e.code === 'P2002') {
        // Retry the find to get the session that the concurrent process created.
        const existingSession = await this.prisma.sipSession.findUnique({
          where: { callId },
        });

        // This should not be null if P2002 was thrown, but we check defensively.
        if (existingSession) {
          return existingSession;
        }
      }

      // If it was another error (DB down, validation error, etc.), rethrow it.
      throw e;
    }
  }

  async getLatestQosReports(limit: number = 10) {
    return this.prisma.qosReport.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
        session: {
          select: {
            callId: true,
          },
        },
      },
    });
  }

  async saveQosReport(data: QosReportData) {
    const session = await this.findOrCreateSession(data.callId);

    const reportData = {
      reportType: data.reportType,
      packetsTransmitted: data.packetsTransmitted || 0,
      packetsLost: data.packetsLost || 0,
      jitterMs: data.jitterMs || 0,
      rttMs: data.rttMs || 0,
      mos: data.mos,
      // Include timestamps if you want to track when the update happened
    };

    // Use upsert to find a report for this session, or create one if it doesn't exist.
    // NOTE: This requires 'sessionId' to be UNIQUE in your QosReport model.
    return this.prisma.qosReport.upsert({
      where: {
        sessionId: session.id, // Assuming sessionId is unique in QosReport for "last known state"
      },
      update: reportData, // Data to apply if found
      create: {
        sessionId: session.id,
        ...reportData,
      },
    });
  }

  async saveSipMessage(data: {
    callId: string;
    source: string;
    destination: string;
    method: string;
    body: string;
  }) {
    // 1. Find or create session using the helper method
    const session = await this.findOrCreateSession(data.callId);

    // 2. Store SIP message inside session
    return this.prisma.sipMessage.create({
      data: {
        sessionId: session.id,
        source: data.source,
        destination: data.destination,
        method: data.method,
        body: data.body,
      },
    });
  }

  async saveMediaOffer(data: MediaOfferData) {
    // Use the new helper method
    const session = await this.findOrCreateSession(data.callId);

    return this.prisma.mediaOffer.create({
      data: {
        sessionId: session.id,
        sourceIp: data.sourceIp,
        mediaC_IP: data.mediaC_IP,
        mediaM_Port: data.mediaM_Port,
        mediaM_Protocol: data.mediaM_Protocol,
        type: data.type,
      },
    });
  }

  async getAllSessions() {
    return this.prisma.sipSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { messages: true, mediaAddresses: true }, // Added mediaAddresses include
    });
  }

  async getSession(id: number) {
    return this.prisma.sipSession.findUnique({
      where: { id },
      include: { messages: true, mediaAddresses: true }, // Added mediaAddresses include
    });
  }
}
