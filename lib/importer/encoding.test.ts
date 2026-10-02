import { describe, expect, test } from "bun:test";
import { decodeImportFile } from "./encoding";

describe("decodeImportFile", () => {
  test("keeps UTF-8 emoji intact", () => {
    const text = "💰 Salary";
    const encoded = new TextEncoder().encode(text);
    expect(decodeImportFile(encoded.buffer)).toBe(text);
  });

  test("decodes UTF-16LE with a BOM", () => {
    const text = "💰 Salary";
    const le = Buffer.from(text, "utf16le");
    const bytes = new Uint8Array(2 + le.length);
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
    bytes.set(le, 2);
    expect(decodeImportFile(bytes.buffer)).toBe(text);
  });

  test("falls back to windows-1252 for invalid UTF-8", () => {
    // "Café" encoded as windows-1252 (0xe9 is é, invalid UTF-8 on its own).
    const bytes = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
    expect(decodeImportFile(bytes.buffer)).toBe("Café");
  });
});
