import { describe, expect, it } from "vitest";
import { codeFileNameProblem, defaultCode, DEFAULT_SKETCH_NAME, MAX_CODE_FILES, sanitizeCode } from "../src/lab/code";
import { parseSessionFile, toSessionFile } from "../src/lab/session-file";
import { newSession } from "../src/lab/session";

describe("a session's code (WP-D3)", () => {
  it("starts as Blink on the built-in LED", () => {
    const code = defaultCode();
    expect(code.active).toBe(DEFAULT_SKETCH_NAME);
    expect(code.files[0].content).toContain("digitalWrite(LED_BUILTIN, HIGH)");
  });

  it("keeps a well-formed sketch and drops what the compile service wouldn't accept, file by file", () => {
    expect(sanitizeCode(null)).toBeUndefined();
    expect(sanitizeCode({ files: "x" })).toBeUndefined();
    expect(sanitizeCode({ files: [{ path: "../x.ino", content: "" }] })).toBeUndefined();
    const clean = sanitizeCode({
      active: "gone.h",
      files: [
        { path: "Blink.ino", content: "void setup(){} void loop(){}" },
        { path: "Second.ino", content: "" }, // one .ino only
        { path: "motor.h", content: "int speed;" },
        { path: "MOTOR.h", content: "" }, // same name, other case
        { path: "src/x.h", content: "" }, // no folders
        { path: "notes.txt", content: "" }, // not a sketch file
        { path: "pins.h", content: 7 },
      ],
    });
    expect(clean).toEqual({ active: "Blink.ino", files: [{ path: "Blink.ino", content: "void setup(){} void loop(){}" }, { path: "motor.h", content: "int speed;" }] });
    const many = sanitizeCode({ files: Array.from({ length: 30 }, (_, i) => ({ path: `f${i}.h`, content: "" })) });
    expect(many?.files.length).toBe(MAX_CODE_FILES);
  });

  it("says why a new file name can't be used", () => {
    const files = defaultCode().files;
    expect(codeFileNameProblem("motor.h", files)).toBeNull();
    expect(codeFileNameProblem("Motor Driver.h", files)).toMatch(/letters, digits/);
    expect(codeFileNameProblem("sketch.ino", files)).toMatch(/already a file/);
    expect(codeFileNameProblem("other.ino", files)).toMatch(/one .ino file/);
  });

  it("travels in a session file, and a file without code still opens", () => {
    const session = { ...newSession({ name: "With code" }), code: defaultCode() };
    const back = parseSessionFile(JSON.stringify(toSessionFile(session))).session;
    expect(back.code).toEqual(session.code);
    const plain = parseSessionFile(JSON.stringify(toSessionFile(newSession({ name: "Plain" })))).session;
    expect(plain.code).toBeUndefined();
  });
});
