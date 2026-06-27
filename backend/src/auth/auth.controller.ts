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

  @Get('plants')
  async getPublicPlants() {
    return this.authService.getPublicPlants();
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshTokens(@Req() req: Request) {
    const user = req.user as any;
    const userId = user?.sub;
    const refreshToken = req.body['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
