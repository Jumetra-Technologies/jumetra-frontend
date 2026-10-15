import { describe, expect, it } from "vitest";
import { HARDWARE_ASSETS, getHardwareAssetOrFallback, getPinById } from "@/lib/hardware/registry";
import { inferWireProtocol, signalColor } from "@/lib/hardware/signal-colors";
import { zoomDetailLevel } from "@/lib/hardware/types";

describe("Hardware asset registry", () => {
  it("includes 20 realistic component models", () => {
    expect(Object.keys(HARDWARE_ASSETS).length).toBe(20);
    expect(HARDWARE_ASSETS.esp32.metadata.name).toContain("ESP32");
    expect(HARDWARE_ASSETS["arduino-uno"].metadata.name).toContain("Arduino");
  });

  it("defines individual pins with interfaces", () => {
    const esp = HARDWARE_ASSETS.esp32;
    const d2 = getPinById(esp, "D2");
    expect(d2?.name).toBe("GPIO2");
    expect(d2?.interfaces).toContain("gpio");
    expect(d2?.interfaces).toContain("i2c");
  });

  it("falls back for unknown components", () => {
    const fb = getHardwareAssetOrFallback("unknown-widget");
    expect(fb.pins.length).toBeGreaterThanOrEqual(2);
  });

  it("infers wire protocol from pin interfaces", () => {
    expect(inferWireProtocol(["i2c", "gpio"], ["i2c"])).toBe("i2c");
    expect(inferWireProtocol(["digital"], ["digital"])).toBe("digital");
  });

  it("maps signal colors by protocol", () => {
    expect(signalColor("i2c")).toBe("#7C3AED");
    expect(signalColor("power")).toBe("#EF4444");
  });

  it("selects zoom detail level", () => {
    expect(zoomDetailLevel(0.4)).toBe("outline");
    expect(zoomDetailLevel(0.8)).toBe("labels");
    expect(zoomDetailLevel(1.2)).toBe("silkscreen");
  });
});

describe("Hardware asset files", () => {
  const ids = ["esp32", "led", "breadboard", "dht11"];

  for (const id of ids) {
    it(`has on-disk asset bundle for ${id}`, async () => {
      const meta = await import(`@/assets/components/${id}/metadata.json`);
      const pins = await import(`@/assets/components/${id}/pins.json`);
      const anims = await import(`@/assets/components/${id}/animations.json`);
      expect(meta.default.id).toBe(id);
      expect(Array.isArray(pins.default.pins)).toBe(true);
      expect(Array.isArray(anims.default.animations)).toBe(true);
    });
  }
});
