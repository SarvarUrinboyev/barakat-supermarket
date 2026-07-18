package uz.barakat.market.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.barakat.market.dto.SavdoGraphB3Dtos.AskStoreRequest;
import uz.barakat.market.dto.SavdoGraphB3Dtos.AskStoreResponse;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.service.savdograph.copilot.StoreCopilotService;

/** Read-permission B3 endpoint. It exposes no provider protocol or mutation capability. */
@RestController
@RequestMapping("/api/savdograph")
public class SavdoGraphB3Controller {

    static final long MAX_REQUEST_BYTES = 16_384;
    private final StoreCopilotService service;

    public SavdoGraphB3Controller(StoreCopilotService service) {
        this.service = service;
    }

    @PostMapping("/ask")
    public AskStoreResponse ask(@Valid @RequestBody AskStoreRequest request,
                                HttpServletRequest servletRequest) {
        long contentLength = servletRequest.getContentLengthLong();
        if (contentLength > MAX_REQUEST_BYTES) {
            throw new BadRequestException("SavdoGraph ask request body is too large");
        }
        return service.ask(request);
    }
}
