package uz.barakat.market.service.savdograph;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.barakat.market.auth.TenantContext;
import uz.barakat.market.domain.ActionLedgerEvent;
import uz.barakat.market.domain.AnalysisRun;
import uz.barakat.market.domain.AnalysisRunStatus;
import uz.barakat.market.domain.DecisionProposal;
import uz.barakat.market.domain.DecisionProposalStatus;
import uz.barakat.market.domain.EvidenceItem;
import uz.barakat.market.domain.EvidenceType;
import uz.barakat.market.domain.Product;
import uz.barakat.market.domain.ProposalDecision;
import uz.barakat.market.domain.ProposalDecisionType;
import uz.barakat.market.domain.PurchaseOrderStatus;
import uz.barakat.market.dto.PurchaseDtos.LineRequest;
import uz.barakat.market.dto.PurchaseDtos.PoRequest;
import uz.barakat.market.dto.PurchaseDtos.PoResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ActionLedgerResponse;
import uz.barakat.market.dto.SavdoGraphDtos.AnalysisRunRequest;
import uz.barakat.market.dto.SavdoGraphDtos.AnalysisRunResponse;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionRequest;
import uz.barakat.market.dto.SavdoGraphDtos.DecisionResponse;
import uz.barakat.market.dto.SavdoGraphDtos.EvidenceResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ProposalRequest;
import uz.barakat.market.dto.SavdoGraphDtos.ProposalResponse;
import uz.barakat.market.dto.SavdoGraphDtos.ReorderEvidenceRequest;
import uz.barakat.market.exception.BadRequestException;
import uz.barakat.market.exception.ConflictException;
import uz.barakat.market.exception.ForbiddenException;
import uz.barakat.market.exception.NotFoundException;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.AnalysisRunRepository;
import uz.barakat.market.repository.DecisionProposalRepository;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProductRepository;
import uz.barakat.market.repository.ProposalDecisionRepository;
import uz.barakat.market.repository.SupplierRepository;
import uz.barakat.market.service.PurchaseOrderService;

/**
 * Narrow B1 application boundary. It accepts no client-supplied numeric claim:
 * the only reorder quantity is calculated from the tenant's current product
 * stock and configured low-stock threshold, then persisted as immutable evidence.
 */
@Service
@Transactional
public class SavdoGraphService {

    private static final String REORDER_LOW_STOCK = "REORDER_LOW_STOCK";
    private static final String CALCULATION_ID = "LOW_STOCK_THRESHOLD_REORDER";
    private static final String CALCULATION_VERSION = "B1";
    private static final String TOOL_VERSION = "savdograph-b1";

    private final AnalysisRunRepository analysisRuns;
    private final EvidenceItemRepository evidenceItems;
    private final DecisionProposalRepository proposals;
    private final ProposalDecisionRepository decisions;
    private final ActionLedgerEventRepository ledger;
    private final ProductRepository products;
    private final SupplierRepository suppliers;
    private final PurchaseOrderService purchaseOrders;
    private final ObjectMapper objectMapper;

    public SavdoGraphService(AnalysisRunRepository analysisRuns,
                             EvidenceItemRepository evidenceItems,
                             DecisionProposalRepository proposals,
                             ProposalDecisionRepository decisions,
                             ActionLedgerEventRepository ledger,
                             ProductRepository products,
                             SupplierRepository suppliers,
                             PurchaseOrderService purchaseOrders,
                             ObjectMapper objectMapper) {
        this.analysisRuns = analysisRuns;
        this.evidenceItems = evidenceItems;
        this.proposals = proposals;
        this.decisions = decisions;
        this.ledger = ledger;
        this.products = products;
        this.suppliers = suppliers;
        this.purchaseOrders = purchaseOrders;
        this.objectMapper = objectMapper;
    }

