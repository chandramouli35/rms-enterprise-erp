import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractTemplateBase64,
  isMatchableTemplate,
  isValidPidData,
  templatesMatch,
} from '../common/fingerprint/iso-template.util';

@Injectable()
export class FingerprintVerifyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify live scan against logged-in user's enrolled fingerprints.
   * 1) If matchable ISO templates exist on both sides → true 1:1 minutiae match
   * 2) Else if user has enrolled PidData + live PidData is valid → accept for this login
   *    (Mantra L1 RD often encrypts FMR; without clear templates, true reject of wrong
   *     finger is not possible — enrollment should store templates when RD provides them)
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
    const liveIsoRaw = String(body.isoTemplate || '').trim();

    if (!live && !liveIsoRaw) {
      throw new BadRequestException(
        'Fingerprint scan required. Place finger on Mantra MFS110 and Scan.',
      );
    }

    if (live === 'ADMIN_BYPASS' || liveIsoRaw === 'ADMIN_BYPASS') {
      throw new BadRequestException(
        'Fingerprint scan is required. Admin bypass is disabled.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fingerprint1: true,
        fingerprint2: true,
        fingerprint1Template: true,
        fingerprint2Template: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const hasEnrollment = !!(
      user.fingerprint1 ||
      user.fingerprint2 ||
      user.fingerprint1Template ||
      user.fingerprint2Template
    );
    if (!hasEnrollment) {
      throw new BadRequestException(
        'No fingerprint enrolled for your login. Ask admin to register Finger 1 and Finger 2 in Users & Roles, then Scan again.',
      );
    }

    // Prefer explicit ISO from client; only parse live PidData when needed
    const liveIso =
      (liveIsoRaw && isMatchableTemplate(liveIsoRaw) ? liveIsoRaw : null) ||
      (live ? extractTemplateBase64(live) : null);

    // Match against enrolled *templates* only — never run heavy FMR extraction on
    // large encrypted PidData stored in fingerprint1/2 (that was a major slowdown).
    const galleries: string[] = [];
    for (const t of [user.fingerprint1Template, user.fingerprint2Template]) {
      if (t && isMatchableTemplate(t)) galleries.push(t);
    }
    // Rare: FMR stored directly in fingerprint fields (no XML wrapper)
    for (const fp of [user.fingerprint1, user.fingerprint2]) {
      if (fp && !fp.includes('<') && isMatchableTemplate(fp)) galleries.push(fp);
    }

    // True 1:1 when both sides have matchable FMR/ISO
    if (liveIso && galleries.length) {
      for (const gallery of galleries) {
        if (templatesMatch(liveIso, gallery)) {
          return {
            matched: true,
            biometricData: live || liveIso,
            mode: 'minutiae',
          };
        }
      }
      throw new BadRequestException('This fingerprint does not exist');
    }

    // Gallery has templates but live scan did not yield FMR
    if (galleries.length && !liveIso) {
      throw new BadRequestException(
        'This fingerprint does not exist. Keep finger steady on the sensor and Scan again.',
      );
    }

    // PidData path (typical Mantra L1 encrypted RD): valid live capture + enrolled account
    if (live && isValidPidData(live)) {
      return {
        matched: true,
        biometricData: live,
        mode: 'piddata',
      };
    }

    throw new BadRequestException(
      'This fingerprint does not exist. Place finger firmly on Mantra MFS110 and Scan again.',
    );
  }

  /** Prefer explicit ISO; else extract from PidData when possible. */
  static resolveTemplate(
    pidXml?: string | null,
    isoTemplate?: string | null,
  ): string | null {
    if (isoTemplate && isMatchableTemplate(isoTemplate)) {
      return String(isoTemplate).trim().replace(/\s+/g, '');
    }
    if (!pidXml) return null;
    const extracted = extractTemplateBase64(pidXml);
    return extracted && isMatchableTemplate(extracted) ? extracted : null;
  }
}
