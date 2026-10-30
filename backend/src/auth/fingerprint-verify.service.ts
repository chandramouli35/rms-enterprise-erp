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
        'Fingerprint scan required. Place finger on Mantra MFS500 and Scan.',
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
      throw new BadRequestException(
        await this.mismatchMessage(liveIso, live),
      );
    }

    // Gallery has templates but live scan did not yield FMR
    if (galleries.length && !liveIso) {
      throw new BadRequestException(
        'Fingerprint could not be read. Keep your finger steady on the sensor and Scan again.',
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
      'Fingerprint could not be read. Place your finger firmly on the sensor and Scan again.',
    );
  }

  /**
   * Logged-in user's fingers did not match.
   * "does not match" = this scan belongs to someone else (or not this login).
   * "does not exist" = this scan is not stored on any user.
   */
  private async mismatchMessage(liveIso: string | null, livePid: string) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        fingerprint1: true,
        fingerprint2: true,
        fingerprint1Template: true,
        fingerprint2Template: true,
      },
    });
    const found = users.some((u) => this.enrollmentRowMatches(u, liveIso, livePid));
    if (found) {
      return 'Fingerprint does not match the logged-in user';
    }
    return 'This fingerprint does not exist';
  }

  /**
   * Enrollment: reject a finger that is already registered (same form slot or another person).
   * Does not update/overwrite existing fingerprints.
   */
  async assertFingerprintNotAlreadyRegistered(opts: {
    biometricData?: string | null;
    isoTemplate?: string | null;
    otherIsoTemplates?: Array<string | null | undefined>;
    otherPidData?: Array<string | null | undefined>;
    excludeUserId?: string;
    excludeStaffId?: string;
  }): Promise<void> {
    const already = 'This fingerprint is already registered';
    const placeAnother =
      'Place another finger. Scan a different finger for Finger 1 and Finger 2.';
    const livePid = String(opts.biometricData || '').trim();
    const liveIso = FingerprintVerifyService.resolveTemplate(
      livePid || null,
      opts.isoTemplate || null,
    );
    if (!livePid && !liveIso) return;

    const otherIsos = (opts.otherIsoTemplates || []).filter(
      (t): t is string => !!t && isMatchableTemplate(t),
    );
    for (const other of otherIsos) {
      if (liveIso && templatesMatch(liveIso, other, true)) {
        throw new BadRequestException(placeAnother);
      }
    }
    for (const otherPid of opts.otherPidData || []) {
      const pid = String(otherPid || '').trim();
      if (!pid) continue;
      if (livePid && pid === livePid) {
        throw new BadRequestException(placeAnother);
      }
      const otherIso = extractTemplateBase64(pid);
      if (liveIso && otherIso && templatesMatch(liveIso, otherIso, true)) {
        throw new BadRequestException(placeAnother);
      }
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
      },
      select: {
        fingerprint1: true,
        fingerprint2: true,
        fingerprint1Template: true,
        fingerprint2Template: true,
      },
    });
    for (const u of users) {
      if (this.enrollmentRowMatches(u, liveIso, livePid)) {
        throw new BadRequestException(already);
      }
    }

    const staff = await this.prisma.staffMaster.findMany({
      where: opts.excludeStaffId
        ? { id: { not: opts.excludeStaffId } }
        : undefined,
      select: { fingerprint1: true, fingerprint2: true },
    });
    for (const s of staff) {
      if (
        this.enrollmentRowMatches(
          {
            fingerprint1: s.fingerprint1,
            fingerprint2: s.fingerprint2,
            fingerprint1Template: null,
            fingerprint2Template: null,
          },
          liveIso,
          livePid,
        )
      ) {
        throw new BadRequestException(already);
      }
    }
  }

  async assertEnrollmentPairNotDuplicate(
    fingerprint1?: string | null,
    tpl1?: string | null,
    fingerprint2?: string | null,
    tpl2?: string | null,
    excludeUserId?: string,
  ) {
    if (fingerprint1) {
      await this.assertFingerprintNotAlreadyRegistered({
        biometricData: fingerprint1,
        isoTemplate: tpl1,
        excludeUserId,
      });
    }
    if (fingerprint2) {
      await this.assertFingerprintNotAlreadyRegistered({
        biometricData: fingerprint2,
        isoTemplate: tpl2,
        otherIsoTemplates: tpl1 ? [tpl1] : [],
        otherPidData: fingerprint1 ? [fingerprint1] : [],
        excludeUserId,
      });
    }
  }

  private enrollmentRowMatches(
    row: {
      fingerprint1?: string | null;
      fingerprint2?: string | null;
      fingerprint1Template?: string | null;
      fingerprint2Template?: string | null;
    },
    liveIso: string | null,
    livePid: string,
  ) {
    const templates = [
      row.fingerprint1Template,
      row.fingerprint2Template,
    ].filter((t): t is string => !!t && isMatchableTemplate(t));
    if (liveIso) {
      for (const t of templates) {
        if (templatesMatch(liveIso, t)) return true;
      }
    }
    for (const fp of [row.fingerprint1, row.fingerprint2]) {
      if (!fp) continue;
      if (livePid && fp === livePid) return true;
      if (
        liveIso &&
        !fp.includes('<') &&
        isMatchableTemplate(fp) &&
        templatesMatch(liveIso, fp)
      ) {
        return true;
      }
      if (liveIso) {
        const iso = extractTemplateBase64(fp);
        if (iso && templatesMatch(liveIso, iso)) return true;
      }
    }
    return false;
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
