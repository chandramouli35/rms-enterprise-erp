import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { YieldService } from './yield.service';

@Injectable()
export class YieldCronService {
  private readonly logger = new Logger(YieldCronService.name);

  constructor(private readonly yieldService: YieldService) {}

  /** Daily stock health surplus/minus check — notify when G < -1 (not -0.8) */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleStockHealthAlerts() {
    this.logger.log('Running daily Stock Health surplus/minus alert check...');
    try {
      const result = await this.yieldService.checkStockHealthAlerts();
      this.logger.log(
        `Stock Health check done. Mills: ${result.checked}, Alerts: ${result.alerts.length}`,
      );
    } catch (err: any) {
      this.logger.error(`Stock Health alert check failed: ${err?.message || err}`);
    }
  }

  /** Feedback 19: remind supervisors until previous-day consignment is filled */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleConsignmentReminders() {
    this.logger.log('Running Consignment Dispatch incomplete-data reminders...');
    try {
      await this.yieldService.checkConsignmentReminders();
    } catch (err: any) {
      this.logger.error(`Consignment reminder failed: ${err?.message || err}`);
    }
  }
}
