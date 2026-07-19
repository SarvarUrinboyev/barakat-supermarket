package uz.barakat.market.license;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/**
 * Small, synchronous gateway from the public backend to the private License
 * Server. It deliberately has no generic proxy endpoint: the controller passes
 * a {@link LicenseGatewayRoute} from a fixed allowlist only.
 */
@Service
public class LicenseGatewayService {

    private static final String JSON = "application/json";
    private static final String USER_AGENT = "SavdoGraph-License-Gateway/1";
    private static final int DEFAULT_MAX_REQUEST_BYTES = 262_144;
    private static final int DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;

    private final HttpClient http;
    private final String licenseBase;
    private final Duration responseTimeout;
    private final int maxRequestBytes;
    private final int maxResponseBytes;

    public LicenseGatewayService(
            @Value("${license.gateway.server-url:http://127.0.0.1:9090}") String licenseServerUrl,
            @Value("${LICENSE_GATEWAY_CONNECT_TIMEOUT_MS:3000}") long connectTimeoutMs,
            @Value("${LICENSE_GATEWAY_RESPONSE_TIMEOUT_MS:8000}") long responseTimeoutMs,
            @Value("${LICENSE_GATEWAY_MAX_REQUEST_BYTES:262144}") int configuredMaxRequestBytes,
            @Value("${LICENSE_GATEWAY_MAX_RESPONSE_BYTES:1048576}") int configuredMaxResponseBytes) {
        this.licenseBase = normalizedBase(licenseServerUrl);
        this.responseTimeout = Duration.ofMillis(boundedTimeout(responseTimeoutMs));
        this.maxRequestBytes = boundedSize(configuredMaxRequestBytes, DEFAULT_MAX_REQUEST_BYTES);
        this.maxResponseBytes = boundedSize(configuredMaxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES);
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(boundedTimeout(connectTimeoutMs)))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public ResponseEntity<byte[]> forward(HttpServletRequest incoming, LicenseGatewayRoute route) {
        if (incoming.getQueryString() != null) {
            return error(HttpStatus.BAD_REQUEST, "LICENSE_QUERY_NOT_ALLOWED");
        }
        return forward(incoming, route, route.upstreamPath());
    }

    public ResponseEntity<byte[]> forward(HttpServletRequest incoming, LicenseGatewayRoute route,
                                          String upstreamPathAndQuery) {
        byte[] requestBody;
        try {
            requestBody = readRequestBody(incoming, route);
        } catch (PayloadTooLargeException ex) {
            return error(HttpStatus.PAYLOAD_TOO_LARGE, "LICENSE_REQUEST_TOO_LARGE");
        } catch (InvalidRequestException ex) {
            return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "LICENSE_JSON_REQUIRED");
        } catch (IOException ex) {
            return error(HttpStatus.BAD_REQUEST, "LICENSE_REQUEST_INVALID");
        }

