package uz.barakat.market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import uz.barakat.market.dto.ExchangeRateResponse;

/**
 * Fetches the USD -> UZS exchange rate from the Central Bank of
 * Uzbekistan (cbu.uz). The value is cached for the day, so the external
 * API is contacted at most once per day.
 */
@Service
public class ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);
    private static final String CBU_USD_URL =
            "https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();
    private final ObjectMapper objectMapper;

    private volatile ExchangeRateResponse cached;

    public ExchangeRateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Today's USD rate; fetched from CBU once a day, cached in between. */
    public ExchangeRateResponse current() {
        LocalDate today = LocalDate.now();
        ExchangeRateResponse snapshot = cached;
        if (snapshot != null && snapshot.available() && today.equals(snapshot.date())) {
            return snapshot;
        }
        ExchangeRateResponse fresh = fetch(today);
        if (fresh.available()) {
            cached = fresh;
            return fresh;
        }
        // Fetch failed - fall back to the last known good value, if any.
        return snapshot != null ? snapshot : fresh;
    }

    private ExchangeRateResponse fetch(LocalDate today) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(CBU_USD_URL))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("CBU exchange-rate request failed: HTTP {}", response.statusCode());
                return unavailable(today);
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode entry = root.isArray() && root.size() > 0 ? root.get(0) : null;
            if (entry == null || entry.get("Rate") == null) {
                return unavailable(today);
            }
            BigDecimal rate = new BigDecimal(entry.get("Rate").asText().trim());
            log.info("USD exchange rate fetched from CBU: {}", rate);
            return new ExchangeRateResponse(rate, today, true);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return unavailable(today);
        } catch (Exception ex) {
            log.warn("Could not fetch the exchange rate: {}", ex.toString());
            return unavailable(today);
        }
    }

    private static ExchangeRateResponse unavailable(LocalDate today) {
        return new ExchangeRateResponse(null, today, false);
    }
}
