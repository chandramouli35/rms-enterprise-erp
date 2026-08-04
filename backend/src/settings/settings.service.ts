import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalSetting(key: string) {
    const setting = await this.prisma.globalSetting.findUnique({
      where: { key },
    });
    return { key, value: setting?.value || null };
  }

  async updateGlobalSetting(key: string, value: string) {
    const setting = await this.prisma.globalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return setting;
  }
}
