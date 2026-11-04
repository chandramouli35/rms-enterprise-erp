/**
 * Temporary section-wise grouping for yard / stack maps.
 * - Stacks like A-1 / B2 → Section A / Section B
 * - Plain numbers → chunks of 8 as Section A, B, C…
 */

export type StackSectionGroup = { section: string; stacks: string[] };

export function groupStacksBySection(stackNos: string[]): StackSectionGroup[] {
  const letterGroups = new Map<string, string[]>();
  const plain: string[] = [];

  for (const raw of stackNos) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const m = s.match(/^([A-Za-z]+)[\s\-_.]*(\d+.*)$/);
    if (m) {
      const key = m[1].toUpperCase();
      if (!letterGroups.has(key)) letterGroups.set(key, []);
      letterGroups.get(key)!.push(s);
    } else {
      plain.push(s);
    }
  }

  const out: StackSectionGroup[] = [];
  for (const key of Array.from(letterGroups.keys()).sort()) {
    const stacks = letterGroups.get(key)!;
    stacks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    out.push({ section: `Section ${key}`, stacks });
  }

  if (plain.length) {
    plain.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < plain.length; i += 8) {
      const chunk = plain.slice(i, i + 8);
      const idx = Math.floor(i / 8);
      const label =
        idx < letters.length ? `Section ${letters[idx]}` : `Section ${idx + 1}`;
      out.push({ section: label, stacks: chunk });
    }
  }

  return out.length
    ? out
    : [{ section: 'Section A', stacks: stackNos.map(String) }];
}
