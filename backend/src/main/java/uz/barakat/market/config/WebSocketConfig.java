package uz.barakat.market.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket configuration.
 *
 * <p>Endpoint: {@code /ws} — clients connect with SockJS fallback so it
 * works behind picky corporate proxies as well as in plain browsers.
 *
 * <p>Destinations:
 *   <ul>
 *     <li>{@code /topic/sales}  — every successful POS sale is broadcast here
 *         (live cashbox feed, multi-monitor dashboards).</li>
 *     <li>{@code /topic/stock}  — every stock-quantity change (sale, delivery,
 *         correction, transfer). Powers the live warehouse view.</li>
 *     <li>{@code /topic/alerts} — low-stock + system events.</li>
 *   </ul>
 *
 * <p>Backed by Spring's simple in-memory broker — fine for &lt; 10k
 * concurrent connections per node, which dwarfs our load. If we ever
 * need horizontal scaling we'd swap this for a RabbitMQ/Redis broker
 * relay; the {@code @MessageMapping}s would stay unchanged.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws")
                .setAllowedOriginPatterns("*"); // desktop + LAN, no CSRF concern
        // Also register a SockJS fallback for older browsers / corporate proxies.
        registry
                .addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
