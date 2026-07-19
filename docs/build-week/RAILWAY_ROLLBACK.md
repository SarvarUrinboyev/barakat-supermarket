# Railway demo rollback and cleanup

This document is a future manual procedure. No Railway resource or deployment
exists as a result of B5.3D, so there is nothing to roll back yet.

## Rollback scope

Rollback applies only to the isolated `savdograph-build-week-demo` / `demo`
environment. Never point a demo rollback at SavdoPRO, TezGo, or any production
service/database.

1. Stop or roll back only `savdograph-backend` to the last verified demo image.
   Keep the public domain bound only to that backend service.
2. Stop or roll back only `savdograph-license` to the last verified demo image.
   Do not give it a public domain during recovery.
3. Preserve the License volume at `/data`; it contains the file-backed H2 state
   needed for judge accounts and permissions. A code rollback must not erase it.
4. Preserve the private PostgreSQL demo database unless a separate approved
   reset is required. Backend Flyway history is distinct from License H2 history
   and must never be copied between them.
5. Confirm the public backend health endpoint, private License health endpoint,
   fixed same-origin `/api/license` behavior, Demo Data badge, and absence of
   payment/inventory/supplier side effects before allowing a reviewer back in.

## Incident containment

If private License connectivity fails, leave the browser on the public backend:
the gateway returns a safe unavailable/timeout response and does not fall back
to a public License host. Do not work around the failure by adding a public
License domain, changing browser variables, disabling header controls, or
copying a private endpoint into frontend source.

If the backend database is unavailable, retain the migration history for
forensics. Do not run destructive migrations, manual schema edits, `flyway
clean`, reset, rebase, force-push, or database deletion as an incident shortcut.

## Explicit demo cleanup (only when approved)

After a demo is retired and evidence is no longer required:

1. Confirm the exact Railway project/environment and that it is the isolated
   demo, not production.
2. Export any approved non-secret deployment evidence; do not export customer,
   employee, supplier, payment, credential, raw-provider, or hidden-reasoning
   data.
3. Stop the two demo services.
4. Delete only the named demo backend service, named private License service,
   named private PostgreSQL service, and the License `/data` volume after the
   user separately approves destructive removal.
5. Recheck that no public domain, public database proxy, secret reference, or
   DNS/traffic rule remains.

A volume or database deletion is irreversible and is intentionally outside the
B5.3D implementation authorization.