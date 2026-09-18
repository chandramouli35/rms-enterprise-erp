from pathlib import Path
import re

p = Path(r"frontend/src/pages/ProcurementManagement.tsx")
text = p.read_text(encoding="utf-8")

# Revert the 3 inward-scan ADMIN_BYPASS blocks I added; keep paddy-purchase bypass as it was.

# Pattern 1 & 2: supervisor stamps with ADMIN_BYPASS
supervisor_bypass = re.compile(
    r"""\} catch \(e: any\) \{
                                if \(
                                  user\?\.role === "SUPER_ADMIN" \|\|
                                  user\?\.role === "PLANT_MANAGER"
                                \) \{
                                  setInwardFormData\(\(p: any\) =>
                                    applySupervisorFingerprintStamps\(
                                      p,
                                      "ADMIN_BYPASS",
                                    \),
                                  \);
                                  useUiStore
                                    \.getState\(\)
                                    \.addToast\(
                                      "Admin bypass fingerprint \(scanner unavailable\)",
                                      "success",
                                    \);
                                \} else \{
                                  useUiStore
                                    \.getState\(\)
                                    \.addToast\(e\.message, "error"\);
                                \}
                              \}""",
    re.MULTILINE,
)

supervisor_bypass2 = re.compile(
    r"""\} catch \(e: any\) \{
                                  if \(
                                    user\?\.role === "SUPER_ADMIN" \|\|
                                    user\?\.role === "PLANT_MANAGER"
                                  \) \{
                                    setInwardFormData\(\(p: any\) =>
                                      applySupervisorFingerprintStamps\(
                                        p,
                                        "ADMIN_BYPASS",
                                      \),
                                    \);
                                    useUiStore
                                      \.getState\(\)
                                      \.addToast\(
                                        "Admin bypass fingerprint \(scanner unavailable\)",
                                        "success",
                                      \);
                                  \} else \{
                                    useUiStore
                                      \.getState\(\)
                                      \.addToast\(e\.message, "error"\);
                                  \}
                                \}""",
    re.MULTILINE,
)

head_bypass = re.compile(
    r"""\} catch \(e: any\) \{
                                    if \(
                                      user\?\.role === "SUPER_ADMIN" \|\|
                                      user\?\.role === "PLANT_MANAGER"
                                    \) \{
                                      setInwardFormData\(\(p: any\) => \(\{
                                        \.\.\.p,
                                        headBiometricData: "ADMIN_BYPASS",
                                      \}\)\);
                                      useUiStore
                                        \.getState\(\)
                                        \.addToast\(
                                          "Admin bypass fingerprint \(scanner unavailable\)",
                                          "success",
                                        \);
                                    \} else \{
                                      useUiStore
                                        \.getState\(\)
                                        \.addToast\(e\.message, "error"\);
                                    \}
                                  \}""",
    re.MULTILINE,
)

simple1 = """} catch (e: any) {
                                useUiStore
                                  .getState()
                                  .addToast(e.message, "error");
                              }"""

simple2 = """} catch (e: any) {
                                  useUiStore
                                    .getState()
                                    .addToast(e.message, "error");
                                }"""

simple3 = """} catch (e: any) {
                                    useUiStore
                                      .getState()
                                      .addToast(e.message, "error");
                                  }"""

orig = text
text, n1 = supervisor_bypass.subn(simple1, text)
text, n2 = supervisor_bypass2.subn(simple2, text)
text, n3 = head_bypass.subn(simple3, text)

print(f"reverted: tare/supervisor1={n1}, supervisor2={n2}, head={n3}")
print(f"ADMIN_BYPASS remaining: {text.count('ADMIN_BYPASS')}")

if text == orig:
    print("WARNING: no changes applied")
else:
    p.write_text(text, encoding="utf-8")
    print("written ok")
