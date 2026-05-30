package uz.barakat.market.auth;

import io.jsonwebtoken.Claims;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import uz.barakat.market.repository.ShopRepository;

/**
 * Authenticates and tenant-scopes the STOMP/WebSocket channel.
 *
 * <p>The HTTP handshake at {@code /ws} is intentionally open (SecurityConfig),
 * so all security is enforced here at the messaging layer:
 * <ul>
 *   <li><b>CONNECT</b> — must carry {@code Authorization: Bearer <jwt>}; the
 *       token is validated and the user's account/role are pinned to the
 *       STOMP session.</li>
 *   <li><b>SUBSCRIBE</b> — a shop-scoped destination
 *       ({@code /topic/shops/{shopId}/**}) is allowed only when that shop
 *       belongs to the session's account (SUPER_ADMIN may watch any). This
 *       stops one merchant from subscribing to another's live feed.</li>
 * </ul>
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    static final String SESSION_ACCOUNT_ID = "savdopro.ws.accountId";
    static final String SESSION_ROLE = "savdopro.ws.role";

    private final JwtService jwt;
    private final ShopRepository shops;

    public WebSocketAuthInterceptor(JwtService jwt, ShopRepository shops) {
        this.jwt = jwt;
        this.shops = shops;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("WS CONNECT requires a Bearer token");
        }
        Claims claims;
        try {
            claims = jwt.parse(header.substring(7));
        } catch (RuntimeException ex) {
            log.debug("WS CONNECT rejected: {}", ex.toString());
            throw new IllegalArgumentException("Invalid WS token");
        }
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("WS token missing subject");
        }
        accessor.setUser(new StompPrincipal(subject));
        var attrs = accessor.getSessionAttributes();
        if (attrs != null) {
            attrs.put(SESSION_ACCOUNT_ID, claims.get("accountId", Long.class));
            attrs.put(SESSION_ROLE, claims.get("role", String.class));
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Long shopId = shopIdOf(accessor.getDestination());
        if (shopId == null) {
            return; // non shop-scoped destination — nothing tenant-specific to guard
        }
        var attrs = accessor.getSessionAttributes();
        Long accountId = attrs == null ? null : (Long) attrs.get(SESSION_ACCOUNT_ID);
        String role = attrs == null ? null : (String) attrs.get(SESSION_ROLE);
        if ("SUPER_ADMIN".equals(role)) {
            return;
        }
        if (accountId == null || !shops.existsByIdAndAccountId(shopId, accountId)) {
            log.warn("WS SUBSCRIBE denied: dest={} accountId={}",
                    accessor.getDestination(), accountId);
            throw new IllegalArgumentException("Not allowed to subscribe to this shop");
        }
    }

    /** Extracts {@code {shopId}} from {@code /topic/shops/{shopId}/...}, else null. */
    static Long shopIdOf(String destination) {
        if (destination == null) {
            return null;
        }
        String prefix = "/topic/shops/";
        if (!destination.startsWith(prefix)) {
            return null;
        }
        String rest = destination.substring(prefix.length());
        int slash = rest.indexOf('/');
        String idPart = slash >= 0 ? rest.substring(0, slash) : rest;
        try {
            return Long.parseLong(idPart);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}
