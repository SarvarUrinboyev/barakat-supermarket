package uz.barakat.market.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards client-side router paths to the React entry point so that a
 * page refresh on e.g. {@code /expenses} still serves the SPA instead
 * of returning 404.
 */
@Controller
public class SpaController {

    @GetMapping({
            "/",
            "/dashboard",
            "/expenses",
            "/home-expenses",
            "/orders",
            "/warehouse",
            "/warehouse/**",
            "/debt",
            "/shift-history",
            "/shift-close"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
