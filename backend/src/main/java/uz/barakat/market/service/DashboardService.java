package uz.barakat.market.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Expense;
import uz.barakat.market.domain.HomeExpense;
import uz.barakat.market.domain.ManagementCost;
import uz.barakat.market.domain.Payment;
import uz.barakat.market.domain.PaymentDirection;
import uz.barakat.market.domain.PaymentType;
import uz.barakat.market.dto.DashboardResponse;
import uz.barakat.market.dto.ExpenseSlice;
import uz.barakat.market.dto.OrderResponse;
import uz.barakat.market.dto.ShiftResponse;
import uz.barakat.market.repository.ExpenseRepository;
import uz.barakat.market.repository.HomeExpenseRepository;
import uz.barakat.market.repository.ManagementCostRepository;
import uz.barakat.market.repository.OrderRepository;
import uz.barakat.market.repository.PaymentRepository;

/**
 * Aggregates everything the Dashboard page shows for today. Expenses may
 * be entered in either currency, so every total is converted to USD.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int TOP_EXPENSES = 6;

    private final ExpenseRepository expenses;
    private final HomeExpenseRepository homeExpenses;
    private final ManagementCostRepository managementCosts;
    private final PaymentRepository paymentRepo;
    private final OrderRepository orders;
    private final BalanceService balanceService;
    private final ShiftService shiftService;
    private final DebtService debtService;
    private final MoneyConverter converter;

    public DashboardService(ExpenseRepository expenses, HomeExpenseRepository homeExpenses,
                            ManagementCostRepository managementCosts,
                            PaymentRepository paymentRepo,
                            OrderRepository orders, BalanceService balanceService,
                            ShiftService shiftService, DebtService debtService,
                            MoneyConverter converter) {
        this.expenses = expenses;
        this.homeExpenses = homeExpenses;
        this.managementCosts = managementCosts;
        this.paymentRepo = paymentRepo;
        this.orders = orders;
        this.balanceService = balanceService;
        this.shiftService = shiftService;
        this.debtService = debtService;
        this.converter = converter;
    }

    public DashboardResponse today() {
        LocalDate today = LocalDate.now();

        // Legacy market-expense entries (now read-only, no UI to add them).
        // Combined with home expenses so totals stay consistent if historical
        // market rows exist.
        List<Expense> market = expenses.findByDateOrderByIdDesc(today);
        List<HomeExpense> home = homeExpenses.findByDateOrderByIdDesc(today);

        BigDecimal homeTotal = sumUsd(home, HomeExpense::getAmount, HomeExpense::getCurrency);
        BigDecimal homeCash  = sumUsd(home, HomeExpense::getCashAmount, HomeExpense::getCurrency);
        BigDecimal homeNaqd  = sumUsd(home, HomeExpense::getNaqdAmount, HomeExpense::getCurrency);
        BigDecimal homeCard  = sumUsd(home, HomeExpense::getCardAmount, HomeExpense::getCurrency);

        BigDecimal marketTotal = sumUsd(market, Expense::getAmount, Expense::getCurrency);
        BigDecimal marketCash  = sumUsd(market, Expense::getCashAmount, Expense::getCurrency);
        BigDecimal marketNaqd  = sumUsd(market, Expense::getNaqdAmount, Expense::getCurrency);
        BigDecimal marketCard  = sumUsd(market, Expense::getCardAmount, Expense::getCurrency);

        // Management costs (Menejment page): salary / tax / other. No method
        // field, so we book them as "naqd" by default.
        List<ManagementCost> mgmt =
                managementCosts.findByDateBetweenOrderByDateDescIdDesc(today, today);
        BigDecimal mgmtTotal = mgmt.stream()
                .map(c -> converter.toUsd(c.getAmount(), c.getCurrency()))
                .reduce(ZERO, BigDecimal::add);

        // Payment journal (To'lov page) — outgoing rows count as today's spend
        // and are split into NAQD / KASSA / KARTA according to their method.
        List<Payment> payments =
                paymentRepo.findByDateBetweenOrderByDateDescIdDesc(today, today);
        BigDecimal payOutTotal = ZERO;
        BigDecimal payNaqd = ZERO, payKassa = ZERO, payKarta = ZERO;
        for (Payment p : payments) {
            if (p.getDirection() != PaymentDirection.OUTGOING) {
                continue;
            }
            BigDecimal usd = converter.toUsd(p.getAmount(), p.getCurrency());
            payOutTotal = payOutTotal.add(usd);
            PaymentType m = p.getMethod();
            if (m == PaymentType.KASSA) {
                payKassa = payKassa.add(usd);
            } else if (m == PaymentType.KARTA || m == PaymentType.P2P
                    || m == PaymentType.TRANSFER) {
                payKarta = payKarta.add(usd);
            } else {
                // NAQD, ARALASH, QARZGA — bucket as naqd by default.
                payNaqd = payNaqd.add(usd);
            }
        }

        BigDecimal expenseTotal = homeTotal.add(marketTotal).add(mgmtTotal).add(payOutTotal);
        BigDecimal kassa = homeCash.add(marketCash).add(payKassa);
        BigDecimal naqd  = homeNaqd.add(marketNaqd).add(mgmtTotal).add(payNaqd);
        BigDecimal karta = homeCard.add(marketCard).add(payKarta);

        BigDecimal startingCash = balanceService.startingCash(today);
        BigDecimal estimatedCash = startingCash.subtract(naqd);
        BigDecimal totalDebt = debtService.totalMyDebt();

        // Top expenses: merge home / management / payment outgoing into one
        // ranked list so every spend source shows up regardless of where it
        // was entered.
        java.util.stream.Stream<ExpenseSlice> homeSlices = home.stream()
                .map(e -> new ExpenseSlice(e.getName(),
                        converter.toUsd(e.getAmount(), e.getCurrency()), 0));
        java.util.stream.Stream<ExpenseSlice> mgmtSlices = mgmt.stream()
                .map(c -> new ExpenseSlice(c.getName(),
                        converter.toUsd(c.getAmount(), c.getCurrency()), 0));
        java.util.stream.Stream<ExpenseSlice> paySlices = payments.stream()
                .filter(p -> p.getDirection() == PaymentDirection.OUTGOING)
                .map(p -> new ExpenseSlice(
                        p.getParty() != null && !p.getParty().isBlank()
                                ? p.getParty() : "To'lov",
                        converter.toUsd(p.getAmount(), p.getCurrency()), 0));
        List<ExpenseSlice> topExpenses = java.util.stream.Stream.of(
                        homeSlices, mgmtSlices, paySlices)
                .flatMap(s -> s)
                .sorted(Comparator.comparing(ExpenseSlice::amount).reversed())
                .limit(TOP_EXPENSES)
                .map(s -> new ExpenseSlice(s.name(), s.amount(),
                        percentOf(s.amount(), expenseTotal)))
                .toList();

        ShiftResponse shift = shiftService.current();

        return new DashboardResponse(today,
                shift != null, shift != null ? shift.id() : null,
                startingCash, expenseTotal, kassa, naqd, karta, homeTotal,
                totalDebt, estimatedCash, topExpenses,
                ordersOn(today), ordersOn(today.plusDays(1)), overdueOrders(today));
    }

    private List<OrderResponse> ordersOn(LocalDate date) {
        return orders.findByCompletedFalseAndDeliveryDateOrderByIdDesc(date).stream()
                .map(o -> Mappers.order(o, LocalDate.now())).toList();
    }

    private List<OrderResponse> overdueOrders(LocalDate today) {
        return orders.findByCompletedFalseAndDeliveryDateLessThanOrderByDeliveryDateAsc(today)
                .stream().map(o -> Mappers.order(o, today)).toList();
    }

    private static int percentOf(BigDecimal part, BigDecimal total) {
        if (total.signum() <= 0) {
            return 0;
        }
        return part.multiply(HUNDRED).divide(total, 0, RoundingMode.HALF_UP).intValue();
    }

    /** Sums a money field across records, converting each to USD first. */
    private <T> BigDecimal sumUsd(List<T> list, Function<T, BigDecimal> field,
                                  Function<T, Currency> currency) {
        return list.stream()
                .map(t -> converter.toUsd(field.apply(t), currency.apply(t)))
                .reduce(ZERO, BigDecimal::add);
    }
}
