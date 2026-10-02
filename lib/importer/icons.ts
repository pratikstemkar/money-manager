/**
 * Money Manager stores each category/account icon using its own icon font.
 * When exporting, those glyphs come out as private-use codepoints in the
 * U+F000–U+FAFF range, where the real emoji is `codepoint + 0x10000`:
 *
 *   U+F4B0 -> U+1F4B0 💰     U+F6CD -> U+1F6CD 🛍️
 *   U+F696 -> U+1F696 🚖     U+F9D8 -> U+1F9D8 🧘
 *
 * Variation selectors (U+FE0F) and skin-tone modifiers (also encoded as
 * U+F3FB/U+F3FC…) are decoded the same way.
 */
const ICON_START = 0xf000;
const ICON_END = 0xfaff;
const EMOJI_PLANE_OFFSET = 0x10000;

export function decodeMoneyManagerIcons(value: string): string {
  if (!value) return value;

  let mapped = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint == null) continue;
    mapped +=
      codePoint >= ICON_START && codePoint <= ICON_END
        ? String.fromCodePoint(codePoint + EMOJI_PLANE_OFFSET)
        : character;
  }

  return mapped
    // "💡Rent" -> "💡 Rent" (icon directly followed by text).
    .replace(/(\p{Extended_Pictographic})(?=[\p{L}\p{N}])/gu, "$1 ")
    // Collapse any run of spaces after an icon down to one.
    .replace(/(\p{Extended_Pictographic})[ \t]+/gu, "$1 ")
    .trim();
}
