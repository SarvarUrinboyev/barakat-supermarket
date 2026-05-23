package uz.barakat.market.telegram;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.springframework.stereotype.Component;
import uz.barakat.market.domain.Customer;
import uz.barakat.market.domain.CustomerTransaction;
import uz.barakat.market.domain.CustomerTxType;
import uz.barakat.market.repository.CustomerTransactionRepository;
import uz.barakat.market.service.MoneyFormat;

/**
 * Pushes a Telegram message to a customer when their ledger changes
 * (goods given on credit, or a payment received). Does nothing unless
 * the customer has linked the self-service bot.
 */
@Component
public class CustomerBotNotifier {

    private final CustomerBotProperties properties;
    private final TelegramBotApi api;
    private final CustomerTransactionRepository transactions;

    public CustomerBotNotifier(CustomerBotProperties properties, TelegramBotApi api,
                               CustomerTransactionRepository transactions) {
        this.properties = properties;
        this.api = api;
        this.transactions = transactions;
    }

    /** Notifies the customer about a new ledger line, if they linked the bot. */
    public void notifyTransaction(Customer customer, CustomerTransaction tx) {
        if (!properties.isUsable() || customer.getTelegramChatId() == null) {
            return;
        }
        long chatId = customer.getTelegramChatId();
        // The message and balance are built now (inside the caller's transaction,
        // so the new line is visible); only the HTTP send is done asynchronously.
        String message = buildMessage(customer, tx, balanceOf(customer.getId()));
        CompletableFuture.runAsync(() -> api.sendMessage(chatId, message));
    }

    /** Notifies the customer about a basket of goods given in one go. */
    public void notifyBatch(Customer customer, List<CustomerTransaction> txs) {
        if (!properties.isUsable() || customer.getTelegramChatId() == null || txs.isEmpty()) {
            return;
        }
        long chatId = customer.getTelegramChatId();
        String message = buildBatchMessage(customer, txs, balanceOf(customer.getId()));
        CompletableFuture.runAsync(() -> api.sendMessage(chatId, message));
    }

    private static String buildBatchMessage(Customer customer, List<CustomerTransaction> txs,
                                            BigDecimal balance) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hurmatli ").append(customer.getName()).append("! 👋\n\n");
        sb.append("🛍 Sizga tovar(lar) berildi:\n");
        BigDecimal total = BigDecimal.ZERO;
        for (CustomerTransaction tx : txs) {
            sb.append("• ")
              .append(tx.getDescription() == null ? "tovar" : tx.getDescription())
              .append(" — ").append(MoneyFormat.usd(tx.getAmount())).append('\n');
            total = total.add(tx.getAmount());
        }
        if (txs.size() > 1) {
            sb.append("Jami: ").append(MoneyFormat.usd(total)).append('\n');
        }
        sb.append('\n');
        int cmp = balance.compareTo(BigDecimal.ZERO);
        if (cmp > 0) {
            sb.append("💰 Umumiy qarzingiz: ").append(MoneyFormat.usd(balance));
        } else if (cmp < 0) {
            sb.append("✅ Sizda ortiqcha to'lov: ").append(MoneyFormat.usd(balance.negate()));
        } else {
            sb.append("✅ Qarzingiz yo'q. Rahmat!");
        }
        return sb.toString();
    }

    private static String buildMessage(Customer customer, CustomerTransaction tx,
                                       BigDecimal balance) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hurmatli ").append(customer.getName()).append("! 👋\n\n");
        if (tx.getType() == CustomerTxType.GOODS) {
            sb.append("🛍 Sizga tovar berildi:\n• ")
              .append(tx.getDescription() == null ? "tovar" : tx.getDescription())
              .append(" — ").append(MoneyFormat.usd(tx.getAmount())).append('\n');
        } else {
            sb.append("✅ To'lovingiz qabul qilindi: ")
              .append(MoneyFormat.usd(tx.getAmount())).append('\n');
        }
        sb.append('\n');
        int cmp = balance.compareTo(BigDecimal.ZERO);
        if (cmp > 0) {
            sb.append("💰 Umumiy qarzingiz: ").append(MoneyFormat.usd(balance));
        } else if (cmp < 0) {
            sb.append("✅ Sizda ortiqcha to'lov: ").append(MoneyFormat.usd(balance.negate()));
        } else {
            sb.append("✅ Qarzingiz yo'q. Rahmat!");
        }
        return sb.toString();
    }

    private BigDecimal balanceOf(Long customerId) {
        BigDecimal balance = BigDecimal.ZERO;
        for (CustomerTransaction tx
                : transactions.findByCustomerIdOrderByDateDescIdDesc(customerId)) {
            balance = tx.getType() == CustomerTxType.GOODS
                    ? balance.add(tx.getAmount())
                    : balance.subtract(tx.getAmount());
        }
        return balance;
    }
}
