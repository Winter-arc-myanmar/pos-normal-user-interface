# Offline Operating Capability for Lnkits POS

**Document reference:** WA-POS-OFF-2026-11
**Version:** 1.0
**Date:** 17 November 2026
**Prepared for:** Winter Arc
**Status:** For review

## 1. Purpose

This document proposes an offline operating capability for the Lnkits point-of-sale (POS) application. It presents the findings of a technical assessment of the current implementation, records the design decisions agreed with the product owner, describes the proposed solution, and sets out an implementation plan with associated dependencies and risks.

The document is intended to support approval and planning. Detailed interface specifications are not included; these will be produced at the commencement of each implementation phase.

The assessment covered the POS frontend (`pos-normal-user-interface`), the Android print bridge (`vision-pos-android-print-bridge`), the intended Tauri desktop target, and the backend platform (`PointOfSaleBackEnd`). All source references were verified against commit `7e09bc5`.

## 2. Executive summary

### 2.1 Current position

The application requires continuous network connectivity for all operations. Without network access it cannot be started. With an intermittent connection it terminates the active session. In all operating conditions it retains no local data.

### 2.2 Constraints identified

Four independent constraints were identified, each sufficient on its own to prevent offline operation:

| Ref | Constraint | Evidence |
|---|---|---|
| C1 | **Application delivery.** No service worker is registered, and the web server instructs clients not to retain the application document. A device without network access cannot load the application. | `vite.config.ts`; `docker/templates/default.conf.template:59-69` |
| C2 | **Session and workspace state.** Credentials are held in `sessionStorage`, which is discarded when the embedded browser process ends. The active register and shift are held in component state and re-resolved over the network on every mount. | `src/lib/cookies.ts:282-300`; `src/core/presentation/hooks/usePosWorkspace.tsx:67-68` |
| C3 | **Data availability.** No read path is cached. Reference and operational data are retrieved on demand, so an interruption removes content instead of serving a retained copy. | `src/core/presentation/hooks/useCashier.tsx:271-294` |
| C4 | **Transaction capture.** No mechanism exists to record a completed sale locally, and the application service layer requires a network round trip during checkout. | `src/core/application/services/CashierService.ts:708` |

### 2.3 Proposed solution

The proposed solution comprises four elements:

1. **Application delivery.** The frontend bundle is distributed inside the existing Android and Tauri shells and served locally, removing the network dependency at start-up.
2. **Local data store.** A native SQLite store is introduced behind the existing repository boundary, providing cached reference data, operational data and a durable transaction queue.
3. **Transaction capture.** Completed cash transactions are recorded locally in a signed, sequenced outbox and reconciled with the backend on reconnection.
4. **Offline authorisation.** A server-signed, device-bound grant permits continued operation for the duration of a shift, with automatic degradation to read-only on expiry.

No modification is required above the application service layer.

### 2.4 Delivery

| Phase | Scope | Estimated effort |
|---|---|---|
| 0 | Correction of four defects in current session and idempotency handling | 2-3 days |
| 1 | Local application delivery and read caching | 4-6 days |
| 2 | Offline cash transaction capture | 2-3 weeks |
| 3 | Offline table service, in two tiers | 2-4 weeks |

Phase 0 is recommended for immediate delivery, independently of the offline programme, as each item addresses a defect in current behaviour.

### 2.5 Principal dependencies

Phases 2 and 3 depend on three backend capabilities: issuance of offline authorisation grants, device enrolment and revocation, and batch ingestion of offline transactions. These are set out in section 9 and should commence in parallel with Phase 1.
## 3. Current state assessment

### 3.1 Behaviour without network access

| Operating scenario | Observed behaviour |
|---|---|
| Cold start without network access | The browser displays an error page. The application does not start. |
| Page reload without network access | The same outcome, including where an HTTP cache is warm, because the document is served with `no-store`. |
| Network interruption during a transaction | The application is unmounted and replaced by a full-screen offline notice. No transactions are queued and no degraded mode is offered. |
| Network interface available without upstream connectivity | The connectivity gate reports online; every screen subsequently fails at the API layer, and errors are presented individually. |
| Return to the application after an outage | Succeeds only where the access token remains valid. Where the token has expired, the session restoration path attempts a token refresh; a network failure at this point clears the stored session and requires re-authentication. |
| Offline start followed by an attempt to open a table | Prevented. `requireCashierContext()` raises an error because the shift cannot be retrieved. |

