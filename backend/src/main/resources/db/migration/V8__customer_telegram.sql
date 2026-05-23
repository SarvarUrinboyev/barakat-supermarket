-- ====================================================================
--  Barakat SuperMarket - customer Telegram link (V8)
--  Stores the Telegram chat id once a customer links the self-service
--  bot, so the shop can push debt / goods notifications to them.
-- ====================================================================

ALTER TABLE customers ADD COLUMN telegram_chat_id BIGINT;

CREATE INDEX idx_customers_telegram ON customers(telegram_chat_id);
