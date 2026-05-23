package uz.barakat.market.telegram;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import uz.barakat.market.dto.DashboardResponse;
import uz.barakat.market.dto.OrderResponse;
import uz.barakat.market.service.DashboardService;
import uz.barakat.market.service.MoneyFormat;

/**
 * Scheduled Telegram reminders: an 08:00 briefing of the day ahead and a
 * 22:00 nudge to close the shift. Cron expressions come from configuration.
 */
@Component
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final DashboardService dashboardService;
    private final TelegramService telegramService;

    public NotificationScheduler(DashboardService dashboardService,
                                 TelegramService telegramService) {
        this.dashboardService = dashboardService;
        this.telegramService = telegramService;
    }

    /** Morning briefing: today's deliveries, overdue orders and total debt. */
    @Scheduled(cron = "${telegram.morning-reminder-cron}")
    public void morningReminder() {
        log.info("Running morning Telegram reminder");
        DashboardResponse dash = dashboardService.today();
        StringBuilder sb = new StringBuilder();
        sb.append("BARAKAT SUPERMARKET\n");
        sb.append("Ertalabgi eslatma - ").append(LocalDate.now().format(DATE)).append("\n\n");

        sb.append("BUGUN KELADI\n");
        if (dash.ordersToday().isEmpty()) {
            sb.append("- Buyurtma yo'q\n");
        } else {
            for (OrderResponse o : dash.ordersToday()) {
                sb.append("- ").append(o.name()).append('\n');
            }
        }

        if (!dash.ordersOverdue().isEmpty()) {
            sb.append("\nKELMAGAN (muddati o'tgan)\n");
            for (OrderResponse o : dash.ordersOverdue()) {
                sb.append("- ").append(o.name())
                        .append(" (").append(o.deliveryDate().format(DATE)).append(")\n");
            }
        }

        sb.append("\nUmumiy qarz: ").append(MoneyFormat.usd(dash.totalDebt())).append('\n');
        sb.append("Yaxshi savdo tilaymiz!");
        telegramService.sendMessage(sb.toString());
    }

    /** Evening nudge to close the shift. */
    @Scheduled(cron = "${telegram.evening-reminder-cron}")
    public void eveningReminder() {
        log.info("Running evening Telegram reminder");
        DashboardResponse dash = dashboardService.today();
        String message = "BARAKAT SUPERMARKET\n"
                + "Smena yopish eslatmasi - " + LocalDate.now().format(DATE) + "\n\n"
                + "Bugungi xarajat: " + MoneyFormat.usd(dash.todayExpenseTotal()) + "\n"
                + "Smenani yopishni va hisobotni yuborishni unutmang.";
        telegramService.sendMessage(message);
    }
}
