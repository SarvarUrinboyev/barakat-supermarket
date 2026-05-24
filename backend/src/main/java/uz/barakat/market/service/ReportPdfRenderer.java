package uz.barakat.market.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * Helpers for rendering branded PDF reports.
 *
 * <p>OpenPDF is a tag soup compared to modern HTML, but it has zero
 * runtime dependencies, runs in the same JVM as the rest of Spring,
 * and produces deterministic output that prints cleanly on thermal
 * printers. Every public render method returns the raw bytes — the
 * controller layer wraps them in a {@code byte[]} response with the
 * right {@code Content-Disposition} header.
 *
 * <h2>Brand</h2>
 * Header bar uses the v1.10 brand gradient (deep blue → bright blue)
 * with a brand-green accent for totals so a printed report visually
 * matches the desktop UI.
 */
@Component
public class ReportPdfRenderer {

    /** Brand colors mirroring frontend/src/styles/index.css. */
    private static final Color BRAND_DARK   = new Color(0x1e, 0x3a, 0x8a);
    private static final Color BRAND_LIGHT  = new Color(0x3b, 0x82, 0xf6);
    private static final Color BRAND_GREEN  = new Color(0x22, 0xc5, 0x5e);
    private static final Color GREY_TEXT    = new Color(0x6b, 0x72, 0x80);
    private static final Color ROW_BG_ALT   = new Color(0xf8, 0xfa, 0xfc);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /** Sales summary for a date range. */
    public byte[] renderSalesReport(SalesReportInput input) {
        return renderTable(
                "SAVDO HISOBOTI",
                input.subtitle(),
                new String[] { "Sana", "Tovarlar", "Naqd", "Karta", "Jami" },
                input.rows(),
                row -> new String[] {
                        row.date().format(DATE_FMT),
                        String.valueOf(row.itemCount()),
                        money(row.cash()),
                        money(row.card()),
                        money(row.total()),
                },
                /* totals */ new String[] {
                        "JAMI", String.valueOf(input.totalItems()),
                        money(input.totalCash()), money(input.totalCard()),
                        money(input.totalRevenue()),
                });
    }

    /** Current inventory snapshot, sorted alphabetically. */
    public byte[] renderInventoryReport(String shopLabel, List<InventoryRow> rows) {
        BigDecimal totalValue = rows.stream()
                .map(r -> r.salePrice().multiply(r.stockQty()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalSku = rows.size();
        int outOfStock = (int) rows.stream()
                .filter(r -> r.stockQty().signum() <= 0).count();
        return renderTable(
                "OMBOR HISOBOTI",
                shopLabel + " · " + LocalDate.now().format(DATE_FMT)
                        + " · " + totalSku + " ta nom · "
                        + outOfStock + " ta tugagan",
                new String[] { "Nomi", "Barcode", "Birlik", "Qoldiq", "Narx", "Qiymat" },
                rows,
                r -> new String[] {
                        r.name(),
                        nullToDash(r.barcode()),
                        nullToDash(r.unit()),
                        r.stockQty().toPlainString(),
                        money(r.salePrice()),
                        money(r.salePrice().multiply(r.stockQty())),
                },
                new String[] { "JAMI", "", "", "", "", money(totalValue) });
    }

    /** One customer's full ledger. */
    public byte[] renderCustomerLedger(String customerName, String phone,
                                       BigDecimal openingBalance,
                                       List<LedgerRow> rows,
                                       BigDecimal closingBalance) {
        String subtitle = (phone == null ? "" : phone + " · ")
                + LocalDate.now().format(DATE_FMT)
                + " · Boshlang'ich qoldiq: " + money(openingBalance);
        return renderTable(
                "MIJOZ TARIXI — " + customerName.toUpperCase(),
                subtitle,
                new String[] { "Sana", "Turi", "Tovar / Izoh", "Summa", "Qoldiq" },
                rows,
                r -> new String[] {
                        r.date().format(DATE_FMT),
                        r.type(),
                        r.description(),
                        money(r.amount()),
                        money(r.runningBalance()),
                },
                new String[] { "YAKUNIY QOLDIQ", "", "", "", money(closingBalance) });
    }

    // ============================================================ DTOs

    public record SalesReportInput(String subtitle, List<SalesRow> rows,
                                   int totalItems, BigDecimal totalCash,
                                   BigDecimal totalCard, BigDecimal totalRevenue) { }

    public record SalesRow(LocalDate date, int itemCount,
                           BigDecimal cash, BigDecimal card, BigDecimal total) { }

    public record InventoryRow(String name, String barcode, String unit,
                               BigDecimal stockQty, BigDecimal salePrice) { }

    public record LedgerRow(LocalDate date, String type, String description,
                            BigDecimal amount, BigDecimal runningBalance) { }

    // ============================================================ engine

    /**
     * Generic table renderer used by all three reports. Headers, alt
     * row banding, totals row and footer with timestamp are all baked
     * in so the individual reports stay focused on data shape.
     */
    private <T> byte[] renderTable(String title, String subtitle,
                                   String[] headers, List<T> rows,
                                   Function<T, String[]> cellsFor,
                                   String[] totalsRow) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // A4 landscape — wider, fits 6+ columns at a comfortable font size.
            Rectangle page = headers.length >= 5
                    ? PageSize.A4.rotate() : PageSize.A4;
            Document doc = new Document(page, 36, 36, 80, 36);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new HeaderFooter(title, subtitle));
            doc.open();

            // Spacer below the banded header rendered by HeaderFooter.
            doc.add(spacer(8f));

            PdfPTable table = new PdfPTable(headers.length);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);