    public AnalysisRunResponse createAnalysisRun(AnalysisRunRequest request) {
        requireSupportedAnalysisType(request.analysisType());
        if (request.periodFrom().isAfter(request.periodTo())) {
            throw new BadRequestException("Tahlil davrining boshlanishi tugashidan keyin bo'lishi mumkin emas");
        }

        long shopId = requireSingleShop();
        String actor = currentActor();
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("analysisType", REORDER_LOW_STOCK);
        input.put("periodFrom", request.periodFrom());
        input.put("periodTo", request.periodTo());
        input.put("toolVersion", TOOL_VERSION);
        String snapshot = json(input);

        AnalysisRun run = new AnalysisRun();
        run.setShopId(shopId);
        run.setAnalysisType(REORDER_LOW_STOCK);
        run.setPeriodFrom(request.periodFrom());
        run.setPeriodTo(request.periodTo());
        run.setStatus(AnalysisRunStatus.RECORDED);
        run.setInitiatedBy(actor);
        run.setToolVersion(TOOL_VERSION);
        run.setInputSnapshot(snapshot);
        run.setInputHash(sha256(snapshot));
        return toResponse(analysisRuns.save(run));
    }

    @Transactional(readOnly = true)
    public List<AnalysisRunResponse> listAnalysisRuns() {
        requireSingleShop();
        return analysisRuns.findAllByOrderByIdDesc().stream().map(SavdoGraphService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AnalysisRunResponse getAnalysisRun(Long id) {
        requireSingleShop();
        return toResponse(findRun(id));
    }

    public EvidenceResponse createReorderEvidence(ReorderEvidenceRequest request) {
        long shopId = requireSingleShop();
        AnalysisRun run = findRun(request.analysisRunId());
        if (!REORDER_LOW_STOCK.equals(run.getAnalysisType())) {
            throw new BadRequestException("Bu tahlil turi qayta-buyurtma dalilini qo'llab-quvvatlamaydi");
        }
        Product product = products.findById(request.productId()).orElseThrow(
                () -> NotFoundException.of("Mahsulot", request.productId()));

        int recommendation = Math.max(0, product.getLowStockThreshold() - product.getQuantity());
        if (recommendation <= 0) {
            throw new BadRequestException(
                    "Tasdiqlanmagan miqdor rad etildi: mahsulotda ijobiy server-hisoblangan qayta-buyurtma yo'q");
        }

        Map<String, Object> inputs = new LinkedHashMap<>();
        inputs.put("productId", product.getId());
        inputs.put("currentQuantity", product.getQuantity());
        inputs.put("lowStockThreshold", product.getLowStockThreshold());
        inputs.put("recommendedQuantity", recommendation);
        inputs.put("unit", product.getUnit());
        inputs.put("currency", product.getCurrency());
        String inputData = json(inputs);
        EvidenceItem evidence = new EvidenceItem();
        evidence.setShopId(shopId);
        evidence.setAnalysisRunId(run.getId());
        evidence.setProductId(product.getId());
        evidence.setEvidenceType(EvidenceType.REORDER_QUANTITY);
        evidence.setSourceType("PRODUCT_STOCK");
        evidence.setPeriodFrom(run.getPeriodFrom());
        evidence.setPeriodTo(run.getPeriodTo());
        evidence.setCalculationId(CALCULATION_ID);
        evidence.setCalculationVersion(CALCULATION_VERSION);
        evidence.setInputData(inputData);
        evidence.setCalculatedResult(BigDecimal.valueOf(recommendation));
        evidence.setUnit(product.getUnit());
        evidence.setCurrency(product.getCurrency());
        evidence.setHashVersion(EvidenceContentHasher.HASH_VERSION);
        evidence.setContentHash(EvidenceContentHasher.hash(evidence));
        return toResponse(evidenceItems.save(evidence));
    }

    @Transactional(readOnly = true)
    public List<EvidenceResponse> listEvidence() {
        requireSingleShop();
        return evidenceItems.findAllByOrderByIdDesc().stream().map(SavdoGraphService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EvidenceResponse getEvidence(Long id) {
        requireSingleShop();
        return toResponse(findEvidence(id));
    }

    public ProposalResponse createProposal(ProposalRequest request) {
        long shopId = requireSingleShop();
        AnalysisRun run = findRun(request.analysisRunId());
        if (!REORDER_LOW_STOCK.equals(run.getAnalysisType())) {
            throw new BadRequestException("Faqat REORDER_LOW_STOCK tahlili uchun taklif yaratiladi");
        }
        if (request.evidenceIds().size() != Set.copyOf(request.evidenceIds()).size()) {
            throw new BadRequestException("Dalil identifikatorlari takrorlanmasligi kerak");
        }
        List<EvidenceItem> evidence = request.evidenceIds().stream()
                .map(this::findEvidence)
                .sorted(Comparator.comparing(EvidenceItem::getId))
                .toList();
        EvidenceItem quantityEvidence = supportedQuantityEvidence(run, evidence);
        products.findById(quantityEvidence.getProductId()).orElseThrow(
                () -> NotFoundException.of("Mahsulot", quantityEvidence.getProductId()));
        suppliers.findById(request.supplierId()).orElseThrow(
                () -> NotFoundException.of("Yetkazib beruvchi", request.supplierId()));

        int quantity;
        try {
            quantity = quantityEvidence.getCalculatedResult().intValueExact();
        } catch (ArithmeticException ex) {
            throw new BadRequestException("Dalildagi qayta-buyurtma miqdori butun musbat son bo'lishi kerak");
        }
        if (quantity <= 0) {
            throw new BadRequestException("Dalildagi qayta-buyurtma miqdori musbat bo'lishi kerak");
        }

        DecisionProposal proposal = new DecisionProposal();
        proposal.setShopId(shopId);
        proposal.setAnalysisRunId(run.getId());
        proposal.setProductId(quantityEvidence.getProductId());
        proposal.setSupplierId(request.supplierId());
        proposal.setProposalType("REORDER");
        proposal.setProposedReorderQuantity(quantity);
        proposal.setExpectedImpact("B1: moliyaviy ta'sir bahosi B2 deterministik hisobiga qoldirilgan.");
        proposal.setRiskSummary("Talab prognozi B1da hisoblanmaydi; faqat joriy qoldiq va past-qoldiq chegarasi ishlatiladi.");
        proposal.setAssumptions("Mahsulotning joriy qoldig'i va lowStockThreshold qiymati yaratish vaqtida to'g'ri.");
        proposal.setStatus(DecisionProposalStatus.PROPOSED);
        proposal.setEvidenceItems(new ArrayList<>(evidence));
        proposal.setEvidenceHash(sha256(evidence.stream().map(EvidenceItem::getContentHash)
                .sorted().reduce("", (a, b) -> a + "|" + b)));
        proposal.setCreatedBy(currentActor());
        DecisionProposal saved = proposals.save(proposal);
        appendLedger(saved, null, currentActor(), evidenceIds(saved), "PROPOSAL_CREATED", "SUCCESS", null,
                "Evidence-backed reorder proposal created.");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ProposalResponse> listProposals() {
        requireSingleShop();
        return proposals.findAllByOrderByIdDesc().stream().map(SavdoGraphService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProposalResponse getProposal(Long id) {
        requireSingleShop();
        return toResponse(findProposal(id));
    }

    /**
     * A PESSIMISTIC_WRITE lock plus uq_sg_proposal_decision makes one final
     * decision and one draft PO durable under retries and concurrent requests.
     * Conflict and denial ledger entries intentionally commit with their error.
     */
    @Transactional(noRollbackFor = {ForbiddenException.class, ConflictException.class})
    public DecisionResponse decide(Long proposalId, ProposalDecisionType requestedDecision,
                                   DecisionRequest request) {
        requireSingleShop();
        DecisionProposal proposal = proposals.findByIdForUpdate(proposalId)
                .orElseThrow(() -> NotFoundException.of("Taklif", proposalId));
        String actor = currentActor();
        List<Long> evidenceIds = evidenceIds(proposal);

        if (!isAccountOwner()) {
            appendLedger(proposal, null, actor, evidenceIds, "DECISION_DENIED", "DENIED_NON_OWNER", null,
                    "Only ACCOUNT_OWNER may decide a SavdoGraph proposal.");
            throw new ForbiddenException("SavdoGraph taklifini faqat ACCOUNT_OWNER tasdiqlashi yoki rad etishi mumkin");
        }

        ProposalDecision existing = decisions.findByProposalId(proposalId).orElse(null);
        if (existing != null) {
            if (existing.getDecision() == requestedDecision) {
                appendLedger(proposal, existing, actor, evidenceIds, "DECISION_REPLAYED", "IDEMPOTENT",
                        existing.getPurchaseOrderId(), "Equivalent decision replayed; no new action was created.");
                return decisionResponse(proposal, existing, true);
            }
            appendLedger(proposal, existing, actor, evidenceIds, "DECISION_CONFLICT", "CONFLICT",
                    existing.getPurchaseOrderId(), "A conflicting final decision was rejected.");
            throw new ConflictException("Taklif uchun boshqa yakuniy qaror allaqachon qabul qilingan");
        }

        if (proposal.getStatus() != DecisionProposalStatus.PROPOSED) {
            appendLedger(proposal, null, actor, evidenceIds, "DECISION_CONFLICT", "CONFLICT", null,
                    "Proposal was not in PROPOSED state.");
            throw new ConflictException("Taklif PROPOSED holatida emas");
        }

        ProposalDecision decision = new ProposalDecision();
        decision.setShopId(proposal.getShopId());
        decision.setProposalId(proposal.getId());
        decision.setDecision(requestedDecision);
        decision.setActor(actor);
        decision.setReason(blankToNull(request.reason()));
        decision.setIdempotencyKey(request.idempotencyKey().strip());

        if (requestedDecision == ProposalDecisionType.APPROVE) {
            Product product = products.findById(proposal.getProductId()).orElseThrow(
                    () -> NotFoundException.of("Mahsulot", proposal.getProductId()));
            PoResponse po = purchaseOrders.create(new PoRequest(
                    proposal.getSupplierId(), null, null, null, null, null,
                    "SavdoGraph B1 approved proposal #" + proposal.getId(),
                    List.of(new LineRequest(product.getId(), null, proposal.getProposedReorderQuantity(),
                            product.getPurchasePrice(), null))));
            if (po.status() != PurchaseOrderStatus.DRAFT) {
                throw new IllegalStateException("SavdoGraph faqat DRAFT PurchaseOrder yaratishi mumkin");
            }
            decision.setPurchaseOrderId(po.id());
            ProposalDecision savedDecision = decisions.save(decision);
            proposal.setStatus(DecisionProposalStatus.DRAFT_CREATED);
            proposals.save(proposal);
            appendLedger(proposal, savedDecision, actor, evidenceIds, "PROPOSAL_APPROVED", "SUCCESS", po.id(),
                    "Owner approval recorded.");
            appendLedger(proposal, savedDecision, actor, evidenceIds, "DRAFT_PURCHASE_ORDER_CREATED", "SUCCESS",
                    po.id(), "Draft-only purchase order created; no supplier, payment, delivery, or inventory action.");
            return decisionResponse(proposal, savedDecision, false);
        }

        ProposalDecision savedDecision = decisions.save(decision);
        proposal.setStatus(DecisionProposalStatus.REJECTED);
        proposals.save(proposal);
        appendLedger(proposal, savedDecision, actor, evidenceIds, "PROPOSAL_REJECTED", "SUCCESS", null,
                "Owner rejection recorded.");
        return decisionResponse(proposal, savedDecision, false);
    }

    @Transactional(readOnly = true)
    public List<ActionLedgerResponse> listLedger() {
        requireSingleShop();
        return ledger.findAllByOrderByIdDesc().stream().map(SavdoGraphService::toResponse).toList();
    }

    private EvidenceItem supportedQuantityEvidence(AnalysisRun run, Collection<EvidenceItem> evidence) {
        EvidenceItem matched = null;
        for (EvidenceItem item : evidence) {
            if (!run.getId().equals(item.getAnalysisRunId())) {
                throw new BadRequestException("Dalil boshqa tahlil ishiga tegishli");
            }
            if (item.getEvidenceType() == EvidenceType.REORDER_QUANTITY
                    && CALCULATION_ID.equals(item.getCalculationId())
                    && CALCULATION_VERSION.equals(item.getCalculationVersion())
                    && item.getCalculatedResult() != null
                    && EvidenceContentHasher.isCanonicalAndValid(item)) {
                if (matched != null) {
                    throw new BadRequestException("Taklif uchun aynan bitta qayta-buyurtma miqdori dalili kerak");
                }
                matched = item;
            }
        }
        if (matched == null) {
            throw new BadRequestException(
                    "Tasdiqlanmagan sonli da'vo rad etildi: canonical hashli server-hisoblangan immutable EvidenceItem talab qilinadi");
        }
        return matched;
    }

    private AnalysisRun findRun(Long id) {
        return analysisRuns.findById(id).orElseThrow(() -> NotFoundException.of("Tahlil", id));
    }

    private EvidenceItem findEvidence(Long id) {
        return evidenceItems.findById(id).orElseThrow(() -> NotFoundException.of("Dalil", id));
    }

    private DecisionProposal findProposal(Long id) {
        return proposals.findById(id).orElseThrow(() -> NotFoundException.of("Taklif", id));
    }

    private void appendLedger(DecisionProposal proposal, ProposalDecision decision, String actor,
                              List<Long> evidenceIds, String eventType, String outcome,
                              Long purchaseOrderId, String details) {
        ActionLedgerEvent event = new ActionLedgerEvent();
        event.setShopId(proposal.getShopId());
        event.setProposalId(proposal.getId());
        event.setProposalDecisionId(decision == null ? null : decision.getId());
        event.setActor(actor);
        event.setEvidenceReferences(json(evidenceIds));
        event.setEventType(eventType);
        event.setOutcome(outcome);
        event.setPurchaseOrderId(purchaseOrderId);
        event.setDetails(details);
        ledger.save(event);
    }

    private static List<Long> evidenceIds(DecisionProposal proposal) {
        return proposal.getEvidenceItems().stream().map(EvidenceItem::getId).sorted().toList();
    }

    private static boolean isAccountOwner() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ACCOUNT_OWNER".equals(authority.getAuthority()));
    }

    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Autentifikatsiyalangan foydalanuvchi talab qilinadi");
        }
        return auth.getName();
    }

    private static long requireSingleShop() {
        Long shopId = TenantContext.currentShopId();
        if (shopId == null) {
            throw new BadRequestException("SavdoGraph amali uchun bitta faol do'kon tanlanishi kerak");
        }
        return shopId;
    }

    private static void requireSupportedAnalysisType(String analysisType) {
        if (!REORDER_LOW_STOCK.equals(analysisType)) {
            throw new BadRequestException("B1 faqat REORDER_LOW_STOCK tahlil turini qo'llab-quvvatlaydi");
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("SavdoGraph dalil ma'lumotini saqlab bo'lmadi", ex);
        }
    }

    /** Hashes non-EvidenceItem snapshots (analysis input and evidence-set provenance). */
    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 mavjud emas", ex);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static AnalysisRunResponse toResponse(AnalysisRun run) {
        return new AnalysisRunResponse(run.getId(), run.getAnalysisType(), run.getPeriodFrom(), run.getPeriodTo(),
                run.getStatus(), run.getInitiatedBy(), run.getToolVersion(), run.getInputHash(), run.getCreatedAt());
    }

    private static EvidenceResponse toResponse(EvidenceItem item) {
        return new EvidenceResponse(item.getId(), item.getAnalysisRunId(), item.getProductId(), item.getEvidenceType(),
                item.getSourceType(), item.getPeriodFrom(), item.getPeriodTo(), item.getCalculationId(),
                item.getCalculationVersion(), item.getInputData(), item.getCalculatedResult(), item.getUnit(),
                item.getCurrency(), item.getContentHash(), item.getHashVersion(), item.getCreatedAt());
    }

    private static ProposalResponse toResponse(DecisionProposal proposal) {
        return new ProposalResponse(proposal.getId(), proposal.getAnalysisRunId(), proposal.getProductId(),
                proposal.getSupplierId(), proposal.getProposalType(), proposal.getProposedReorderQuantity(),
                proposal.getExpectedImpact(), proposal.getRiskSummary(), proposal.getAssumptions(), proposal.getStatus(),
                evidenceIds(proposal), proposal.getEvidenceHash(), proposal.getCreatedBy(), proposal.getCreatedAt());
    }

    private static DecisionResponse decisionResponse(DecisionProposal proposal, ProposalDecision decision,
                                                     boolean idempotent) {
        return new DecisionResponse(proposal.getId(), decision.getDecision(), proposal.getStatus(),
                decision.getPurchaseOrderId(), idempotent, decision.getCreatedAt());
    }

    private static ActionLedgerResponse toResponse(ActionLedgerEvent event) {
        return new ActionLedgerResponse(event.getId(), event.getProposalId(), event.getProposalDecisionId(),
                event.getActor(), event.getEvidenceReferences(), event.getEventType(), event.getOutcome(),
                event.getPurchaseOrderId(), event.getDetails(), event.getCreatedAt());
    }
}
