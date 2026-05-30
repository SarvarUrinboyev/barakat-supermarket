package uz.barakat.market.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import uz.barakat.market.auth.WebSocketAuthInterceptor;

/**
 * STOMP-over-WebSocket configuration.
 *
 * <p>Endpoint: {@code /ws} — clients connect with SockJS fallback so it
 * works behind picky corporate proxies as well as in plain browsers.
 *
 * <p>Destinations are <strong>tenant-scoped</strong>:
 *   <ul>
 *     <li>{@code /topic/shops/{shopId}/sales}  — successful POS sales</li>
 *     <li>{@code /topic/shops/{shopId}/stock}  — stock-quantity changes</li>
 *     <li>{@code /topic/shops/{shopId}/alerts} — low-stock + shop events</li>
 *   </ul>
 * A client may only subscribe to shops in its own account — enforced by
 * {@link WebSocketAuthInterceptor}, which also requires a valid JWT on the
 * STOMP CONNECT frame (the HTTP handshake itself is open).
 *
 * <p>Allowed origins are configurable via {@code app.web.allowed-origins}
 * (comma-separated). Default {@code *} suits the loopback desktop build; the
 * hosted web build must pin this to the portal's real origin.
 *
 * <p>Backed by Spring's simple in-memory broker — fine for &lt; 10k
 * concurrent connections per node. A RabbitMQ/Redis relay can replace it
 * later without touching publishers.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor authInterceptor;
    private final String[] allowedOrigins;

    public WebSocketConfig(WebSocketAuthInterceptor authInterceptor,
                           @Value("${app.web.allowed-origins:*}") String[] allowedOrigins) {
        this.authInterceptor = authInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOrigins);
        registry.addEndpoint("/ws-sockjs").setAllowedOriginPatterns(allowedOrigins).withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Authenticate CONNECT + authorize SUBSCRIBE at the messaging layer.
        registration.interceptors(authInterceptor);
    }
}
