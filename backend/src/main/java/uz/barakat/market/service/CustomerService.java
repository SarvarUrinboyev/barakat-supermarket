package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Currency;
import uz.barakat.market.domain.Customer;
import uz.barakat.market.domain.CustomerTransaction;
import uz.barakat.market.domain.CustomerTxType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.ShiftStatus;
import uz.barakat.market.domain.StockReason;
import uz.barakat.market.dto.CustomerDetailResponse;
import uz.barakat.market.dto.CustomerRequest;
import uz.barakat.market.dto.CustomerResponse;
import uz.barakat.market.dto.CustomerTransactionRequest;
import uz.barakat.market.dto.CustomerTransactionResponse;
import uz.barakat.market.dto.StockAdjustRequest;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.CustomerRepository;
import uz.barakat.market.repository.CustomerTransactionRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ShiftRepository;
import uz.barakat.market.util.PhoneUtil;
import uz.barakat.market.telegram.CustomerBotNotifier;

/** Customers ("Mijozlar"): contact details plus the goods / payment ledger. */
@Service
@Transactional
public class CustomerService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final CustomerRepository customers;
    private final CustomerTransactionRepository transactions;
    private final ProductRepository products;
    private final ProductService productService;
    private final CustomerBotNotifier botNotifier;
    private final ShiftRepository shifts;
    private final CustomerNotificationService notifications;

    public CustomerService(CustomerRepository customers,
                           CustomerTransactionRepository transactions,
                           ProductRepository products,
                           ProductService productService,
                           CustomerBotNotifier botNotifier,
                           ShiftRepository shifts,
                           CustomerNotificationService notifications) {
        this.customers = customers;
        this.transactions = transactions;
        this.products = products;
        this.productService = productService;
        this.botNotifier = botNotifier;
        this.shifts = shifts;
        this.notifications = notifications;
    }

    /**
     * Sends a one-off message to a customer over the best available channel
     * (linked Telegram bot, else SMS). {@code template} is one of
     * {@code DEBT} (auto-builds the balance reminder), {@code ORDER_READY}
     * or {@code CUSTOM} (uses {@code customText}). Returns the channel used.
     */
    public String sendNotification(Long id, String template, String customText) {
        Customer customer = customers.findById(id)
                .orElseThrow(() -> NotFoundException.of("Mijoz", id));
        String text = switch (template == null ? "" : template.toUpperCase()) {
            case "DEBT" -> debtReminderText(customer);
            case "ORDER_READY" -> "Hurmatli " + customer.getName()
                    + "! Buyurtmangiz tayyor. Olib ketishingiz mumkin. Rahmat!";
            default -> customText;
        };
        if (text == null || text.isBlank()) {
            throw new BadRequestException("Xabar matni bo'sh");
        }
        return notifications.notify(customer, text).name();
    }

    /** Builds the debt-reminder text from the customer's current per-currency balance. */
    private String debtReminderText(Customer customer) {
        Map<Currency, BigDecimal> balances = balanceOf(customer.getId());
        if (!owesAnything(balances)) {
            return "Hurmatli " + customer.getName()
                    + "! Sizda qarz yo'q. Rahmat! 🙏";
        }
        return "Hurmatli " + customer.getName() + "! 👋\n\n"
                + "Eslatma: sizning qarzingiz " + debtText(balances) + ".\n"
                + "Iltimos, qulay vaqtda to'lovni amalga oshiring. Rahmat!";
    }

    /** Result of a bulk debt reminder: how many debtors, and per channel. */
    public record BulkReminderResult(int debtors, int telegram, int sms, int noChannel) { }

    /**
     * Sends a debt reminder to every customer with a positive balance, over
     * each one's best channel. Balances come from a single GROUP BY so this
     * stays one query regardless of customer count.
     */
    public BulkReminderResult remindAllDebtors() {
        // One GROUP BY, now per (customer, currency): accumulate a per-currency
        // balance map for each customer so debts are never merged across
        // currencies (Gate C Q3).
        Map<Long, Map<Currency, BigDecimal>> balances = new HashMap<>();
        for (CustomerTransactionRepository.LedgerTotals lt
                : transactions.aggregateLedgerTotals(CustomerTxType.GOODS, CustomerTxType.PAYMENT)) {
            BigDecimal goods = lt.getGoods() == null ? ZERO : lt.getGoods();
            BigDecimal paid = lt.getPaid() == null ? ZERO : lt.getPaid();
            Currency cur = lt.getCurrency() == null ? Currency.UZS : lt.getCurrency();
            balances.computeIfAbsent(lt.getCustomerId(), k -> new EnumMap<>(Currency.class))
                    .merge(cur, goods.subtract(paid), BigDecimal::add);
        }
        int debtors = 0;
        int telegram = 0;
        int sms = 0;
        int none = 0;
        for (Customer c : customers.findAll()) {
            Map<Currency, BigDecimal> bal =
                    balances.getOrDefault(c.getId(), new EnumMap<>(Currency.class));
            if (!owesAnything(bal)) {
                continue;
            }
            debtors++;
            String text = "Hurmatli " + c.getName() + "! 👋\n\n"
                    + "Eslatma: sizning qarzingiz " + debtText(bal) + ".\n"
                    + "Iltimos, qulay vaqtda to'lovni amalga oshiring. Rahmat!";
            switch (notifications.notify(c, text)) {
                case TELEGRAM -> telegram++;
                case SMS -> sms++;
                case NONE -> none++;
            }
        }
        return new BulkReminderResult(debtors, telegram, sms, none);
    }

    /**
     * Running balance PER CURRENCY = sum(GOODS) - sum(PAYMENT) within each
     * currency bucket. Never merged across currencies (Gate C Q3) — a customer
     * can owe "500 000 so'm and $200" and the two are reported separately.
     */
    private Map<Currency, BigDecimal> balanceOf(Long customerId) {
        return balancesOf(transactions.findByCustomerIdOrderByDateDescIdDesc(customerId));
    }

    /** Per-currency net balance from a ledger; one bucket per currency. */
    private static Map<Currency, BigDecimal> balancesOf(List<CustomerTransaction> ledger) {
        Map<Currency, BigDecimal> bal = new EnumMap<>(Currency.class);
        for (CustomerTransaction tx : ledger) {
            Currency cur = tx.getCurrency() == null ? Currency.UZS : tx.getCurrency();
            BigDecimal signed = tx.getType() == CustomerTxType.GOODS
                    ? tx.getAmount() : tx.getAmount().negate();
            bal.merge(cur, signed, BigDecimal::add);
        }
        return bal;
    }

    private static BigDecimal bucket(Map<Currency, BigDecimal> balances, Currency c) {
        return balances.getOrDefault(c, ZERO);
    }

    /** Reminder-friendly rendering of a per-currency debt, e.g. "500 000 so'm va $200". */
    private static String debtText(Map<Currency, BigDecimal> balances) {
        List<String> parts = new ArrayList<>();
        BigDecimal uzs = bucket(balances, Currency.UZS);
        if (uzs.signum() > 0) {
            parts.add(MoneyFormat.uzs(uzs));
        }
        BigDecimal usd = bucket(balances, Currency.USD);
        if (usd.signum() > 0) {
            parts.add(MoneyFormat.usd(usd));
        }
        return String.join(" va ", parts);
    }

    /** True when the customer owes anything in any currency. */
    private static boolean owesAnything(Map<Currency, BigDecimal> balances) {
        return bucket(balances, Currency.UZS).signum() > 0
                || bucket(balances, Currency.USD).signum() > 0;
    }

    /** Defense-in-depth: warehouse-touching sales are only allowed when a shift is open. */
    private void requireOpenShift() {
        if (shifts.findFirstByStatusOrderByOpenedAtDesc(ShiftStatus.OPEN).isEmpty()) {
            throw new BadRequestException(
                    "Smena yopiq. Tovar berish uchun avval smenani oching.");
        }
    }

    /** All customers, each with its ledger totals and balance. */
    @Transactional(readOnly = true)
    public List<CustomerResponse> list() {
        // One GROUP BY (aggregateLedgerTotals), now per (customer, currency), so
        // balances are summed per currency and never merged (Gate C Q3). Fold the
        // per-currency rows back per customer here rather than loading every
        // ledger row into memory.
        Map<Long, CustomerAgg> agg = new HashMap<>();
        for (CustomerTransactionRepository.LedgerTotals t
                : transactions.aggregateLedgerTotals(CustomerTxType.GOODS, CustomerTxType.PAYMENT)) {
            BigDecimal goods = t.getGoods() != null ? t.getGoods() : ZERO;
            BigDecimal paid = t.getPaid() != null ? t.getPaid() : ZERO;
            Currency cur = t.getCurrency() == null ? Currency.UZS : t.getCurrency();
            CustomerAgg a = agg.computeIfAbsent(t.getCustomerId(), k -> new CustomerAgg());
            a.count += (int) t.getTxCount();
            a.balances.merge(cur, goods.subtract(paid), BigDecimal::add);
        }
        return customers.findAllByOrderByNameAsc().stream()
                .map(c -> {
                    CustomerAgg a = agg.getOrDefault(c.getId(), new CustomerAgg());
                    return Mappers.customer(c,
                            bucket(a.balances, Currency.UZS), bucket(a.balances, Currency.USD),
                            a.count);
                })
                .toList();
    }

    /** Mutable per-customer fold of the per-currency aggregate rows. */
    private static final class CustomerAgg {
        int count = 0;
        final Map<Currency, BigDecimal> balances = new EnumMap<>(Currency.class);
    }

    /** A customer with the full ledger (goods given + payments received). */
    @Transactional(readOnly = true)
    public CustomerDetailResponse detail(Long id) {
        Customer customer = find(id);
        List<CustomerTransaction> ledger =
                transactions.findByCustomerIdOrderByDateDescIdDesc(id);
        List<CustomerTransactionResponse> lines = ledger.stream()
                .map(Mappers::customerTransaction).toList();
        return new CustomerDetailResponse(toResponse(customer, ledger), lines);
    }

    public CustomerResponse create(CustomerRequest request) {
        Customer customer = new Customer();
        apply(customer, request);
        requirePhoneUnique(customer.getPhone(), null);
        customers.save(customer);
        return toResponse(customer, List.of());
    }

    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = find(id);
        apply(customer, request);
        requirePhoneUnique(customer.getPhone(), id);
        customers.save(customer);
        return toResponse(customer, transactions.findByCustomerIdOrderByDateDescIdDesc(id));
    }

    /** Rejects the save when another customer in this tenant already uses the phone. */
    private void requirePhoneUnique(String phone, Long selfId) {
        if (phone == null || phone.isBlank()) return;
        boolean taken = selfId == null
                ? customers.existsByPhone(phone)
                : customers.existsByPhoneAndIdNot(phone, selfId);
        if (taken) {
            throw new BadRequestException("Bu telefon raqam allaqachon mijozga biriktirilgan: " + phone);
        }
    }

    /** Removes the customer; the database cascade removes the ledger rows. */
    public void delete(Long id) {
        customers.delete(find(id));
    }

    /**
     * Redeem loyalty points for a UZS-equivalent discount.
     *
     * <p>Returns the new balance. The points-to-UZS ratio is the inverse
     * of the earn rule in {@code PaymentService} — 1 point = 1 000 UZS
     * off — so the cashier can simply read the value to the customer.
     * Throws if the customer doesn't have enough points; throws if
     * {@code amount} is non-positive (would let a malicious client
     * increase the balance).
     */
    public CustomerResponse redeemPoints(Long customerId, long pointsToBurn) {
        if (pointsToBurn <= 0) {
            throw new BadRequestException("Ball miqdori 0 dan katta bo'lishi kerak");
        }
        Customer customer = find(customerId);
        if (customer.getPointsBalance() < pointsToBurn) {
            throw new BadRequestException(
                    "Yetarli ball yo'q: mavjud " + customer.getPointsBalance()
                            + ", so'ralgan " + pointsToBurn);
        }
        customer.setPointsBalance(customer.getPointsBalance() - pointsToBurn);
        customers.save(customer);

        CustomerTransaction row = new CustomerTransaction();
        row.setCustomerId(customerId);
        row.setDate(java.time.LocalDate.now());
        row.setType(CustomerTxType.PAYMENT);
        row.setDescription("Loyalty redeem: −" + pointsToBurn + " ball");
        row.setAmount(java.math.BigDecimal.ZERO);
        row.setPointsDelta(-pointsToBurn);
        transactions.save(row);

        return toResponse(customer,
                transactions.findByCustomerIdOrderByDateDescIdDesc(customerId));
    }

    /**
     * Adds a ledger line. GOODS sells a real warehouse product: stock is
     * checked and deducted (a SALE movement). PAYMENT just records money in.
     * If the customer linked the Telegram bot, they are notified.
     */
    public CustomerDetailResponse addTransaction(Long customerId,
                                                 CustomerTransactionRequest request) {
        if (request.type() == CustomerTxType.GOODS) {
            requireOpenShift();
        }
        Customer customer = find(customerId);
        CustomerTransaction tx = new CustomerTransaction();
        tx.setCustomerId(customerId);
        tx.setDate(request.date() != null ? request.date() : LocalDate.now());
        tx.setType(request.type());
        tx.setAmount(request.amount());
        tx.setCurrency(request.currency() != null ? request.currency() : Currency.UZS);
        tx.setNote(blankToNull(request.note()));
        if (request.type() == CustomerTxType.GOODS) {
            tx.setDescription(sellFromWarehouse(customer, request));
        } else {
            tx.setDescription(blankToNull(request.description()));
        }
        transactions.save(tx);
        botNotifier.notifyTransaction(customer, tx);
        return detail(customerId);
    }

    /**
     * Adds several ledger lines at once - a basket of goods sold together.
     * Processed in one transaction: if any product is missing or out of
     * stock, the whole basket is rejected and nothing is saved.
     */
    public CustomerDetailResponse addTransactions(Long customerId,
                                                  List<CustomerTransactionRequest> requests) {
        Customer customer = find(customerId);
        if (requests == null || requests.isEmpty()) {
            throw new BadRequestException("Kamida bitta tovar tanlanishi kerak");
        }
        boolean hasGoods = requests.stream()
                .anyMatch(r -> r.type() == CustomerTxType.GOODS);
        if (hasGoods) {
            requireOpenShift();
        }
        List<CustomerTransaction> created = new ArrayList<>();
        for (CustomerTransactionRequest request : requests) {
            CustomerTransaction tx = new CustomerTransaction();
            tx.setCustomerId(customerId);
            tx.setDate(request.date() != null ? request.date() : LocalDate.now());
            tx.setType(request.type());
            tx.setAmount(request.amount());
            tx.setCurrency(request.currency() != null ? request.currency() : Currency.UZS);
            tx.setNote(blankToNull(request.note()));
            if (request.type() == CustomerTxType.GOODS) {
                tx.setDescription(sellFromWarehouse(customer, request));
            } else {
                tx.setDescription(blankToNull(request.description()));
            }
            transactions.save(tx);
            created.add(tx);
        }
        botNotifier.notifyBatch(customer, created);
        return detail(customerId);
    }

    /**
     * Edits an existing ledger line - corrects amount / description / date /
     * note. The line type and any warehouse stock already moved are left
     * unchanged (this is a correction, not a new sale).
     */
    public CustomerDetailResponse updateTransaction(Long customerId, Long transactionId,
                                                    CustomerTransactionRequest request) {
        find(customerId);
        CustomerTransaction tx = transactions.findById(transactionId)
                .orElseThrow(() -> NotFoundException.of("Amal", transactionId));
        if (!tx.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Amal bu mijozga tegishli emas");
        }
        if (request.date() != null) {
            tx.setDate(request.date());
        }
        tx.setAmount(request.amount());
        if (request.currency() != null) {
            tx.setCurrency(request.currency());
        }
        tx.setDescription(blankToNull(request.description()));
        tx.setNote(blankToNull(request.note()));
        transactions.save(tx);
        return detail(customerId);
    }

    public CustomerDetailResponse deleteTransaction(Long customerId, Long transactionId) {
        find(customerId);
        CustomerTransaction tx = transactions.findById(transactionId)
                .orElseThrow(() -> NotFoundException.of("Amal", transactionId));
        if (!tx.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Amal bu mijozga tegishli emas");
        }
        transactions.delete(tx);
        return detail(customerId);
    }

    // --------------------------------------------------------------- helpers

    /**
     * Validates the chosen warehouse product, removes the sold quantity
     * from stock (logging a SALE movement) and returns a ledger description.
     */
    private String sellFromWarehouse(Customer customer, CustomerTransactionRequest request) {
        if (request.productId() == null) {
            throw new BadRequestException("Tovar tanlanishi shart");
        }
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new BadRequestException("Tanlangan tovar omborda topilmadi"));
        int qty = request.quantity() == null ? 1 : request.quantity();
        if (qty < 1) {
            throw new BadRequestException("Tovar soni kamida 1 bo'lishi kerak");
        }
        if (product.getQuantity() < qty) {
            throw new BadRequestException("«" + product.getName()
                    + "» — omborda yetarli emas. Qoldiq: " + product.getQuantity() + " dona");
        }
        productService.adjustStock(product.getId(), new StockAdjustRequest(
                -qty, StockReason.SALE, "Mijozga berildi: " + customer.getName()));
        return qty > 1 ? product.getName() + " × " + qty : product.getName();
    }

    private static CustomerResponse toResponse(Customer customer,
                                               List<CustomerTransaction> ledger) {
        Map<Currency, BigDecimal> balances = balancesOf(ledger);
        return Mappers.customer(customer,
                bucket(balances, Currency.UZS), bucket(balances, Currency.USD), ledger.size());
    }

    private static void apply(Customer customer, CustomerRequest request) {
        customer.setName(request.name().strip());
        customer.setPhone(PhoneUtil.normalize(request.phone()));
        customer.setAddress(blankToNull(request.address()));
        customer.setNote(blankToNull(request.note()));
        customer.setBirthday(request.birthday());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private Customer find(Long id) {
        return customers.findById(id).orElseThrow(() -> NotFoundException.of("Mijoz", id));
    }
}