        HttpRequest.Builder upstream = HttpRequest.newBuilder()
                .uri(URI.create(licenseBase + upstreamPathAndQuery))
                .timeout(responseTimeout)
                .header(HttpHeaders.ACCEPT, JSON)
                .header(HttpHeaders.USER_AGENT, USER_AGENT);
        String authorization = incoming.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith("Bearer ")) {
            upstream.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        if (route.jsonBody()) {
            upstream.header(HttpHeaders.CONTENT_TYPE, JSON)
                    .method(route.method().name(), HttpRequest.BodyPublishers.ofByteArray(requestBody));
        } else {
            upstream.method(route.method().name(), HttpRequest.BodyPublishers.noBody());
        }

        try {
            HttpResponse<InputStream> response = http.send(upstream.build(), HttpResponse.BodyHandlers.ofInputStream());
            int status = response.statusCode();
            try (InputStream responseBody = response.body()) {
                if (status >= 300 && status < 400) {
                    return error(HttpStatus.BAD_GATEWAY, "LICENSE_REDIRECT_REJECTED");
                }
                if (status >= 500) {
                    return error(HttpStatus.BAD_GATEWAY, "LICENSE_UNAVAILABLE");
                }
                if (status == HttpStatus.NO_CONTENT.value()) {
                    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
                }
                byte[] body = readBounded(responseBody, maxResponseBytes);
                if (!isJson(response.headers().firstValue(HttpHeaders.CONTENT_TYPE).orElse(null))) {
                    return error(HttpStatus.BAD_GATEWAY, "LICENSE_RESPONSE_INVALID");
                }
                if (containsPrivateHostname(body)) {
                    return error(HttpStatus.BAD_GATEWAY, "LICENSE_RESPONSE_INVALID");
                }
                return ResponseEntity.status(status)
                        .contentType(MediaType.APPLICATION_JSON)
                        .cacheControl(CacheControl.noStore())
                        .body(body);
            }
        } catch (PayloadTooLargeException ex) {
            return error(HttpStatus.BAD_GATEWAY, "LICENSE_RESPONSE_TOO_LARGE");
        } catch (HttpTimeoutException ex) {
            return error(HttpStatus.GATEWAY_TIMEOUT, "LICENSE_TIMEOUT");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return error(HttpStatus.SERVICE_UNAVAILABLE, "LICENSE_UNAVAILABLE");
        } catch (Exception ex) {
            // Deliberately avoid logging the upstream URL, body, headers, or token.
            return error(HttpStatus.BAD_GATEWAY, "LICENSE_UNAVAILABLE");
        }
    }

    public static ResponseEntity<byte[]> badRequest(String code) {
        return error(HttpStatus.BAD_REQUEST, code);
    }

    private byte[] readRequestBody(HttpServletRequest incoming, LicenseGatewayRoute route)
            throws IOException, PayloadTooLargeException, InvalidRequestException {
        long declaredLength = incoming.getContentLengthLong();
        if (!route.jsonBody()) {
            if (declaredLength > 0) {
                throw new InvalidRequestException();
            }
            return new byte[0];
        }
        if (!isJson(incoming.getContentType())) {
            throw new InvalidRequestException();
        }
        if (declaredLength > maxRequestBytes) {
            throw new PayloadTooLargeException();
        }
        return readBounded(incoming.getInputStream(), maxRequestBytes);
    }

    private static byte[] readBounded(InputStream stream, int maxBytes)
            throws IOException, PayloadTooLargeException {
        byte[] body = stream.readNBytes(maxBytes + 1);
        if (body.length > maxBytes) {
            throw new PayloadTooLargeException();
        }
        return body;
    }

    private static boolean isJson(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return false;
        }
        try {
            MediaType type = MediaType.parseMediaType(contentType);
            return "application".equalsIgnoreCase(type.getType())
                    && ("json".equalsIgnoreCase(type.getSubtype())
                    || type.getSubtype().toLowerCase(Locale.ROOT).endsWith("+json"));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static boolean containsPrivateHostname(byte[] body) {
        return new String(body, StandardCharsets.UTF_8)
                .toLowerCase(Locale.ROOT)
                .contains("railway.internal");
    }

    private static ResponseEntity<byte[]> error(HttpStatus status, String code) {
        String body = "{\"code\":\"" + code + "\",\"message\":\"License xizmati hozir mavjud emas\"}";
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .cacheControl(CacheControl.noStore())
                .body(body.getBytes(StandardCharsets.UTF_8));
    }

    private static String normalizedBase(String raw) {
        try {
            URI parsed = new URI(raw == null ? "" : raw.trim());
            if ((!("http".equalsIgnoreCase(parsed.getScheme()) || "https".equalsIgnoreCase(parsed.getScheme())))
                    || parsed.getHost() == null || parsed.getUserInfo() != null
                    || parsed.getRawQuery() != null || parsed.getRawFragment() != null
                    || (parsed.getRawPath() != null && !parsed.getRawPath().isBlank()
                    && !"/".equals(parsed.getRawPath()))) {
                throw new IllegalArgumentException("Invalid LICENSE_SERVER_URL");
            }
            return parsed.getScheme() + "://" + parsed.getAuthority();
        } catch (URISyntaxException | IllegalArgumentException ex) {
            throw new IllegalStateException("LICENSE_SERVER_URL must be an http(s) origin without a path or query");
        }
    }

    private static long boundedTimeout(long configured) {
        return Math.max(100L, Math.min(configured, 30_000L));
    }

    private static int boundedSize(int configured, int fallback) {
        if (configured < 1024) {
            return fallback;
        }
        return Math.min(configured, 4 * 1024 * 1024);
    }

    private static final class PayloadTooLargeException extends Exception { }

    private static final class InvalidRequestException extends Exception { }
}
