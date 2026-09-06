import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GatePassCronService {
  private readonly logger = new Logger(GatePassCronService.name);

  constructor(private prisma: PrismaService) {}

  // 1. Daily 7 PM Reminder: Schedule an automated reminder notification for supervisors
  @Cron('0 19 * * *') // Every day at 7 PM
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
      }
    }
  }
}
