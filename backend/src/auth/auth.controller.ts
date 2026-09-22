import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FingerprintVerifyService } from './fingerprint-verify.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly fingerprintVerify: FingerprintVerifyService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshTokens(@Req() req: Request) {
    const user = req.user as any;
    const userId = user?.sub;
    const refreshToken = req.body['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;
    const user = await this.authService['prisma'].user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            modulePermissions: true,
          },
        },
      },
    });
    return user;
  }

  /**
   * 1:1 verify live Mantra scan against the logged-in user's enrolled fingerprints.
   * Forms call this on Scan — returns error "This fingerprint does not exist" when verify fails.
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify-fingerprint')
  async verifyFingerprint(
    @Req() req: Request,
    @Body()
    body: { biometricData?: string; isoTemplate?: string },
  ) {
    const user = req.user as any;
    const userId = user?.id || user?.sub;
    return this.fingerprintVerify.verifyForUser(userId, {
      biometricData: body?.biometricData,
      isoTemplate: body?.isoTemplate,
      roleName: user?.role?.name || user?.role,
    });
  }

  /** Whether the logged-in user has enrolled fingerprints (for UI hints). */
  @UseGuards(JwtAuthGuard)
  @Get('my-fingerprint-status')
  async myFingerprintStatus(@Req() req: Request) {
    const userId = (req.user as any)?.id || (req.user as any)?.sub;
    const user = await this.authService['prisma'].user.findUnique({
      where: { id: userId },
      select: {
        fingerprint1: true,
        fingerprint2: true,
        fingerprint1Template: true,
        fingerprint2Template: true,
      },
    });
    const enrolled = !!(user?.fingerprint1 || user?.fingerprint2);
    const matchReady = !!(
      user?.fingerprint1Template ||
      user?.fingerprint2Template
    );
    return { enrolled, matchReady };
  }

  @Get('test-permissions')
  async testPermissions() {
    const user = await this.authService['prisma'].user.findFirst({
      where: { email: 'cm@yopmail.com' },
      include: {
        role: {
          include: {
            modulePermissions: true,
          },
        },
      },
    });
    return user?.role?.modulePermissions;
  }
}
