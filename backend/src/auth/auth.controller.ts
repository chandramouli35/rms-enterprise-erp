import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