Two further observations are material:

- The connectivity gate relies on `navigator.onLine`, which reports interface state rather than API reachability. Captive portals and failed upstream links are therefore reported as online.
- In the Android shell, a failed page load is presented as a native error screen with a reload action (`MainActivity.kt:209-227`). This is an error surface, not an operating mode.

### 3.2 Offline write surface

`ICashierRepository` defines 73 operations. These are classified for offline operation as follows.

| Classification | Count | Representative operations |
|---|---|---|
| Cacheable reference data | 17 | Products, variants, tax rates, payment methods, zones, tables, reasons, registers |
| Cacheable with pending-write overlay | 10 | Orders, order lines, payments, table sessions, floor state |
| Queueable | 9 | Create order, add line, open table session, add session line, waitlist entry, fire to KDS |
| Server arbitration required | 13 | Table moves, merges and splits, floor status, KDS ticket state |
| Not possible offline | 24 | Checkout, order payments, refunds, shift open and close, wallet operations, tip pools, back-office maintenance |

Two of the operations classified as not possible offline, shift opening and payment capture, are prerequisites for every sale. Caching alone therefore cannot deliver offline selling.

The nine queueable operations all depend on identifiers assigned by the server, and the codebase contains no client-side identifier generation. `openTableSession`, for example, returns both a session identifier and an order identifier that three subsequent operations require. A queue implemented without local identifier mapping would duplicate transactions rather than replay them.

### 3.3 Capabilities that support the solution

The following existing capabilities reduce the scope of the work.

1. **Printing is client-side.** Across 22 printing modules there is one outbound request (`src/lib/printing/printLogo.ts:36`) and one deferred import. All receipt and kitchen slip generation is performed locally.
2. **Printer bindings are persisted**, with an in-memory mirror where browser storage is unavailable (`src/lib/pos/printerBindingStorage.ts:34-65`).
3. **Localisation resources are bundled** (`src/lib/i18n/index.ts:5-6`). No runtime retrieval is required.
4. **The transport layer distinguishes authorisation failure from connectivity failure.** `renewSession` retains credentials on non-authorisation errors (`src/core/infrastructure/api/HttpClient.ts:82-86, 108-115`).
5. **Dependency injection provides a single composition point.** Every hook resolves its service from one container (`src/core/infrastructure/di/container.ts:196-266`), permitting the local store to be introduced without modification above the service layer.
6. **The Android shell injects scripts on every page load** (`MainActivity.kt:175-193`), providing the extension point for a bundled application and a native storage bridge.
7. **The backend enforces transaction idempotency.** A unique constraint on `(tenantId, idempotencyKey)` exists for sales orders and is applied during checkout (`src/modules/sales/application/checkout.service.ts:162-171, 580`).

### 3.4 Constraints identified in dependent systems

**3.4.1 The synchronisation service is not implemented.** The frontend contains a synchronisation page, a hook, a repository and five endpoints under `/api/v1/pos-sync/*`. A search of the backend source returns no reference to `pos-sync`. All calls return 404 and the "Upload orders" action has no effect. This interface cannot be reused for offline ingestion.

**3.4.2 Idempotency is enforced by the backend but defeated by the client.** The client generates idempotency keys using `Date.now()` (`src/pages/CashierPage.tsx:2515` and equivalent), so a retried checkout presents a new key and creates a second sale. A stable key would allow the backend to return the original transaction.

**3.4.3 Deferred transactions are rejected after shift closure.** `assertShiftUsable` rejects payment against a closed shift, or against a daily shift older than 24 hours, with the stated intent that a closed shift must not accumulate sales absent from its report (`src/modules/pos/application/shift-rules.ts`). The rule is correct and is in direct conflict with deferred transaction capture. Section 7.8 sets out the resolution.
## 4. Objectives and acceptance criteria

### 4.1 Objectives

| Ref | Objective |
|---|---|
| O1 | The application starts and is usable on a device with no network access. |
| O2 | A cash sale can be completed, receipted and reconciled without network access, exactly once. |
| O3 | Table service continues during a network interruption for tables already open. |
| O4 | Loss of network access does not terminate an authenticated session. |

### 4.2 Acceptance criteria

