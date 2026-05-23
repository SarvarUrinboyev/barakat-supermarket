package uz.barakat.market.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import uz.barakat.market.exception.BadRequestException;

/** Parses a CSV or XLSX file into product rows for the bulk import. */
@Component
public class ProductImporter {

    /** One parsed row; a non-null {@code error} means the row is rejected. */
    public record ImportRow(
            int line, String name, String barcode, String imei1, String imei2,
            BigDecimal purchasePrice, BigDecimal salePrice, int quantity,
            int lowStockThreshold, String category, String error) {
    }

    /** Header keyword (normalised) -> logical column name. */
    private static final Map<String, String> HEADER_ALIASES = new HashMap<>();

    static {
        alias("name", "nomi", "nom", "name", "mahsulot", "mahsulot nomi", "tovar");
        alias("barcode", "shtrix kod", "shtrix", "shtrix-kod", "shtrixkod", "barcode", "shtrix code");
        alias("imei1", "imei1", "imei 1", "imei-1", "imei");
        alias("imei2", "imei2", "imei 2", "imei-2");
        alias("purchase", "kelish narxi", "kelish", "tannarx", "tan narx", "purchase");
        alias("sale", "sotilish narxi", "sotilish", "narx", "narxi", "sale", "price");
        alias("qty", "miqdor", "soni", "qoldiq", "quantity", "qty", "dona");
        alias("threshold", "chegara", "past stok", "past stok chegarasi", "threshold");
        alias("category", "toifa", "kategoriya", "category");
    }

    private static void alias(String column, String... keywords) {
        for (String keyword : keywords) {
            HEADER_ALIASES.put(keyword, column);
        }
    }

    public List<ImportRow> parse(MultipartFile file) {
        String name = file.getOriginalFilename() == null
                ? "" : file.getOriginalFilename().toLowerCase();
        try {
            return name.endsWith(".xlsx") || name.endsWith(".xls")
                    ? parseExcel(file)
                    : parseCsv(file);
        } catch (IOException ex) {
            throw new BadRequestException("Faylni o'qib bo'lmadi: " + ex.getMessage());
        }
    }

    // ----------------------------------------------------------------- Excel

    private List<ImportRow> parseExcel(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        try (InputStream in = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new BadRequestException("Fayl bo'sh");
            }
            int firstRow = sheet.getFirstRowNum();
            Row header = sheet.getRow(firstRow);
            if (header == null) {
                throw new BadRequestException("Sarlavha qatori topilmadi");
            }
            Map<String, Integer> cols = new HashMap<>();
            for (Cell cell : header) {
                String column = HEADER_ALIASES.get(normalise(cellString(cell)));
                if (column != null) {
                    cols.putIfAbsent(column, cell.getColumnIndex());
                }
            }
            requireNameColumn(cols);
            for (int r = firstRow + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                String name = cellString(cellAt(row, cols.get("name")));
                if (name.isBlank()) {
                    continue;
                }
                rows.add(buildRow(r + 1, name,
                        cellString(cellAt(row, cols.get("barcode"))),
                        cellString(cellAt(row, cols.get("imei1"))),
                        cellString(cellAt(row, cols.get("imei2"))),
                        cellNumber(cellAt(row, cols.get("purchase"))),
                        cellNumber(cellAt(row, cols.get("sale"))),
                        cellNumber(cellAt(row, cols.get("qty"))),
                        cellNumber(cellAt(row, cols.get("threshold"))),
                        cellString(cellAt(row, cols.get("category")))));
            }
        }
        return rows;
    }

    // ------------------------------------------------------------------- CSV

    private List<ImportRow> parseCsv(MultipartFile file) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        if (content.startsWith("﻿")) {
            content = content.substring(1);
        }
        String[] lines = content.split("\\r?\\n");
        if (lines.length == 0 || lines[0].isBlank()) {
            throw new BadRequestException("Fayl bo'sh");
        }
        char delimiter = count(lines[0], ';') > count(lines[0], ',') ? ';' : ',';
        String[] headers = splitCsv(lines[0], delimiter);
        Map<String, Integer> cols = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            String column = HEADER_ALIASES.get(normalise(headers[i]));
            if (column != null) {
                cols.putIfAbsent(column, i);
            }
        }
        requireNameColumn(cols);
        List<ImportRow> rows = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isBlank()) {
                continue;
            }
            String[] fields = splitCsv(lines[i], delimiter);
            String name = field(fields, cols.get("name"));
            if (name == null || name.isBlank()) {
                continue;
            }
            rows.add(buildRow(i + 1, name,
                    field(fields, cols.get("barcode")),
                    field(fields, cols.get("imei1")),
                    field(fields, cols.get("imei2")),
                    parseNumber(field(fields, cols.get("purchase"))),
                    parseNumber(field(fields, cols.get("sale"))),
                    parseNumber(field(fields, cols.get("qty"))),
                    parseNumber(field(fields, cols.get("threshold"))),
                    field(fields, cols.get("category"))));
        }
        return rows;
    }

    // --------------------------------------------------------------- helpers

    private static ImportRow buildRow(int line, String name, String barcode, String imei1,
                                      String imei2, double purchase, double sale, double qty,
                                      double threshold, String category) {
        return new ImportRow(line, name.strip(),
                blankToNull(barcode), blankToNull(imei1), blankToNull(imei2),
                money(purchase), money(sale),
                (int) Math.max(0, Math.round(qty)),
                (int) Math.max(0, Math.round(threshold)),
                blankToNull(category), null);
    }

    private static void requireNameColumn(Map<String, Integer> cols) {
        if (!cols.containsKey("name")) {
            throw new BadRequestException("Faylda 'Nomi' ustuni topilmadi. "
                    + "Sarlavhalar: Nomi, Shtrix kod, IMEI 1, IMEI 2, Kelish narxi, "
                    + "Sotilish narxi, Miqdor, Toifa");
        }
    }

    private static BigDecimal money(double value) {
        return BigDecimal.valueOf(Math.max(0, value)).setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String normalise(String value) {
        return value == null ? "" : value.strip().toLowerCase();
    }

    private static long count(String text, char ch) {
        return text.chars().filter(c -> c == ch).count();
    }

    private static String field(String[] fields, Integer index) {
        return index == null || index >= fields.length ? null : fields[index];
    }

    private static double parseNumber(String raw) {
        if (raw == null) {
            return 0;
        }
        String cleaned = raw.replaceAll("[^0-9.]", "");
        if (cleaned.isEmpty() || cleaned.equals(".")) {
            return 0;
        }
        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static String[] splitCsv(String line, char delimiter) {
        List<String> out = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    sb.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == delimiter && !inQuotes) {
                out.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        out.add(sb.toString());
        return out.toArray(new String[0]);
    }

    private static Cell cellAt(Row row, Integer index) {
        return index == null ? null : row.getCell(index);
    }

    private static String cellString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case FORMULA -> cell.toString();
            default -> "";
        };
    }

    private static double cellNumber(Cell cell) {
        if (cell == null) {
            return 0;
        }
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> parseNumber(cell.getStringCellValue());
            case FORMULA -> {
                try {
                    yield cell.getNumericCellValue();
                } catch (RuntimeException ex) {
                    yield 0;
                }
            }
            default -> 0;
        };
    }
}
