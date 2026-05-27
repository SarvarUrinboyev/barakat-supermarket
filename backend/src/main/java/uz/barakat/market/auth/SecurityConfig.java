package uz.barakat.market.auth;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security wiring for the desktop's local backend.
 *
 * <p>Phase 2: login is no longer served here — it lives on the central
 * License Server. The local backend only validates JWTs issued upstream
 * (shared HMAC secret) and serves tenant-scoped data endpoints. As a
 * result the only public paths are health probes and the SPA shell.
 *
 * <p>CSRF is disabled (stateless REST) and form login is disabled (the
 * React SPA owns the login UI and posts to the License Server directly).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(reg -> reg
                        // FORWARD/INCLUDE dispatches (e.g. from SpaController) are
                        // always permitted — prevents StackOverflowError in Spring
                        // Security 6 when the filter chain re-processes a forward.
                        .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.INCLUDE).permitAll()
                        // Public endpoints — health probe and static shell.
                        .requestMatchers("/api/health/**").permitAll()
                        // WebSocket handshake — STOMP CONNECT frame can carry
                        // the JWT in its native auth header; we don't gate it
                        // at the HTTP layer.
                        .requestMatchers("/ws/**", "/ws-sockjs/**").permitAll()
                        // OpenAPI / Swagger UI — public REST docs.
                        .requestMatchers(
                                "/v3/api-docs/**", "/v3/api-docs.yaml",
                                "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Static frontend bundle.
                        .requestMatchers("/", "/index.html", "/assets/**",
                                "/favicon.ico", "/icon.svg").permitAll()
                        // Everything else under /api requires a valid JWT.
                        .requestMatchers("/api/**").authenticated()
                        // Anything else (SPA deep-links) is served as-is.
                        .anyRequest().permitAll())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                res.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
