import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlantContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const plantId = request.headers['x-plant-id'];

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!plantId) {
      throw new ForbiddenException('Missing x-plant-id header');
    }

    // Super Admin has access to all plants
    if (user.role?.name === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has access to the specific plant
    const access = await this.prisma.userPlantAccess.findUnique({
      where: {
        userId_plantId: {
          userId: user.id,
          plantId: plantId,
        }
      }
    });

    if (!access) {
      throw new ForbiddenException(`User does not have access to plant ${plantId}`);
    }

    return true;
  }
}
