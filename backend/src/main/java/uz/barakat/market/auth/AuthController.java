package uz.barakat.market.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.auth.AuthDtos.LoginRequest;
import uz.barakat.market.auth.AuthDtos.LoginResponse;
import uz.barakat.market.auth.AuthDtos.MeResponse;
import uz.barakat.market.exception.BadRequestException;

/** Auth endpoints — login + current session. Open (no JWT required). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    /** Returns the current session, or 401 if the token is missing / invalid. */
    @GetMapping("/me")
    public MeResponse me(HttpServletRequest request) {
        Object uid = request.getAttribute(JwtAuthFilter.ATTR_USER_ID);
        if (uid == null) {
            throw new BadRequestException("Sessiya yo'q");
        }
        return service.me((Long) uid);
    }
}
