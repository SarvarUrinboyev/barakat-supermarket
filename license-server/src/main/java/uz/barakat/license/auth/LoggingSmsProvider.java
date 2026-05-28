package uz.barakat.license.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

/**
 * Default {@link SmsProvider} that just logs the message instead of
 * actually delivering it. Useful for local dev (you can copy the OTP
 * straight out of the server log) and for CI / unit tests. Swapped
 * automatically when another {@code SmsProvider} bean is registered —
 * we use {@link ConditionalOnMissingBean} so a production
 * {@code @Component} class wins without needing extra wiring.
 */
@Configuration
class LoggingSmsProviderConfig {

    @Bean
    @ConditionalOnMissingBean(SmsProvider.class)
    public SmsProvider loggingSmsProvider() {
        return new LoggingSmsProvider();
    }
}

class LoggingSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsProvider.class);

    @Override
    public boolean send(String phone, String body) {
        log.info("[SMS-LOG] -> phone={} body={}", phone, body);
        return true;
    }
}
