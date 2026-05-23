package uz.barakat.market.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import uz.barakat.market.dto.SoldGoodsLine;
import uz.barakat.market.dto.SoldGoodsReport;

/** Renders a {@link SoldGoodsReport} as a downloadable CSV or XLSX file. */
@Component
public class SoldGoodsExporter {

    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** Column headers, shared by both formats. */
    private static final String[] HEADERS = {
        "Sana", "Mahsulot", "Soni", "Sotuv narxi (USD)",
        "Tan narxi (USD)", "Summa (USD)", "Foyda (USD)", "Izoh",
    };

    // ------------------------------------------------------------------- CSV

    /** UTF-8 CSV with a BOM so Excel opens Cyrillic / Latin text correctly. */
    public byte[] toCsv(SoldGoodsReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append('﻿');
        sb.append(String.join(",", HEADERS)).append("\r\n");
        for (SoldGoodsLine line : report.lines()) {
            sb.append(csv(line.soldAt().format(TIMESTAMP))).append(',')
              .append(csv(line.productName())).append(',')
              .append(line.quantity()).append(',')
              .append(money(line.unitPrice())).append(',')
              .append(money(line.unitCost())).append(',')
              .append(money(line.lineRevenue())).append(',')
              .append(money(line.lineProfit())).append(',')
              .append(csv(line.note())).append("\r\n");
        }
        // Totals row: "JAMI" | - | units | - | - | revenue | profit | -
        sb.append(csv("JAMI")).append(',')
          .append(',')
          .append(report.totalUnits()).append(',')
          .append(',')
          .append(',')
          .append(money(report.totalRevenue())).append(',')
          .append(money(report.totalProfit())).append(',')
          .append("\r\n");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------ XLSX

    public byte[] toXlsx(SoldGoodsReport report) {
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Sotilgan tovarlar");
            CellStyle headerStyle = headerStyle(wb);
            CellStyle moneyStyle = moneyStyle(wb, false);
            CellStyle boldStyle = boldStyle(wb);
            CellStyle totalMoneyStyle = moneyStyle(wb, true);

            Row header = sheet.createRow(0);
            for (int c = 0; c < HEADERS.length; c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(HEADERS[c]);
                cell.setCellStyle(headerStyle);
            }

            int r = 1;
            for (SoldGoodsLine line : report.lines()) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(line.soldAt().format(TIMESTAMP));
                row.createCell(1).setCellValue(line.productName());
                row.createCell(2).setCellValue(line.quantity());
                moneyCell(row, 3, line.unitPrice(), moneyStyle);
                moneyCell(row, 4, line.unitCost(), moneyStyle);
                moneyCell(row, 5, line.lineRevenue(), moneyStyle);
                moneyCell(row, 6, line.lineProfit(), moneyStyle);
                row.createCell(7).setCellValue(line.note() == null ? "" : line.note());
            }

            Row totals = sheet.createRow(r);
            Cell totalLabel = totals.createCell(0);
            totalLabel.setCellValue("JAMI");
            totalLabel.setCellStyle(boldStyle);
            Cell totalUnits = totals.createCell(2);
            totalUnits.setCellValue(report.totalUnits());
            totalUnits.setCellStyle(boldStyle);
            moneyCell(totals, 5, report.totalRevenue(), totalMoneyStyle);
            moneyCell(totals, 6, report.totalProfit(), totalMoneyStyle);

            int[] widths = {20, 34, 9, 16, 16, 16, 16, 30};
            for (int c = 0; c < widths.length; c++) {
                sheet.setColumnWidth(c, widths[c] * 256);
            }
            sheet.createFreezePane(0, 1);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException("Excel faylini yaratib bo'lmadi", ex);
        }
    }

    // --------------------------------------------------------------- helpers

    private static void moneyCell(Row row, int col, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(scale(value).doubleValue());
        cell.setCellStyle(style);
    }

    private static CellStyle headerStyle(Workbook wb) {
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        CellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private static CellStyle boldStyle(Workbook wb) {
        Font font = wb.createFont();
        font.setBold(true);
        CellStyle style = wb.createCellStyle();
        style.setFont(font);
        return style;
    }

    private static CellStyle moneyStyle(Workbook wb, boolean bold) {
        CellStyle style = wb.createCellStyle();
        style.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));
        if (bold) {
            Font font = wb.createFont();
            font.setBold(true);
            style.setFont(font);
        }
        return style;
    }

    private static BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static String money(BigDecimal value) {
        return scale(value).toPlainString();
    }

    /** Escapes one CSV field; quotes it when it contains a delimiter. */
    private static String csv(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        if (value.contains(",") || value.contains("\"")
                || value.contains("\n") || value.contains("\r")) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }
}
