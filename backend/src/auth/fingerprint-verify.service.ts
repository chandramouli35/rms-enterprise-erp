import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractTemplateBase64,
  parseIso19794Minutiae,
  templatesMatch,
} from '../common/fingerprint/iso-template.util';

const ADMIN_BYPASS_ROLES =
  /SUPER_ADMIN|SUPERADMIN|PLANT_MANAGER|ADMIN|ADMINISTRATOR/i;

function isValidLivePid(xml: string): boolean {
  if (!xml || xml === 'ADMIN_BYPASS') return xml === 'ADMIN_BYPASS';
  if (!/<PidData[\s>]/i.test(xml)) return false;
  const codes = [...xml.matchAll(/errCode\s*=\s*["']([^"']+)["']/gi)].map((m) =>
    m[1].trim(),
  );
  return !!codes.length && codes.every((c) => c === '0');
}

@Injectable()
export class FingerprintVerifyService {
  constructor(private readonly prisma: PrismaService) {}

  isAdminRole(roleName?: string | null): boolean {
    return !!roleName && ADMIN_BYPASS_ROLES.test(String(roleName));
  }

  /**
   * Verify live scan against the logged-in user's enrolled finger(s).
   * - If matchable ISO/FMR templates exist → true 1:1 minutiae match
   * - Else if PidData enrolled → require enrollment + valid live capture
   *   (Mantra L1 RD encrypts <Data>, so finger minutiae are not available)
   */
  async verifyForUser(
    userId: string,
    body: {
      biometricData?: string;
      isoTemplate?: string;
      roleName?: string;
    },
  ): Promise<{ matched: true; biometricData: string; mode: string }> {
    const live = String(body.biometricData || '').trim();
    const liveIso = String(body.isoTemplate || '').trim() || undefined;

    if (!live && !liveIso) {
      throw new BadRequestException(
        'Fingerprint scan required. Place finger on Mantra MFS110 and Scan.',
      );
    }

    if (live === 'ADMIN_BYPASS' || liveIso === 'ADMIN_BYPASS') {
      if (this.isAdminRole(body.roleName)) {
        return { matched: true, biometricData: 'ADMIN_BYPASS', mode: 'admin' };
      }
      throw new UnauthorizedException('Admin bypass not allowed for this role.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fingerprint1: true,
        fingerprint2: true,
        fingerprint1Template: true,
        fingerprint2Template: true,
        role: { select: { name: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const roleName = body.roleName || user.role?.name;
    if (this.isAdminRole(roleName) && (!live || live === 'ADMIN_BYPASS')) {
      return {
        matched: true,
        biometricData: live || 'ADMIN_BYPASS',
        mode: 'admin',
      };
    }

    const enrolledPid = !!(user.fingerprint1 || user.fingerprint2);
    if (!enrolledPid && !user.fingerprint1Template && !user.fingerprint2Template) {
      throw new BadRequestException(
        'No fingerprint enrolled for your login. Ask admin to register your fingerprints in Users & Roles (two scans), then try again.',
      );
    }

    if (live && live !== 'ADMIN_BYPASS' && !isValidLivePid(live) && !liveIso) {
      throw new BadRequestException(
        'Invalid fingerprint capture. Place finger firmly on Mantra MFS110 and Scan again.',
      );
    }

    const galleryCandidates = [
      user.fingerprint1Template,
      user.fingerprint2Template,
      user.fingerprint1,
      user.fingerprint2,
    ].filter(Boolean) as string[];

    const matchableGalleries = galleryCandidates.filter((g) => {
      const b64 = extractTemplateBase64(g);
      return b64 && parseIso19794Minutiae(b64).length >= 4;
    });

    const probes = [liveIso, live].filter(Boolean) as string[];
    const matchableProbes = probes.filter((p) => {
      const b64 = extractTemplateBase64(p);
      return b64 && parseIso19794Minutiae(b64).length >= 4;
    });

    // True 1:1 when both sides have matchable FMR/ISO
    if (matchableGalleries.length && matchableProbes.length) {
      for (const probe of matchableProbes) {
        for (const gallery of matchableGalleries) {
          if (templatesMatch(probe, gallery)) {
            return {
              matched: true,
              biometricData: live || probe,
              mode: 'minutiae',
            };
          }
        }
      }
      throw new BadRequestException('Fingerprint not matched');
    }

    // Gallery has matchable templates but live scan did not yield FMR
    if (matchableGalleries.length && !matchableProbes.length) {
      throw new BadRequestException(
        'Fingerprint not matched. Could not read matchable template from this scan — keep finger steady and Scan again.',
      );
    }

    // PidData-only enrollment (typical Mantra L1 encrypted RD): prove presence
    // for the logged-in enrolled user. Re-enroll later enables full minutiae match.
    return {
      matched: true,
      biometricData: live || liveIso || '',
      mode: 'enrolled-presence',
    };
  }

  /** Prefer explicit ISO; else extract from PidData when possible. */
  static resolveTemplate(
    pidXml?: string | null,
    isoTemplate?: string | null,
  ): string | null {
    if (isoTemplate && String(isoTemplate).trim().length >= 64) {
      return String(isoTemplate).trim().replace(/\s+/g, '');
    }
    if (!pidXml) return null;
    return extractTemplateBase64(pidXml);
  }
}
