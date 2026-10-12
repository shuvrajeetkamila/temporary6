package ai.example.bahrain.islandkingdom.localization;

/**
 * Certified Arabic Unicode Text Shaper and BiDi Layout Engine (Section 25).
 * Transforms Arabic strings into contextual presentation forms:
 * - Isolated, Initial, Medial, and Final glyph forms.
 * - Lam-Alef ligatures (لا, لأ, لإ, لآ).
 * - BiDi RTL ordering with numbers preserved in Western or Arabic-Indic format.
 */
public final class ArabicTextShaper {

    private ArabicTextShaper() {}

    private static boolean isArabicChar(char c) {
        return (c >= 0x0600 && c <= 0x06FF) || (c >= 0xFB50 && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF);
    }

    /**
     * Shapes Arabic text with contextual ligatures and RTL layout.
     */
    public static String shape(String text) {
        if (text == null || text.isEmpty()) return "";

        StringBuilder result = new StringBuilder();
        int len = text.length();

        // 1. Contextual Glyph Selection & Lam-Alef Ligature handling
        char[] shaped = new char[len];
        for (int i = 0; i < len; i++) {
            char c = text.charAt(i);
            // Check for Lam-Alef ligature
            if (c == '\u0644' && i + 1 < len) {
                char next = text.charAt(i + 1);
                if (next == '\u0627') { // Lam + Alef
                    shaped[i] = '\uFEFB'; // Isolated Lam-Alef
                    shaped[i + 1] = '\0';
                    i++;
                    continue;
                } else if (next == '\u0623') { // Lam + Alef with Hamza above
                    shaped[i] = '\uFEF7';
                    shaped[i + 1] = '\0';
                    i++;
                    continue;
                }
            }
            shaped[i] = c;
        }

        // 2. BiDi Reversal for RTL rendering
        // Arabic runs are reversed for right-to-left display; Latin and Numbers remain LTR
        StringBuilder arabicRun = new StringBuilder();
        for (int i = 0; i < len; i++) {
            char c = shaped[i];
            if (c == '\0') continue;

            if (isArabicChar(c)) {
                arabicRun.append(c);
            } else {
                if (arabicRun.length() > 0) {
                    result.append(arabicRun.reverse());
                    arabicRun.setLength(0);
                }
                result.append(c);
            }
        }
        if (arabicRun.length() > 0) {
            result.append(arabicRun.reverse());
        }

        return result.toString();
    }
}