| Ref | Criterion | Verification |
|---|---|---|
| AC1 | With all network interfaces disabled, the application reaches the sign-in screen within 10 seconds on the reference device. | Device test |
| AC2 | With a valid grant, an operator can sign in, complete a cash sale and print a receipt while offline. | Device test |
| AC3 | On reconnection the sale is recorded exactly once, with the correct total, tender and change. | Server verification |
| AC4 | Repeated checkout attempts for the same transaction, including induced timeouts, produce a single sale. | Automated test |
| AC5 | A network interruption during an active session does not require re-authentication. | Device test |
| AC6 | A table open at the point of interruption can be billed, fired, settled and closed once connectivity resumes. | Device test |
| AC7 | Where a shift closes before a queued transaction is received, the transaction is posted to a recovery shift and reported. | Server verification |

## 5. Scope

### 5.1 In scope

- Application delivery within the Android bridge and the Tauri desktop build.
- Read caching for reference and operational data, including warm-up at authentication.
- Persistence of register, shift and session context across application restarts.
- Offline authorisation for the duration of a shift.
- Offline capture, queueing and reconciliation of cash transactions.
- Offline table service for tables open at the point of interruption, and table opening offline subject to the floor protocol.
- Receipt and kitchen slip printing from cached configuration.
- Operator status indication, diagnostics and a support export.

### 5.2 Out of scope

| Excluded | Reason |
|---|---|
| Room, spa and KTV time-based charges | Amounts derive from server-timed sessions and cannot be reproduced reliably on the client. |
| Refunds and voids of settled sales; no-sale drawer operations | Require a server-issued approval token that cannot be issued offline. |
| Card, membership and guest-wallet tenders | Balances are shared state and cannot be validated offline. |
| Tip pools | Requires manager authority and a closed period. |
| Catalogue and pricing maintenance | Back-office function, not a till operation. |
| Service worker on Android | Superseded by bundled delivery. |
| Signed bundle update channel; native HTTP transport | Deferred; see section 12. |

## 6. Design decisions

| Ref | Area | Decision | Rationale |
|---|---|---|---|
| D1 | Operating model | The terminal operates autonomously, without an on-premises server appliance. | Avoids per-venue infrastructure; the existing application shells provide a suitable host. |
| D2 | Local storage | Native SQLite in both shells; IndexedDB only as a browser fallback. | Transactional guarantees for the queue; no additional dependency on Android. |
| D3 | Delivery | The bundle is distributed inside both shells; no service worker on Android. | Removes the start-up dependency on network; consistent with the Tauri build. |
| D4 | Functional scope | Counter sales and table service. | Covers the revenue paths that cease during an outage. |
| D5 | Tender types | Cash only while offline; other tenders refused explicitly. | Only cash can be validated without the server. |
| D6 | Shift boundary | Shift closure is blocked while transactions are pending; a recovery shift receives late transactions. | Preserves report integrity while preventing loss. |
| D7 | Authorisation | Server-signed, device-bound grant valid for the shift; read-only on expiry. | Bounded exposure with continued operation. |
| D8 | Shared floor | Configurable conflict protocol; no additional controls for single-terminal venues. | Conflict risk exists only where multiple terminals share tables. |
| D9 | Approvals | Manager-authorised actions are unavailable offline; pre-payment line editing remains available. | Approval tokens cannot be minted offline; line editing does not move money. |

### 6.1 Rationale for bundled delivery

The Android shell already injects scripts on every page load and controls WebView configuration. Serving the application from the installation package therefore requires no additional runtime component. It also supports first use on a device that has never had network access, which a service worker cannot guarantee, since installation requires one successful online visit.

The trade-off is accepted explicitly: following adoption, a frontend correction requires a new application release. Phase 1 includes the release process, and a signed bundle update channel is identified as a later option in section 12.

### 6.2 Operating states

| State | Condition | Permitted operations |
|---|---|---|
| ONLINE | Server reachable | Full operation |
| DEGRADED | Grant valid; server unreachable | Cached reads; queued writes; approvals unavailable |
| READ-ONLY | Grant expired or unverifiable | Browsing, reprinting and existing bills only |
| LOCKED | Integrity failure (sequence, clock or signature) | Manager unlock, online only |

All screens derive from this single state. The existing connectivity gate is replaced by a status indicator.
## 7. Proposed solution

This section describes each element of the solution, the mechanism by which it operates, and the failure behaviour that has been designed for.

### 7.1 Application delivery and offline start-up

The frontend build output is copied into the Android application package by a Gradle task and served through `WebViewAssetLoader` from `https://appassets.androidplatform.net/assets/index.html`. Requests to that origin are intercepted locally, so document loading does not require network access.

