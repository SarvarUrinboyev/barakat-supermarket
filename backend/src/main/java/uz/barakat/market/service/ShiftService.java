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
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.repository.ShiftRepository;

/** Opening, closing and the history of working shifts. */
@Service
@Transactional
public class ShiftService {

    private final ShiftRepository shifts;
    private final BalanceService balanceService;
    private final ReportService reportService;

    public ShiftService(ShiftRepository shifts, BalanceService balanceService,
                        ReportService reportService) {
        this.shifts = shifts;
        this.balanceService = balanceService;
        this.reportService = reportService;
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
     * Closes the open shift (if any), then builds today's end-of-day
     * report and pushes it to Telegram.
     */
    public EndOfDayReport close() {
        shifts.findFirstByStatusOrderByOpenedAtDesc(ShiftStatus.OPEN).ifPresent(shift -> {
            shift.setClosedAt(LocalDateTime.now());
            shift.setStatus(ShiftStatus.CLOSED);
            shifts.save(shift);
        });
        return reportService.sendToTelegram(LocalDate.now());
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
