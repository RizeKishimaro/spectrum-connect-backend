import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './utils/prisma/prisma.service';
import { subDays, format, startOfDay, endOfDay } from "date-fns"

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) { }
  async getSummary() {
    const today = new Date()
    const yesterday = subDays(today, 1)

    // 📞 Total calls today
    const totalToday = await this.prisma.callLog.count({
      where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
    })

    // 📞 Total calls yesterday
    const totalYesterday = await this.prisma.callLog.count({
      where: { createdAt: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) } },
    })

    // 👥 Active agents
    const activeAgents = await this.prisma.agent.count({ where: { status: "AVAILABLE" } })
    const totalAgents = await this.prisma.agent.count()

    // ⏱ Avg call duration today
    const avgDurationAgg = await this.prisma.callLog.aggregate({
      _avg: { duration: true },
      where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) }, duration: { not: null } },
    })

    // 📞 Missed calls (example: status === "MISSED")
    const missedCalls = await this.prisma.callLog.count({
      where: { status: "MISSED", createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
    })

    return {
      totalCallsToday: totalToday,
      callsChangePercent: totalYesterday
        ? ((totalToday - totalYesterday) / totalYesterday) * 100
        : null,
      activeAgents,
      totalAgents,
      avgDuration: avgDurationAgg._avg.duration || 0,
      missedCalls,
      missedPercent: totalToday ? (missedCalls / totalToday) * 100 : 0,
    }
  }
  // 📊 Call statistics grouped by weekday
  async getCallStats() {
    const startDate = subDays(new Date(), 6) // last 7 days
    const logs = await this.prisma.callLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, direction: true },
    })

    const result: Record<string, { inbound: number; outbound: number }> = {}

    logs.forEach((log) => {
      const day = format(log.createdAt, "EEE") // Mon, Tue...
      if (!result[day]) result[day] = { inbound: 0, outbound: 0 }
      if (log.direction === "INBOUND") result[day].inbound++
      else result[day].outbound++
    })

    // Ensure all days appear in correct order
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.map((day) => ({
      name: day,
      inbound: result[day]?.inbound || 0,
      outbound: result[day]?.outbound || 0,
    }))
  }

  // 👥 Agent status overview
  async getAgentStatus() {
    const agents = await this.prisma.agent.findMany({
      select: { status: true },
    })

    const total = agents.length
    const counts: Record<string, number> = {}

    agents.forEach((agent) => {
      counts[agent.status] = (counts[agent.status] || 0) + 1
    })

    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      total,
    }))
  }

  // ☎️ Recent calls
  async getRecentCalls() {
    const calls = await this.prisma.callLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        callerId: true,
        calleeId: true,
        direction: true,
        duration: true,
        status: true,
        createdAt: true,
      },
    })
    return calls
  }
}