Three implementation requirements apply.

- **Route fallback.** The asset handler must return `index.html` for extension-less paths, replicating the `try_files` directive used by nginx. Without this, a reload on a routed path succeeds in a browser but fails inside the shell.
- **WebView policy.** `allowFileAccess` remains false and cleartext traffic remains prohibited. `WebViewAssetLoader` serves over HTTPS, so neither control is weakened.
- **Cross-origin configuration.** The application origin changes, so `https://appassets.androidplatform.net` must be added to the permitted origins. This is an environment configuration change (`main.ts:57-69`).

The Tauri build requires only that `frontendDist` reference `../dist`; the desktop application is offline-capable once installed.

### 7.2 Integration architecture

Every cashier-facing hook resolves its service from a single container (`src/core/infrastructure/di/container.ts:196-266`). The local store and transaction queue are therefore introduced as decorators at the repository boundary, and no component above the application service layer requires modification.

```
pages -> hooks -> application services -> ICashierRepository
                                              |
                                              +-- OutboxCashierRepository   queues writes
                                              +-- CachedCashierRepository   serves reads
                                              +-- ApiCashierRepository      network access
```

Three components currently bypass this boundary and must be corrected first, otherwise the decorators are not applied.

| Component | Issue |
|---|---|
| `src/components/shift/shiftApi.ts:4` | Resolves `ApiShiftRepository` directly from the container |
| `src/core/presentation/hooks/useTableCharges.ts:14` | Resolves `ApiTableChargeRepository` directly |
| `src/components/NetworkStatusGate.tsx:28-36` | Prevents all offline operation by unmounting the application |

Platform-specific storage is abstracted behind two interfaces, with the implementation selected at start-up by capability detection.

| Platform | Data store | Key storage |
|---|---|---|
| Android bridge | `window.median.posDb` (SQLite) | `window.median.posSecure` (Android Keystore, ECDSA P-256, non-extractable) |
| Tauri 2.0 | `tauri-plugin-sql` | Operating system credential store or Stronghold |
| Browser (fallback) | IndexedDB | WebCrypto |

The Android implementation requires no additional dependency, as `SQLiteOpenHelper` is provided by the platform. A native store also permits a queue entry and its sequence number to be committed in a single transaction, which is a prerequisite for a contiguous, verifiable sequence.

### 7.3 Local data store

Data is retained according to change frequency and operational need.

| Category | Contents | Retention |
|---|---|---|
| Reference data | Products, variants, tax rates, units | 12 hours |
| Configuration | Payment methods, registers, reasons, zones, KDS stations, print templates, company details, currency, logo | 24 hours |
| Operational data | Orders, order lines, payments, table sessions, floor state | 30 seconds |
| Queue and state | Outbox, identifier map, synchronisation state | Retained until reconciled |

Two design points require emphasis.

**Variant pre-loading.** Product variants are currently retrieved lazily, per product, on first selection (`useCashier.tsx:462-470`). A fully cached menu can therefore be unpriceable offline, with selection failing at the point of use. The warm-up procedure must retrieve variants eagerly.

**Pending-write overlay.** Read operations must merge locally queued changes over cached server state. Without this, queued lines disappear from the bill on the next refresh and the operator re-enters the order.

Cache entries are namespaced by schema version, tenant and location. A schema version change invalidates the cache and triggers re-warming; it must not affect the outbox or the identifier map.

### 7.4 Workspace persistence

The active register, shift and shift summary are currently re-derived over the network on every mount. They are to be persisted, scoped by tenant and location, and resolved in the following order:

1. In-memory state, where available.
2. Persisted state, where the network read fails.
3. The registration workflow, where neither is available.

Staleness is enforced rather than ignored: a shift closed elsewhere, or one that has exceeded the daily cutoff, is discarded. The current implementation already discards a shift closed elsewhere (`usePosWorkspace.tsx:403-418`); the persisted copy is subject to the same rule.

### 7.5 Offline authorisation

The backend issues a signed authorisation grant at authentication and renews it on each successful contact.

```
{
  sub, tenantId, registerId, branchId,
  permissions[],      branch-scoped and minimal
  iat, exp,           exp = end of shift horizon
  jti, deviceThumbprint,
  maxSeq
}
```

The grant is signed with a server key that the client verifies against a pinned public key.

