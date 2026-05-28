package uz.barakat.license.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import uz.barakat.license.domain.AdminAuditEntry;

/**
 * Pure-rendering tests for {@link AuditService#renderCsv(List)} — DB and
 * security context are out of scope here; we cover the CSV escaping
 * contract, header shape, BOM and empty-list behaviour.
 */
class AuditServiceTest {

    @Test
    void emptyListStillEmitsHeaderAndBom() {
        byte[] csv = AuditService.renderCsv(List.of());
        String text = new String(csv, StandardCharsets.UTF_8);

        assertTrue(text.startsWith("﻿"), "must lead with a UTF-8 BOM");
        assertTrue(text.contains("id,created_at,actor_user_id,actor_name,action,"
                        + "target_type,target_id,target_label,detail,client_ip"),
                "header row must be present, got: " + text);
        // Header + nothing else.
        assertEquals(2, text.split("\r\n", -1).length,
                "an empty list yields one header line plus the trailing newline");
    }

    @Test
    void rendersTrivialRowWithoutQuoting() {
        AdminAuditEntry row = entry(1L, "ACCOUNT_CREATE", "Shop A", null);
        String text = new String(AuditService.renderCsv(List.of(row)), StandardCharsets.UTF_8);

        assertTrue(text.contains("ACCOUNT_CREATE"), text);
        assertTrue(text.contains("Shop A"), text);
        // No quoting required for plain ASCII tokens with no commas.
        assertTrue(text.contains(",ACCOUNT_CREATE,"), "action must not be quoted, got: " + text);
    }

    @Test
    void quotesAndEscapesValuesWithCommaQuoteOrNewline() {
        AdminAuditEntry comma = entry(1L, "X", "Shop, Inc.", "ok");
        AdminAuditEntry quote = entry(2L, "X", "She said \"hi\"", "ok");
        AdminAuditEntry newline = entry(3L, "X", "line1\nline2", "ok");

        String text = new String(
                AuditService.renderCsv(List.of(comma, quote, newline)),
                StandardCharsets.UTF_8);

        assertTrue(text.contains("\"Shop, Inc.\""),
                "comma must trigger quoting, got: " + text);
        assertTrue(text.contains("\"She said \"\"hi\"\"\""),
                "inner quotes must be doubled, got: " + text);
        assertTrue(text.contains("\"line1\nline2\""),
                "newline must trigger quoting, got: " + text);
    }

    @Test
    void preservesIdAndOmitsNullTargetId() {
        AdminAuditEntry withTargetId = entry(7L, "USER_DELETE", "alice", null);
        withTargetId.setTargetId(42L);
        AdminAuditEntry withoutTargetId = entry(8L, "USER_CREATE", "bob", null);
        withoutTargetId.setTargetId(null);

        String text = new String(
                AuditService.renderCsv(List.of(withTargetId, withoutTargetId)),
                StandardCharsets.UTF_8);

        // Row with target_id=42 must contain ",42," (or end-of-line variant).
        assertTrue(text.contains(",42,"), "expected ,42, in: " + text);
        // Row without target_id must contain ",," for that field (empty between commas).
        assertTrue(text.contains(",,bob,") || text.contains(",,\"bob\","),
                "null target_id should render as empty field, got: " + text);
    }

    /** Build a minimal entry with the fields the renderer reads. */
    private static AdminAuditEntry entry(Long id, String action, String label, String detail) {
        AdminAuditEntry e = new AdminAuditEntry();
        e.setId(id);
        e.setActorUserId(1L);
        e.setActorName("admin");
        e.setAction(action);
        e.setTargetType("ACCOUNT");
        e.setTargetLabel(label);
        e.setDetail(detail);
        e.setClientIp("203.0.113.1");
        e.setCreatedAt(LocalDateTime.of(2026, 5, 28, 12, 0));
        return e;
    }
}
