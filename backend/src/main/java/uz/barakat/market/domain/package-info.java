/**
 * Domain entities for SavdoPRO.
 *
 * <p>Defines two package-level Hibernate filters consumed by every
 * entity extending {@link uz.barakat.market.domain.TenantScopedEntity}.
 *
 * <ul>
 *   <li>{@code tenantFilter} — single-shop scope. Activated by
 *       {@code TenantFilterAspect} when {@code TenantContext}
 *       holds a single shop id (the normal case).</li>
 *   <li>{@code accountFilter} — consolidated rollup over a list of
 *       shop ids. Activated when the request opted into "Hamma
 *       do'konlar" via {@code X-Shop-Id: ALL}; the main-shop owner
 *       sees every sub-shop in one view.</li>
 * </ul>
 */
@org.hibernate.annotations.FilterDef(
        name = "tenantFilter",
        parameters = @org.hibernate.annotations.ParamDef(name = "shopId", type = Long.class))
@org.hibernate.annotations.FilterDef(
        name = "accountFilter",
        parameters = @org.hibernate.annotations.ParamDef(name = "shopIds", type = Long.class))
package uz.barakat.market.domain;
