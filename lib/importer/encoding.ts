/**
 * Decodes an imported file's bytes into text while preserving emoji and other
 * non-ASCII characters.
 *
 * Money Manager exports can be UTF-8, UTF-16 (common from Excel on Windows),
 * or a legacy single-byte encoding. `File.text()` always assumes UTF-8, which
 * mangles multi-byte characters (especially emoji) in the other cases. We
 * detect the BOM and fall back gracefully.
 */
export function decodeImportFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  try {
    // Strict mode throws on invalid UTF-8, so we only trust it when the whole
    // file is valid UTF-8 (which keeps emoji intact).
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
