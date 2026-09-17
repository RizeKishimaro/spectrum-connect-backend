import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf<Context>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.warn('Telegram bot token missing – disabled 💔');
      return;
    }

    this.bot = new Telegraf(token);
  }
  private isOwner(ctx: any): boolean {
    const ownerId = this.configService.get<string>('TELEGRAM_OWNER_ID');
    return ctx.from?.id?.toString() === ownerId;
  }
  onModuleInit() {
    if (!this.bot) return;

    this.bot.start((ctx) => {
      ctx.reply('🎀 Telecom Bot is alive~ ✨');
    });

    this.bot.command('bind', async (ctx) => {
      if (!this.isOwner(ctx)) {
        return ctx.reply('💔 You are not allowed to use this command.');
      }

      const companies = await this.prisma.systemCompany.findMany();

      const buttons = companies.map((c) => [
        {
          text: `🏢 ${c.name}`,
          callback_data: `bind_company_${c.id}_${ctx.chat.id}`,
        },
      ]);

      await ctx.reply('💖 Select company to bind:', {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    });

    this.bot.command('myid', (ctx) => {
      ctx.reply(`💖 Your Telegram ID is: ${ctx.from.id}`);
    });

    this.bot.on('callback_query', async (ctx: any) => {
      const data = ctx.callbackQuery.data;

      if (!this.isOwner(ctx)) {
        return ctx.answerCbQuery('Not allowed 💔');
      }

      if (!data.startsWith('bind_company_')) return;

      const parts = data.split('_');
      const companyId = Number(parts[2]);
      const chatId = parts[3];

      const company = await this.prisma.systemCompany.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return ctx.answerCbQuery('Company not found 💔');
      }

      await this.prisma.telegramChat.upsert({
        where: { chatId },
        update: { systemCompanyId: companyId },
        create: {
          chatId,
          systemCompanyId: companyId,
          title: ctx.chat?.title || 'bound chat',
          type: ctx.chat?.type || 'group',
        },
      });

      await ctx.answerCbQuery(`💖 Bound to ${company.name}`);
      await ctx.reply(`✨ Chat successfully bound to ${company.name}`);
    });

    this.bot.launch()
      .then(() => this.logger.log('Telegram bot online~ 💖'))
      .catch((err) => this.logger.error('Bot launch failed', err));
  }

  // 💌 CORE: send to company
  async sendToCompany(companyId: number, message: string) {
    const chats = await this.prisma.telegramChat.findMany({
      where: {
        systemCompanyId: companyId,
        isActive: true,
      },
    });

    if (!chats.length) {
      this.logger.warn(`No Telegram chats for company ${companyId}`);
      return;
    }

    for (const chat of chats) {
      try {
        await this.bot.telegram.sendMessage(chat.chatId, message);
      } catch (err) {
        this.logger.error(`Failed chat ${chat.chatId}`, err);
      }
    }
  }

  // 📞 CALL ALERT (company routed)
  async sendCallAlert(callData: {
    callId: string;

    caller: string;
    callee: string;

    direction: 'inbound' | 'outbound';

    trunk: string;          // SIP source IP
    destinationIp: string;  // rc.dstIp

    sipMethod: string;     // INVITE, BYE, etc.

    sipCallId?: string;    // SIP Call-ID header (VERY IMPORTANT)

    userAgent?: string;    // SIP User-Agent (device info)

    systemCompanyId: number;

    didNumber?: string;    // matched DID

    timestamp: Date;
  }) {
    if (!this.bot) return;

    const message = `
📞 ${callData.direction === 'inbound' ? '📥 Inbound' : '📤 Outbound'} Call

🆔 Call ID: ${callData.callId}
📡 SIP Call-ID: ${callData.sipCallId || 'N/A'}

👤 Caller: ${callData.caller}
🎯 Callee (DID): ${callData.callee}

🏢 Company ID: ${callData.systemCompanyId}
🌐 Trunk IP: ${callData.trunk}
📍 Destination: ${callData.destinationIp}

📱 User-Agent: ${callData.userAgent || 'Unknown'}

⏰ Time: ${callData.timestamp.toISOString()}
`.trim();

    await this.sendToCompany(callData.systemCompanyId, message);
  }
}
