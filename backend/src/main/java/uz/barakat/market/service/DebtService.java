package uz.barakat.market.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.CustomerDebt;
import uz.barakat.market.domain.DebtEntryType;
import uz.barakat.market.domain.DebtPayment;
import uz.barakat.market.domain.Debtor;
import uz.barakat.market.dto.CustomerDebtRequest;
import uz.barakat.market.dto.CustomerDebtResponse;
import uz.barakat.market.dto.DebtPaymentRequest;
import uz.barakat.market.dto.DebtPaymentResponse;
import uz.barakat.market.dto.DebtSummary;
import uz.barakat.market.dto.DebtorRequest;
import uz.barakat.market.dto.DebtorResponse;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.CustomerDebtRepository;
import uz.barakat.market.repository.DebtPaymentRepository;
import uz.barakat.market.repository.DebtorRepository;

/**
 * Both sides of the Debt page: "my debts" (owed to suppliers) and
 * "debts owed to us" (owed by customers), plus the shared payment history.
 */
@Service
@Transactional
public class DebtService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final DebtorRepository debtors;
    private final CustomerDebtRepository customerDebts;
    private final DebtPaymentRepository payments;

    public DebtService(DebtorRepository debtors, CustomerDebtRepository customerDebts,
                       DebtPaymentRepository payments) {
        this.debtors = debtors;
        this.customerDebts = customerDebts;
        this.payments = payments;
    }

    /** Both lists and their outstanding totals. */
    @Transactional(readOnly = true)
    public DebtSummary summary() {
        List<DebtorResponse> mine = listMyDebts();
        List<CustomerDebtResponse> theirs = listCustomerDebts();
        return new DebtSummary(mine, theirs, totalRemaining(mine, DebtorResponse::remainingAmount),
                totalRemaining(theirs, CustomerDebtResponse::remainingAmount));
    }

    /** Sum of the outstanding "my debts" - the dashboard "Umumiy qarz" value. */
    @Transactional(readOnly = true)
    public BigDecimal totalMyDebt() {
        return debtors.findByPaidFalse().stream()
                .map(d -> Mappers.remaining(d.getOriginalAmount(), d.getPaidAmount()))
                .reduce(ZERO, BigDecimal::add);
    }

    // ---------------------------------------------------------------- my debts

    @Transactional(readOnly = true)
    public List<DebtorResponse> listMyDebts() {
        return debtors.findAllByOrderByPaidAscDateDescIdDesc().stream()
                .map(Mappers::debtor).toList();
    }

    public DebtorResponse createMyDebt(DebtorRequest request) {
        Debtor debtor = new Debtor();
        debtor.setDate(request.date() != null ? request.date() : LocalDate.now());
        debtor.setName(request.name().strip());
        debtor.setProductName(request.productName());
        debtor.setOriginalAmount(request.originalAmount());
        debtor.setPaidAmount(request.paidAmount() != null ? request.paidAmount() : ZERO);
        debtor.setNote(request.note());
        debtor.setPaid(fullyPaid(debtor.getPaidAmount(), debtor.getOriginalAmount()));
        return Mappers.debtor(debtors.save(debtor));
    }

    public DebtorResponse updateMyDebt(Long id, DebtorRequest request) {
        Debtor debtor = findDebtor(id);
        debtor.setDate(request.date() != null ? request.date() : debtor.getDate());
        debtor.setName(request.name().strip());
        debtor.setProductName(request.productName());
        debtor.setOriginalAmount(request.originalAmount());
        if (request.paidAmount() != null) {
            debtor.setPaidAmount(request.paidAmount());
        }
        debtor.setNote(request.note());
        debtor.setPaid(fullyPaid(debtor.getPaidAmount(), debtor.getOriginalAmount()));
        return Mappers.debtor(debtors.save(debtor));
    }

    public void deleteMyDebt(Long id) {
        debtors.delete(findDebtor(id));
    }

    /** Partial payment towards a "my debt". */
    public DebtorResponse payMyDebt(Long id, DebtPaymentRequest request) {
        Debtor debtor = findDebtor(id);
        debtor.setPaidAmount(debtor.getPaidAmount().add(request.amount()));
        debtor.setPaid(fullyPaid(debtor.getPaidAmount(), debtor.getOriginalAmount()));
        debtors.save(debtor);
        recordHistory(id, null, request, DebtEntryType.PAYMENT);
        return Mappers.debtor(debtor);
    }

    /** Adds more to an existing "my debt" ("+ Qo'sh"). */
    public DebtorResponse addToMyDebt(Long id, DebtPaymentRequest request) {
        Debtor debtor = findDebtor(id);
        debtor.setOriginalAmount(debtor.getOriginalAmount().add(request.amount()));
        debtor.setPaid(fullyPaid(debtor.getPaidAmount(), debtor.getOriginalAmount()));
        debtors.save(debtor);
        recordHistory(id, null, request, DebtEntryType.INCREASE);
        return Mappers.debtor(debtor);
    }

    @Transactional(readOnly = true)
    public List<DebtPaymentResponse> myDebtHistory(Long id) {
        findDebtor(id);
        return payments.findByDebtorIdOrderByPaymentDateDescIdDesc(id).stream()
                .map(Mappers::debtPayment).toList();
    }

    // --------------------------------------------------------- customer debts

    @Transactional(readOnly = true)
    public List<CustomerDebtResponse> listCustomerDebts() {
        return customerDebts.findAllByOrderByPaidAscDateDescIdDesc().stream()
                .map(Mappers::customerDebt).toList();
    }

    public CustomerDebtResponse createCustomerDebt(CustomerDebtRequest request) {
        CustomerDebt debt = new CustomerDebt();
        debt.setDate(request.date() != null ? request.date() : LocalDate.now());
        debt.setCustomerName(request.customerName().strip());
        debt.setProductName(request.productName());
        debt.setOriginalAmount(request.originalAmount());
        debt.setPaidAmount(request.paidAmount() != null ? request.paidAmount() : ZERO);
        debt.setNote(request.note());
        debt.setPaid(fullyPaid(debt.getPaidAmount(), debt.getOriginalAmount()));
        return Mappers.customerDebt(customerDebts.save(debt));
    }

    public CustomerDebtResponse updateCustomerDebt(Long id, CustomerDebtRequest request) {
        CustomerDebt debt = findCustomerDebt(id);
        debt.setDate(request.date() != null ? request.date() : debt.getDate());
        debt.setCustomerName(request.customerName().strip());
        debt.setProductName(request.productName());
        debt.setOriginalAmount(request.originalAmount());
        if (request.paidAmount() != null) {
            debt.setPaidAmount(request.paidAmount());
        }
        debt.setNote(request.note());
        debt.setPaid(fullyPaid(debt.getPaidAmount(), debt.getOriginalAmount()));
        return Mappers.customerDebt(customerDebts.save(debt));
    }

    public void deleteCustomerDebt(Long id) {
        customerDebts.delete(findCustomerDebt(id));
    }

    public CustomerDebtResponse payCustomerDebt(Long id, DebtPaymentRequest request) {
        CustomerDebt debt = findCustomerDebt(id);
        debt.setPaidAmount(debt.getPaidAmount().add(request.amount()));
        debt.setPaid(fullyPaid(debt.getPaidAmount(), debt.getOriginalAmount()));
        customerDebts.save(debt);
        recordHistory(null, id, request, DebtEntryType.PAYMENT);
        return Mappers.customerDebt(debt);
    }

    public CustomerDebtResponse addToCustomerDebt(Long id, DebtPaymentRequest request) {
        CustomerDebt debt = findCustomerDebt(id);
        debt.setOriginalAmount(debt.getOriginalAmount().add(request.amount()));
        debt.setPaid(fullyPaid(debt.getPaidAmount(), debt.getOriginalAmount()));
        customerDebts.save(debt);
        recordHistory(null, id, request, DebtEntryType.INCREASE);
        return Mappers.customerDebt(debt);
    }

    @Transactional(readOnly = true)
    public List<DebtPaymentResponse> customerDebtHistory(Long id) {
        findCustomerDebt(id);
        return payments.findByCustomerDebtIdOrderByPaymentDateDescIdDesc(id).stream()
                .map(Mappers::debtPayment).toList();
    }

    // ----------------------------------------------------------------- shared

    private void recordHistory(Long debtorId, Long customerDebtId,
                               DebtPaymentRequest request, DebtEntryType type) {
        DebtPayment payment = new DebtPayment();
        payment.setDebtorId(debtorId);
        payment.setCustomerDebtId(customerDebtId);
        payment.setPaymentDate(request.date() != null ? request.date() : LocalDate.now());
        payment.setAmount(request.amount());
        payment.setEntryType(type);
        payment.setNote(request.note());
        payments.save(payment);
    }

    private static boolean fullyPaid(BigDecimal paid, BigDecimal original) {
        return paid.compareTo(original) >= 0;
    }

    private static <T> BigDecimal totalRemaining(
            List<T> items, java.util.function.Function<T, BigDecimal> remaining) {
        return items.stream().map(remaining).reduce(ZERO, BigDecimal::add);
    }

    private Debtor findDebtor(Long id) {
        return debtors.findById(id).orElseThrow(() -> NotFoundException.of("Mening qarzim", id));
    }

    private CustomerDebt findCustomerDebt(Long id) {
        return customerDebts.findById(id)
                .orElseThrow(() -> NotFoundException.of("Mijoz qarzi", id));
    }
}