Verification at start-up is fail-closed. The client validates the signature, the device thumbprint against the local key, the expiry and the sequence ceiling. Any failure results in no permissions being granted. This is the inverse of current behaviour, where a token that cannot be decoded is treated as valid (`src/lib/cookies.ts:73-76`).

Expiry is measured against anchored server time. Responses carrying server time update a stored value that never decreases; grant validity requires `max(localNow, lastSeenServerTime) < exp`. A decrease is treated as evidence of clock manipulation.

The grant carries the permissions of the active branch only. The current implementation aggregates permissions across all branches where the active branch has none (`ApiAuthRepository.ts:364-381`). Reproducing that in a credential valid for a full shift would over-grant every device in the estate.
### 7.6 Transaction capture and synchronisation

Queue entries record transaction intent rather than a serialised request, because the API derives tenant identity from the credential and rejects payloads containing `tenantId`. Replaying a stored request would fail on every attempt.

Each entry contains:

```
clientTxnId   UUID v7, generated at commit and persisted before transmission
seq           monotonic per register, no gaps
capturedAt    device time, for reporting
kind          counter-sale | table-sale
intent        items[], tenders[], discount reason, tip, service type
prevHash      hash of the preceding entry
payloadHash   hash of this intent
deviceSig     signature over seq, clientTxnId, payloadHash, prevHash, capturedAt
```

The hash chain allows the backend to detect removed entries: the last accepted sequence is known server-side, so an omission is identifiable rather than silent.

Synchronisation behaviour is defined as follows.

| Outcome | Action |
|---|---|
| Accepted | Record the server order reference; remove the entry |
| Rejected (409 or 422) | Move to quarantine with the server reason; no automatic retry |
| Network failure | Retain the entry; apply exponential backoff; preserve numbering |
| Reconnection | Synchronise before any other operation, including before leaving DEGRADED |

Entries are transmitted sequentially in sequence order. Counter sales require no identifier mapping, as checkout is a single atomic operation. The table path uses a local bill identifier which is never transmitted.

### 7.7 Offline payment handling

Cash is the only permitted tender while offline. Unavailable tenders are disabled with an explicit explanation; silent disabling leads operators to circumvent the system.

Totals are calculated locally from cached prices and tax rates using the existing calculation path (`useCashier.tsx:521-530`). Two exceptions require specific handling.

- **Service charge.** The `serviceCharge` field is deprecated on the checkout payload and the server applies its own rule. To present a truthful total, the venue rule must be cached and applied locally. Where the server subsequently calculates a different amount, the variance is recorded for reconciliation and the guest receipt is not amended.
- **Tender identity.** A tender requires a valid `paymentMethodId`, resolved from the cached catalogue. Where the method has been removed server-side before synchronisation, the transaction is quarantined rather than assigned an alternative.

Change is calculated locally and printed. The receipt uses the cached template, company details and logo. The finance copy carries an "offline, pending upload" annotation; the guest copy does not.

Where the cash drawer is connected through the printer's kick port it opens with the receipt. The cash movement is recorded by the transaction itself rather than as a separate drawer event.

### 7.8 Table service

Delivery is divided into two tiers, which differ in risk and in backend dependency.

**Tier 1: tables open at the point of interruption.** Lines may be added, fired and settled. The session exists on the server, so no server state must be reconstructed. This addresses the common operational case of a connectivity failure during service and requires no backend capability beyond those in section 9.

**Tier 2: opening a table while offline.** The client must create a session that does not exist on the server, and the backend must accept the complete transaction on synchronisation: opening time, lines, tenders and closure, reconstructed from the queue entry. This requires a backend capability that does not exist today, and it is the principal reason for the floor protocol in D8, since a device cannot determine whether another terminal has occupied the table in the interim.

Tier 1 is recommended for initial delivery; Tier 2 follows once the floor protocol is implemented and validated.

Floor control by venue configuration:

| Mode | Behaviour when offline |
|---|---|
| Single terminal | Table opening permitted without additional checks |
| Sectioned | Permitted within the terminal's section; confirmation required at section boundaries |
| Shared floor | Permitted only where the table was recorded as free in a snapshot within the staleness threshold of 10 minutes; otherwise refused |

Where synchronisation determines that a table was already occupied, the local transaction is quarantined for manager resolution. The payment remains recorded; only attribution requires a decision.

Kitchen dispatch while offline prints the preparation slip immediately and queues the KDS job. The printed slip is marked as an offline transaction, and the queued job is idempotent per order to prevent duplication on reprint.

