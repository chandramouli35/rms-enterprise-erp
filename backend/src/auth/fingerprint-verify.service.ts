import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isMatchableTemplate,
  templatesMatch,
} from '../common/fingerprint/iso-template.util';

@Injectable()
export class FingerprintVerifyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Strict 1:1 only. No admin bypass, no "scan happened" pass.
   * Wrong finger or missing template → error.
   */
  async verifyForUser(
    userId: string,
    body: {
      biometricData?: string;
      isoTemplate?: string;
      roleName?: string;
    },
  ): Promise<{ matched: true; biometricData: string; mode: 'minutiae' }> {
    const live = String(body.biometricData || '').trim();
    const liveIso = String(body.isoTemplate || '').trim();

    if (live === 'ADMIN_BYPASS' || liveIso === 'ADMIN_BYPASS') {
      throw new BadRequestException(
        'Fingerprint not matched. A real finger scan is required.',
      );
    }

    if (!liveIso || !isMatchableTemplate(liveIso)) {
      throw new BadRequestException(
        'Fingerprint not matched. Scanner did not return a matchable fingerprint template. Scan again with Mantra READY.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fingerprint1Template: true,
        fingerprint2Template: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const galleries = [user.fingerprint1Template, user.fingerprint2Template].filter(
      (g): g is string => !!g && isMatchableTemplate(g),
    );

    if (!galleries.length) {
      throw new BadRequestException(
        'No matchable fingerprints enrolled for your login. Ask admin to re-enroll Finger 1 and Finger 2 in Users & Roles, then Scan again.',
      );
    }

    for (const gallery of galleries) {
      if (templatesMatch(liveIso, gallery)) {
        return {
          matched: true,
          biometricData: live || liveIso,
          mode: 'minutiae',
        };
      }
    }

    throw new BadRequestException('Fingerprint not matched');
  }

  /** Store only a real ISO/FMR template. Encrypted PidData is not stored as a template. */
  static resolveTemplate(
    _pidXml?: string | null,
    isoTemplate?: string | null,
  ): string | null {
    const cleaned = String(isoTemplate || '').trim().replace(/\s+/g, '');
    if (!cleaned || !isMatchableTemplate(cleaned)) return null;
    return cleaned;
  }
}
