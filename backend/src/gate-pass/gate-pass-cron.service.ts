import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementService } from '../procurement/procurement.service';

@Injectable()
export class GatePassCronService {
  private readonly logger = new Logger(GatePassCronService.name);

  constructor(
    private prisma: PrismaService,
    private procurementService: ProcurementService,
  ) {}

  // 1. Daily 7 PM Reminder (Asia/Kolkata)
  @Cron('0 19 * * *', { timeZone: 'Asia/Kolkata' })
  async handleDailyReminder() {
    this.logger.log('Sending daily 7 PM reminder to punch Gate Pass reports.');
    await this.prisma.notification.create({
      data: {
        title: 'Daily Gate Pass Report Reminder',
        message: 'Please ensure all Gate Passes for today are finalized and the GP report is punched.',
        type: 'INFO',
        role: 'SUPERVISOR'
      }
    });
  }

  // Feedback 34 — 7:05 PM auto-submit daily shortage consolidated snapshot (IST)
  @Cron('5 19 * * *', { timeZone: 'Asia/Kolkata' })
  async handleEveningShortageSnapshot() {
    this.logger.log('Auto-submitting daily shortage consolidated report (Feedback 34).');
    try {
      const now = new Date();
      const reportDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      await this.procurementService.submitDailyShortageReport({
        date: reportDate,
        plantId: 'global',
        submittedBy: 'SYSTEM_CRON',
        source: 'CRON',
      });
      await this.prisma.notification.create({
        data: {
          title: 'Daily Shortage Report Auto-Updated',
          message: `Evening shortage consolidated report for ${reportDate} was auto-submitted.`,
          type: 'INFO',
          role: 'SUPERVISOR',
        },
      });
    } catch (e: any) {
      this.logger.error(`Evening shortage snapshot failed: ${e?.message || e}`);
    }
  }

  // 2. Escalation Alert (2 Days): If an active GP remains unclosed after 48 hours (2 days), send automated escalation reminders.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Check daily at midnight
  async checkEscalations() {
    this.logger.log('Checking for active Gate Passes older than 48 hours...');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const stalePasses = await this.prisma.gatePass.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: {
          lt: twoDaysAgo,
        },
      },
    });

    if (stalePasses.length > 0) {
      this.logger.warn(`Found ${stalePasses.length} stale active Gate Passes.`);
      for (const pass of stalePasses) {
        this.logger.warn(`[ESCALATION] Gate Pass ${pass.qrCode || pass.id} has been active for over 48 hours. Notifying Admin and Supervisor.`);
        await this.prisma.notification.create({
          data: {
            title: 'Gate Pass Escalation (48+ Hours)',
            message: `Gate Pass ${pass.qrCode || pass.vehicleNo} has been ACTIVE for over 48 hours. Please review.`,
            type: 'WARNING',
            role: 'SUPER_ADMIN'
          }
        });
        await this.prisma.notification.create({
          data: {
            title: 'Gate Pass Escalation (48+ Hours)',
            message: `Gate Pass ${pass.qrCode || pass.vehicleNo} has been ACTIVE for over 48 hours. Please review.`,
            type: 'WARNING',
            role: 'SUPERVISOR'
          }
        });
      }
    }
  }

  // 3. Transfer Ticket 48-Hour Escalation (Section 3.1)
  @Cron(CronExpression.EVERY_HOUR)
  async checkTransferTicketEscalations() {
    this.logger.log('Checking for pending Transfer Tickets older than 48 hours...');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const pendingTickets = await this.prisma.transferTicket.findMany({
      where: {
        status: 'PENDING_CONFIRMATION',
        createdAt: {
          lt: twoDaysAgo,
        },
      },
      include: {
        originalGp: true,
        dispatchPlant: true,
      }
    });

    if (pendingTickets.length > 0) {
      this.logger.warn(`Found ${pendingTickets.length} unconfirmed Transfer Tickets (48+ hours).`);
      for (const ticket of pendingTickets) {
        // Escalate status
        await this.prisma.transferTicket.update({
          where: { id: ticket.id },
          data: { status: 'ESCALATED' }
        });

        // Notify Admin
        await this.prisma.notification.create({
          data: {
            title: 'Transfer Ticket Escalation (48+ Hours)',
            message: `Transfer Ticket for GP ${ticket.originalGp?.qrCode || 'N/A'} (T) from ${ticket.dispatchPlant?.name || 'Unknown'} has been PENDING for over 48 hours. Auto-escalated to Admin.`,
            type: 'WARNING',
            role: 'SUPER_ADMIN'
          }
        });

        this.logger.warn(`[ESCALATION] Transfer Ticket ${ticket.id} escalated to Admin.`);
      }
    }
  }
}