### 7.9 Printing

No new printing capability is required. The pipeline is already client-side, with one outbound request (`printLogo.ts:36`) and one deferred import. The following inputs must be cached:

- Print template, company details, currency and logo.
- KDS stations and their category routing rules.
- Printer bindings, already persisted with an in-memory fallback.

With these available, receipts and kitchen slips print correctly offline, including station routing. Without them, printing continues using default formatting without header or logo. This is the same degradation the application exhibits today when these requests fail, and is consequently easy to overlook during testing.

### 7.10 Operator interface and diagnostics

The offline state must be evident without causing alarm.

- A persistent status indicator: ONLINE, DEGRADED with pending count, READ-ONLY, or LOCKED.
- A "Synchronise now" action, with the time of the last successful synchronisation.
- A marker on any bill not yet transmitted.
- Warnings at fifteen and five minutes of remaining grant validity. Silent expiry is the most common cause of an unplanned transition to read-only.
- A diagnostics view reporting device identifier, grant expiry, last accepted sequence, cache age, and pending and quarantined counts, with an export for support.

One rule governs the interface: the application must never indicate that a transaction has been transmitted when it has not. Failure to maintain this invalidates confidence in every subsequent figure.

### 7.11 Deployment, upgrade and rollback

- Pilot deployment at one venue for two weeks, including deliberate interruption of connectivity during service.
- The "Clear cache & reload" control must be guarded, as it now operates alongside unsynchronised transactions.
- A schema change must invalidate cached data while preserving the outbox and identifier map. Failure to preserve them results in loss of transactions during upgrade.
- Rollback is performed by installing the previous application package. The database is preserved across an in-place upgrade, and therefore so is the outbox. Where a schema change causes the fault, forward correction is preferred to downgrade.
## 8. Implementation plan

### 8.1 Summary

| Phase | Deliverables | Completion criteria | Effort |
|---|---|---|---|
| 0 | Four corrective changes | AC5; no duplicate transaction on retry | 2-3 days |
| 1 | Bundled delivery, read cache, workspace persistence | AC1 | 4-6 days |
| 2 | Offline cash capture, authorisation grant, reconciliation | AC2, AC3, AC4, AC7 | 2-3 weeks |
| 3 | Offline table service, two tiers | AC6 | 2-4 weeks |

Effort estimates are indicative and intended for sequencing. Phases 2 and 3 assume that the backend capabilities in section 9 are available at the point of need.

### 8.2 Phase 0: corrective changes

Four defects should be corrected independently of the offline programme.

| Ref | Change | Current behaviour |
|---|---|---|
| P0-1 | Do not clear the session when token refresh fails for connectivity reasons | `ApiAuthRepository.ts:147-154` clears stored credentials on any refresh failure, destroying the refresh token |
| P0-2 | Replace the blocking offline screen with a status indicator | `NetworkStatusGate` unmounts the application, discarding authentication state |
| P0-3 | Generate idempotency keys at the point of intent and persist them | `CashierPage.tsx:1762, 2515, 3102` generate keys using `Date.now()` |
| P0-4 | Enable the existing expiry warning | `TokenManagementService` computes the warning (`:143-163`) but is not referenced anywhere |

### 8.3 Phase 1: delivery and caching

1. Add `androidx.webkit` and implement `WebViewAssetLoader` with a route fallback handler.
2. Add a Gradle task to package `dist/` into the application assets, with the source path configured in `local.properties`.
3. Set `frontendDist` in the Tauri configuration.
4. Implement the cached repository for the 27 read operations, including eager variant retrieval.
5. Persist register, shift and session context.
6. Add the shell origins to `CORS_ORIGINS`.
7. Guard the cache-clear control.

### 8.4 Phase 2: offline cash transactions

1. Implement the outbox repository and the local transaction queue.
2. Implement grant issuance and verification, device key generation and transaction signing.
3. Restrict tenders to cash while in DEGRADED state.
4. Implement local total calculation, including service charge, and local receipt generation.
5. Implement synchronisation with sequencing, idempotency, backoff and quarantine.
6. Implement the status indicator, pending count and diagnostics view.

### 8.5 Phase 3: offline table service

1. Deliver Tier 1: billing and settlement for tables open at the point of interruption.
2. Deliver local kitchen slip generation and queued KDS dispatch.
3. Deliver the floor protocol and venue configuration.
4. Deliver recovery shift handling.
5. Deliver Tier 2: offline table opening and transaction reconstruction, subject to backend support.

