package uz.barakat.market.savdograph;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import uz.barakat.market.repository.ActionLedgerEventRepository;
import uz.barakat.market.repository.EvidenceItemRepository;
import uz.barakat.market.repository.ProposalDecisionRepository;

/** Application persistence contracts must not expose a delete operation for B1 append-only rows. */
class AppendOnlyRepositoryContractTest {

    @Test
    void appendOnlyRepositoriesExposeNoDeleteMethod() {
        assertNoDelete(EvidenceItemRepository.class);
        assertNoDelete(ActionLedgerEventRepository.class);
        assertNoDelete(ProposalDecisionRepository.class);
    }

    private static void assertNoDelete(Class<?> repositoryType) {
        assertThat(repositoryType.getMethods())
                .extracting(Method::getName)
                .noneMatch(name -> name.startsWith("delete"));
    }
}
