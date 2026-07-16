import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password, plantId, rememberMe } = loginDto;
    
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username },
        ]
      },
      include: {
        role: {
          include: {
            modulePermissions: true,
          },
        },
        plantAccess: {
          include: {
            plant: true,
          }
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    /*
    // Check plant access
    if (!plantId && user.role.name !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Please select a plant to continue');
    }
    
    if (plantId) {
      const hasAccess = user.plantAccess.some(access => access.plantId === plantId);
      if (!hasAccess && user.role.name !== 'SUPER_ADMIN') {
         throw new UnauthorizedException('Access denied to this plant');
      }
    }
    */

    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role.name,
      // removed permissions from JWT payload to prevent 431 errors
    };
    
    const expiry = rememberMe ? '7d' : '1d';
    const accessToken = this.jwtService.sign(payload, { expiresIn: expiry });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        refreshToken: await bcrypt.hash(refreshToken, 10),
        lastLogin: new Date()
      },
    });

    console.log('LOGIN RETURN:', user.role.name, user.role.modulePermissions);
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.role.modulePermissions,
        plantAccess: user.plantAccess,
      }
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        role: {
          include: {
            modulePermissions: true,
          }
        }
      }
    });
    
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role.name,
      // removed permissions from JWT payload to prevent 431 errors
    };
    
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(newRefreshToken, 10) },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