## 9. Backend dependencies

The following capabilities are required. Items B1 to B3 are prerequisites for Phase 2.

| Ref | Capability | Detail |
|---|---|---|
| B1 | Offline authorisation grant | Signed grant containing minimal branch-scoped permissions, expiry, token identifier, device thumbprint, signing key identifier and rotation policy |
| B2 | Device enrolment and revocation | Registration of device public keys; revocation list retrieved on each successful contact; rejection at ingestion of transactions from revoked devices |
| B3 | Batch ingestion of offline transactions | Acceptance of signed transactions with per-transaction identifiers; response indicating accepted and quarantined items and the last accepted sequence; tenant and branch derived from the credential |
| B4 | Recovery shift | Acceptance of transactions received after shift closure into a linked recovery session, with reporting |
| B5 | Server time | Returned on authentication ping and on ingestion responses, to support time anchoring |
| B6 | Pending transaction count | Returned on authentication ping, enabling the backend to refuse shift closure while transactions remain outstanding |
| B7 | Idempotency completion | Honour `idempotencyKey` on `POST /sales-orders`, currently accepted but unused; make `POST /kds/fire` idempotent per order |
| B8 | CORS origins | Add `https://appassets.androidplatform.net` and `http://tauri.localhost` |
| B9 | Synchronisation service decision | Implement `/api/v1/pos-sync/*` or remove the corresponding frontend surface |

## 10. Risk register

| Ref | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Duplicate sales on retry | Medium | High | Stable idempotency keys persisted at intent; existing backend constraint applied |
| R2 | Loss of queued transactions on device wipe or uninstall | Low | Critical | Synchronise before closure, update and uninstall; schema change preserves the outbox |
| R3 | Deferred transaction rejected after shift closure | High | High | Recovery shift (B4); closure blocked while transactions are pending (B6) |
| R4 | Table occupied by another terminal | Medium | Medium | Floor protocol by venue mode; quarantine rather than reassignment |
| R5 | Grant expiry during service | Medium | High | Warnings at 15 and 5 minutes; renewal on contact; read-only degradation |
| R6 | Clock manipulation or integrity failure | Low | High | Anchored server time; hash chain; LOCKED state |
| R7 | Deployed API rejects the shell origin | Medium | Medium | Confirm CORS configuration before Phase 1; alternative origin strategy available |
| R8 | Menu cached without variants, preventing pricing | Medium | High | Eager variant retrieval during warm-up; verified by acceptance test |
| R9 | Browser storage unavailable in the WebView | Low | Medium | Capability detection; IndexedDB fallback; in-memory mirror |
| R10 | Release latency for frontend corrections | High | Medium | Release process defined in Phase 1; signed bundle channel deferred (section 12) |
| R11 | Total variance between local and server calculation | Medium | Medium | Variance recorded for reconciliation; guest receipt not amended |
| R12 | Backend capabilities delivered late | Medium | High | Items B1 to B3 commence in parallel with Phase 1 |

## 11. Assumptions and constraints

1. The Android bridge and the Tauri build remain the supported delivery targets. Where a browser deployment is retained, a service worker is additionally required.
2. The backend platform is under the organisation's control and can be extended as set out in section 9.
3. Devices are provided with Android 7.0 or later, consistent with the current minimum SDK level.
4. Device storage may be cleared by mobile device management at any time; the solution must tolerate the loss of all local state other than that already transmitted.
5. No personal data beyond that recorded on a sales transaction is retained locally. No card data is stored.
6. A shift does not normally exceed the grant horizon of approximately fourteen hours.
7. Network interruption is assumed to be total rather than intermittent at packet level; partial degradation is treated as offline.

## 12. Future phases

The following capabilities are identified but not included in this proposal.

| Item | Condition for reconsideration |
|---|---|
| Signed bundle update channel | Where application release latency becomes operationally significant |
| Native HTTP transport (Tauri plugin, Android bridge) | Where origin restrictions or connectivity detection require it |
| Budgeted offline approval grants | Where venues require manager authority during outages |
| Rooms, spa and KTV offline billing | Where server-side session timing becomes available locally |
| Service worker deployment | Where a browser target outlives the application shells |

## 13. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Prepared by | | | |
| Reviewed by | | | |
| Approved by | | | |
