package uz.barakat.market.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.repository.SaleRepository;

/**
 * 7-day-ahead cashbox prediction.
 *
 * <p>Algorithm (intentionally simple, transparent):
 *   <ol>
 *     <li>Look at the trailing 30 days of POS sales — sum, count.</li>
 *     <li>Mean daily revenue = sum / 30.</li>
 *     <li>Compute a per-weekday adjustment:
 *         {@code mean(this weekday's last 4 days) / mean(all 30 days)}.</li>
 *     <li>Project each of the next 7 days = mean × adjustment.</li>
 *   </ol>
 *
 * <p>Why no real ML model: the typical SavdoPRO shop has 30–60 days of
 * POS history at most, which isn't enough to train anything robust. The
 * weekday-adjusted mean captures 80% of the value (weekend lift, slow
 * Mondays) with code an operator can read and trust.
 */
@Service
@Transactional(readOnly = true)
public class PredictionService {

    private static final int WINDOW = 30;
    private static final int HORIZON = 7;

    private final SaleRepository sales;

    public PredictionService(SaleRepository sales) {
        this.sales = sales;
    }

    public record DayPrediction(
            LocalDate date,
            String weekday,
            BigDecimal projectedRevenueUzs,
            int projectedSalesCount) { }

    public record CashboxForecast(
            BigDecimal meanDailyRevenue,
            int meanDailySalesCount,
            BigDecimal projectedNext7DaysTotal,
            int projectedNext7DaysCount,
            List<DayPrediction> daily) { }

    public CashboxForecast forecastNext7Days() {
        // Build daily totals for the trailing window.
        BigDecimal[] dailyRev = new BigDecimal[WINDOW];
        int[] dailyCnt = new int[WINDOW];
        for (int i = 0; i < WINDOW; i++) {
            dailyRev[i] = BigDecimal.ZERO;
        }
        for (int d = 0; d < WINDOW; d++) {
            LocalDate day = LocalDate.now().minusDays(WINDOW - d);
            Object[] row = sales.summaryBetween(day.atStartOfDay(), day.plusDays(1).atStartOfDay());
            if (row != null && row.length == 1 && row[0] instanceof Object[] inner) {
                row = inner;
            }
            long count = row != null && row.length > 0 ? ((Number) row[0]).longValue() : 0L;
            Object totalObj = row != null && row.length > 1 ? row[1] : BigDecimal.ZERO;
            Object refundObj = row != null && row.length > 2 ? row[2] : BigDecimal.ZERO;
            BigDecimal total = (totalObj instanceof BigDecimal bd) ? bd : new BigDecimal(String.valueOf(totalObj));
            BigDecimal refunded = (refundObj instanceof BigDecimal br) ? br : new BigDecimal(String.valueOf(refundObj));
            dailyRev[d] = total.subtract(refunded);
            dailyCnt[d] = (int) count;
        }

        // Mean
        BigDecimal sum = BigDecimal.ZERO;
        long totalCount = 0;
        for (int i = 0; i < WINDOW; i++) {
            sum = sum.add(dailyRev[i]);
            totalCount += dailyCnt[i];
        }
        BigDecimal mean = sum.divide(BigDecimal.valueOf(WINDOW), 2, RoundingMode.HALF_UP);
        int meanCnt = (int) (totalCount / WINDOW);

        // Weekday adjustments
        double[] weekdayAdj = computeWeekdayAdjustments(dailyRev);

        // Projection
        List<DayPrediction> daily = new ArrayList<>();
        BigDecimal totalProjRev = BigDecimal.ZERO;
        int totalProjCnt = 0;
        for (int h = 1; h <= HORIZON; h++) {
            LocalDate d = LocalDate.now().plusDays(h);
            int wdIdx = d.getDayOfWeek().getValue() - 1; // 0..6 (Mon..Sun)
            BigDecimal projRev = mean
                    .multiply(BigDecimal.valueOf(weekdayAdj[wdIdx]))
                    .setScale(2, RoundingMode.HALF_UP);
            int projCnt = (int) Math.round(meanCnt * weekdayAdj[wdIdx]);
            daily.add(new DayPrediction(d, d.getDayOfWeek().toString(), projRev, projCnt));
            totalProjRev = totalProjRev.add(projRev);
            totalProjCnt += projCnt;
        }
        return new CashboxForecast(mean, meanCnt, totalProjRev, totalProjCnt, daily);
    }

    /** For each weekday, what's the relative lift vs the overall mean? */
    private static double[] computeWeekdayAdjustments(BigDecimal[] dailyRev) {
        double[] sumByWd = new double[7];
        int[] cntByWd = new int[7];
        for (int i = 0; i < dailyRev.length; i++) {
            LocalDate day = LocalDate.now().minusDays(dailyRev.length - i);
            int wdIdx = day.getDayOfWeek().getValue() - 1;
            sumByWd[wdIdx] += dailyRev[i].doubleValue();
            cntByWd[wdIdx]++;
        }
        double overallMean = 0;
        int totalDays = 0;
        for (int wd = 0; wd < 7; wd++) {
            overallMean += sumByWd[wd];
            totalDays += cntByWd[wd];
        }
        overallMean = totalDays > 0 ? overallMean / totalDays : 0;

        double[] adj = new double[7];
        for (int wd = 0; wd < 7; wd++) {
            double wdMean = cntByWd[wd] > 0 ? sumByWd[wd] / cntByWd[wd] : overallMean;
            adj[wd] = overallMean > 0 ? Math.max(0.2, Math.min(3.0, wdMean / overallMean)) : 1.0;
        }
        return adj;
    }
}