            Font headFont = boldFont(10, Color.WHITE);
            for (String h : headers) {
                PdfPCell c = new PdfPCell(new Phrase(h, headFont));
                c.setBackgroundColor(BRAND_DARK);
                c.setHorizontalAlignment(Element.ALIGN_LEFT);
                c.setPadding(7);
                c.setBorderColor(BRAND_DARK);
                table.addCell(c);
            }

            Font cellFont = baseFont(10, Color.BLACK);
            for (int i = 0; i < rows.size(); i++) {
                String[] cells = cellsFor.apply(rows.get(i));
                boolean alt = (i % 2 == 1);
                for (int j = 0; j < cells.length; j++) {
                    PdfPCell c = new PdfPCell(new Phrase(cells[j], cellFont));
                    c.setPadding(6);
                    c.setBorderColor(new Color(0xe5, 0xe7, 0xeb));
                    if (alt) c.setBackgroundColor(ROW_BG_ALT);
                    // Right-align numeric-looking columns (last 2-3 cols typically).
                    if (j >= cells.length - 3 && cells[j].matches("^-?[\\d., ]+$")) {
                        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    }
                    table.addCell(c);
                }
            }

            if (totalsRow != null) {
                Font totalFont = boldFont(11, Color.WHITE);
                for (int j = 0; j < totalsRow.length; j++) {
                    PdfPCell c = new PdfPCell(new Phrase(totalsRow[j], totalFont));
                    c.setBackgroundColor(BRAND_GREEN);
                    c.setBorderColor(BRAND_GREEN);
                    c.setPadding(8);
                    if (j >= totalsRow.length - 3) {
                        c.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    }
                    table.addCell(c);
                }
            }

            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("PDF render failed", ex);
        }
    }

    private static Paragraph spacer(float leading) {
        Paragraph p = new Paragraph(" ");
        p.setLeading(leading);
        return p;
    }

    private static Font baseFont(int size, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, size, Font.NORMAL, color);
    }

    private static Font boldFont(int size, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA_BOLD, size, Font.BOLD, color);
    }

    /** Print money with thousand separators and 2 decimals (Uzbek convention). */
    private static String money(BigDecimal v) {
        if (v == null) return "—";
        return String.format("%,.2f", v).replace(',', ' ').replace('.', ',');
    }

    private static String nullToDash(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }

    /**
     * Branded header on every page + footer with page number and timestamp.
     * Painted via the PdfWriter page event so multi-page reports stay
     * consistent without us having to track page state manually.
     */
    private static final class HeaderFooter
            extends com.lowagie.text.pdf.PdfPageEventHelper {

        private final String title;
        private final String subtitle;

        HeaderFooter(String title, String subtitle) {
            this.title = title;
            this.subtitle = subtitle == null ? "" : subtitle;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document doc) {
            // Wrap in try/catch — PdfPageEventHelper doesn't declare
            // checked exceptions but BaseFont.createFont throws IOException
            // for the built-in Helvetica families. The fallback (no header
            // band) is ugly but won't crash the report.
            try {
                paintHeaderFooter(writer, doc);
            } catch (Exception ignored) {
                /* keep going — the table body is already on the page */
            }
        }

        private void paintHeaderFooter(PdfWriter writer, Document doc) throws Exception {
            com.lowagie.text.pdf.PdfContentByte cb = writer.getDirectContent();
            Rectangle page = doc.getPageSize();

            // Banded header bar
            cb.saveState();
            cb.setColorFill(BRAND_DARK);
            cb.rectangle(0, page.getTop() - 50, page.getWidth(), 50);
            cb.fill();
            cb.setColorFill(BRAND_GREEN);
            cb.rectangle(0, page.getTop() - 53, page.getWidth(), 3);
            cb.fill();
            cb.restoreState();

            com.lowagie.text.pdf.BaseFont bold = com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.HELVETICA_BOLD,
                    com.lowagie.text.pdf.BaseFont.WINANSI, false);
            com.lowagie.text.pdf.BaseFont plain = com.lowagie.text.pdf.BaseFont.createFont(
                    com.lowagie.text.pdf.BaseFont.HELVETICA,
                    com.lowagie.text.pdf.BaseFont.WINANSI, false);

            // Title + subtitle, white on band
            cb.beginText();
            cb.setColorFill(Color.WHITE);
            cb.setFontAndSize(bold, 14);
            cb.showTextAligned(Element.ALIGN_LEFT,
                    "SavdoPRO · " + title, 36, page.getTop() - 22, 0);
            cb.setFontAndSize(plain, 9);
            cb.showTextAligned(Element.ALIGN_LEFT,
                    subtitle, 36, page.getTop() - 40, 0);
            cb.endText();

            // Footer: page number + generated-at timestamp
            cb.beginText();
            cb.setColorFill(GREY_TEXT);
            cb.setFontAndSize(plain, 8);
            cb.showTextAligned(Element.ALIGN_LEFT,
                    "SavdoPRO · " + java.time.LocalDateTime.now()
                            .format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")),
                    36, 18, 0);
            cb.showTextAligned(Element.ALIGN_RIGHT,
                    "Sahifa " + writer.getPageNumber(),
                    page.getWidth() - 36, 18, 0);
            cb.endText();
        }
    }
}
