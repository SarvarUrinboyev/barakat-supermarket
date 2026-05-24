package uz.barakat.market.hardware;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * Builds ESC/POS byte streams for cheap thermal receipt printers
 * (Xprinter XP-58, Star TSP, Epson TM-T20 and so on — all of them
 * implement the same Epson-originated command vocabulary).
 *
 * <p>This is a fluent builder: every method returns {@code this} so the
 * caller can chain {@code init().center().bold().text(...).cut()}.
 * No external dependencies — the platform-specific output (USB / LPT /
 * Bluetooth / network) is the caller's problem; this class only knows
 * how to produce the bytes.
 *
 * <h2>Encoding</h2>
 * Most cheap printers ship with codepage 437 by default but understand
 * CP866 (Cyrillic) once we send {@code ESC t 17}. We expose
 * {@link #charset(Charset)} so callers can pick another if they know
 * the device is configured differently. Default is UTF-8 because modern
 * firmware accepts it when the codepage is left at the factory setting
 * (and the worst case is mojibake on currency symbols, not a crash).
 *
 * <p>Numbers and Latin letters always print correctly across every
 * codepage we've tested, so the receipt layout works fine even when
 * the Uzbek labels render with wrong glyphs — owners can swap labels
 * for Latin equivalents if needed.
 */
public final class EscPosBuilder {

    // --- Core control bytes ------------------------------------------
    private static final byte ESC = 0x1B;
    private static final byte GS  = 0x1D;
    private static final byte LF  = 0x0A;

    // --- Justification ----------------------------------------------
    public static final byte ALIGN_LEFT   = 0;
    public static final byte ALIGN_CENTER = 1;
    public static final byte ALIGN_RIGHT  = 2;

    private final ByteArrayOutputStream out = new ByteArrayOutputStream();
    private Charset charset = StandardCharsets.UTF_8;

    /** Reset the printer to a known clean state — call once at the top of every job. */
    public EscPosBuilder init() {
        write(ESC, '@');
        // Default to CP866 (codepage 17 in ESC/POS) for Cyrillic glyphs.
        // Devices that don't support 17 will silently ignore this and
        // fall back to their factory codepage.
        write(ESC, 't', (byte) 17);
        return this;
    }

    public EscPosBuilder charset(Charset cs) {
        this.charset = cs;
        return this;
    }

    public EscPosBuilder align(byte mode) {
        write(ESC, 'a', mode);
        return this;
    }

    public EscPosBuilder center() { return align(ALIGN_CENTER); }
    public EscPosBuilder left()   { return align(ALIGN_LEFT); }
    public EscPosBuilder right()  { return align(ALIGN_RIGHT); }

    public EscPosBuilder bold(boolean on) {
        write(ESC, 'E', (byte) (on ? 1 : 0));
        return this;
    }

    /**
     * Toggle 2x text size. Useful for shop name in the header and the
     * grand total at the bottom — everything else stays at the default
     * size so a full receipt fits a single 58 mm paper width.
     */
    public EscPosBuilder doubleSize(boolean on) {
        write(GS, '!', (byte) (on ? 0x11 : 0x00));   // width<<4 | height
        return this;
    }

    public EscPosBuilder text(String s) {
        try {
            out.write(s.getBytes(charset));
        } catch (IOException ex) {
            // ByteArrayOutputStream.write never throws — keep the
            // checked-exception ceremony out of the fluent API.
            throw new IllegalStateException(ex);
        }
        return this;
    }

    public EscPosBuilder line(String s) {
        return text(s).newline();
    }

    public EscPosBuilder newline() {
        out.write(LF);
        return this;
    }

    public EscPosBuilder feed(int lines) {
        for (int i = 0; i < lines; i++) newline();
        return this;
    }

    /** Print a horizontal rule of {@code width} ASCII dashes. */
    public EscPosBuilder ruler(int width) {
        StringBuilder b = new StringBuilder(width);
        for (int i = 0; i < width; i++) b.append('-');
        return line(b.toString());
    }

    /**
     * Two-column line: left text padded so right text sits flush against
     * the {@code totalWidth}. Truncates the left side when needed so the
     * right column always lines up — a printed receipt with a wandering
     * right edge looks unprofessional fast.
     */
    public EscPosBuilder twoCol(String leftText, String rightText, int totalWidth) {
        String r = rightText == null ? "" : rightText;
        int leftMax = Math.max(1, totalWidth - r.length() - 1);
        String l = (leftText == null ? "" : leftText);
        if (l.length() > leftMax) l = l.substring(0, leftMax);
        int gap = Math.max(1, totalWidth - l.length() - r.length());
        StringBuilder b = new StringBuilder(totalWidth);
        b.append(l);
        for (int i = 0; i < gap; i++) b.append(' ');
        b.append(r);
        return line(b.toString());
    }

    /**
     * Open the connected cash drawer via the standard 2-pin connector.
     * The pulse values (50 ms on / 250 ms off) are conservative defaults
     * that work across every drawer we've tested; some Chinese clones
     * need a wider pulse — make these configurable later if needed.
     */
    public EscPosBuilder openDrawer() {
        write(ESC, 'p', (byte) 0, (byte) 50, (byte) 250);
        return this;
    }

    /**
     * Feed three lines and cut. The feed is required because the paper
     * blade sits above the print head — without it the last visible row
     * gets sliced through the middle.
     */
    public EscPosBuilder cut() {
        feed(3);
        write(GS, 'V', (byte) 0);   // 0 = full cut, 1 = partial
        return this;
    }

    public byte[] toBytes() {
        return out.toByteArray();
    }

    // ------------------------------------------------------------ private

    private void write(int... bytes) {
        for (int b : bytes) out.write((byte) b);
    }
}
