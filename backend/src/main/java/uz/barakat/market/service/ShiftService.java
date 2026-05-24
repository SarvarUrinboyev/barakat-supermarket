package uz.barakat.market.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.domain.Shift;
import uz.barakat.market.domain.ShiftStatus;
import uz.barakat.market.dto.BalanceRequest;
import uz.barakat.market.dto.EndOfDayReport;
import uz.barakat.market.dto.ShiftOpenRequest;
import uz.barakat.market.dto.ShiftResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.repository.ShiftRepository;
import uz.barakat.market.telegram.TelegramService;

/** Opening, closing and the history of working shifts. */
@Service
@Transactional
public class ShiftService {

    private static final Logger log = LoggerFactory.getLogger(ShiftService.class);

    private final ShiftRepository shifts;
    private final BalanceService balanceService;
    private final ReportService reportService;
    private final ReportPdfService pdfService;
    private final TelegramService telegram;

    public ShiftService(ShiftRepository shifts, BalanceService balanceService,
                        ReportService reportService, ReportPdfService pdfService,
                        TelegramService telegram) {
        this.shifts = shifts;
        this.balanceService = balanceService;
        this.reportService = reportService;
        this.pdfService = pdfService;
        this.telegram = telegram;
    }

    /** The currently open shift, or {@code null} when none is open. */
    @Transactional(readOnly = true)
    public ShiftResponse current() {
        return shifts.findFirstByStatusOrderByOpenedAtDesc(ShiftStatus.OPEN)
                .map(this::toResponse)
                .orElse(null);
    }

    /** Opens a shift and records today's morning balance. */
    public ShiftResponse open(ShiftOpenRequest request) {
        shifts.findFirstByStatusOrderByOpenedAtDesc(ShiftStatus.OPEN).ifPresent(s -> {
            throw new BadRequestException("Smena allaqachon ochiq - avval uni yoping");
        });
        Shift shift = new Shift();
        shift.setOpenedAt(LocalDateTime.now());
        shift.setOpenedBy(request.openedBy() == null || request.openedBy().isBlank()
                ? "Egasi" : request.openedBy().strip());
        shift.setStatus(ShiftStatus.OPEN);
        shifts.save(shift);
        balanceService.set(new BalanceRequest(request.startingCash(), LocalDate.now()));
        return toResponse(shift);
    }

    /**
     * Closes the open shift (if any), pushes today's end-of-day report
     * to Telegram, and (Phase 4.2) attaches the branded sales-report
     * PDF for the day so the owner has a printable receipt sitting in
     * their chat — no need to switch back to the desktop.
     */
    public EndOfDayReport close() {
        shifts.findFirstByStatusOrderByOpenedAtDesc(ShiftStatus.OPEN).ifPresent(shift -> {
            shift.setClosedAt(LocalDateTime.now());
            shift.setStatus(ShiftStatus.CLOSED);
            shifts.save(shift);
        });
        LocalDate today = LocalDate.now();
        EndOfDayReport text = reportService.sendToTelegram(today);
        // Attach the PDF separately so the text summary still posts even
        // if PDF rendering or upload trips on a corner case.
        try {
            byte[] pdf = pdfService.salesReport(today, today);
            telegram.sendDocument(pdf,
                    "savdo-" + today + ".pdf",
                    "📊 Kunlik savdo hisoboti — " + today);
        } catch (RuntimeException ex) {
            log.warn("End-of-shift PDF delivery failed for {}: {}", today, ex.toString());
        }
        return text;
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> history() {
        return shifts.findAllByOrderByOpenedAtDesc().stream().map(this::toResponse).toList();
    }

    /** Removes closed shifts from the history; keeps any open shift. */
    public int clearHistory() {
        List<Shift> closed = shifts.findAllByOrderByOpenedAtDesc().stream()
                .filter(s -> s.getStatus() == ShiftStatus.CLOSED)
                .toList();
        shifts.deleteAll(closed);
        return closed.size();
    }

    private ShiftResponse toResponse(Shift shift) {
        return Mappers.shift(shift, balanceService.startingCash(shift.getOpenedAt().toLocalDate()));
    }
}
