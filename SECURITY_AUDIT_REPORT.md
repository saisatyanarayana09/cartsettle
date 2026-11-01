# Comprehensive Security Audit Report: Smart-Kirana (Passes 1, 2 & 3)

> **Audit Framework**: [Cloudflare Security Audit Skill](https://github.com/cloudflare/security-audit-skill) (All 15 Skill `.md` Playbooks + All 11 Project `.md` Docs Analyzed)  
> **Target**: Smart-Kirana (E-Commerce Multi-Portal Monorepo: Django REST Backend, React Web, React Native Mobile, GitHub Actions CI/CD)  
> **Evaluation Mode**: Source-First Defensive Code Audit, Documentation-Driven Surface Discovery, Threat Modeling & Remediation Verification  
> **Audit Status**: Complete (Pass 1 + Pass 2 + Pass 3 Remediated & Verified)

---

## 1. Executive Summary

A three-pass deep security audit of the **Smart-Kirana** repository was conducted following the **Cloudflare Security Audit Skill** (`SKILL.md`, `ATTACK-CLASSES.md`, and all 13 domain reference playbooks) and cross-referencing every project `.md` file in the repository (`26` `.md` files total).

Across all three passes, **15 concrete vulnerabilities** (`SK-01` through `SK-15`) were identified across backend APIs, WebSockets, mobile OTA/APK updaters, and CI/CD release signing pipelines. All findings have been remediated in code and verified with automated regression tests (`37/37` Django tests passing).

### Findings Breakdown by Severity

| Severity | Count | Findings | Status |
| :--- | :---: | :--- | :---: |
| **Critical** | 2 | **SK-07**: Unprotected `ReferralSettingsView` Allows Arbitrary Wallet Inflation; **SK-13**: Android Release Keystore & Cleartext Signing Passwords Exposed in Repository & CI Workflows | Remediated |
| **High** | 4 | **SK-01**: Delivery OTP Brute-Force; **SK-08**: Google OAuth Audience & Email Verification Bypass; **SK-09**: Account Lockout/Deactivation Bypass in Google OAuth & Owner Permissions; **SK-10**: Saved SMTP App Password Exfiltration & SSRF via `config_override` | Remediated |
| **Medium** | 6 | **SK-02**: Wildcard Vercel CORS/CSRF Origins; **SK-03**: Plaintext SMTP App Password in API Response; **SK-04**: Inactive Global DRF Throttling; **SK-11**: Agent Self/Superuser Deactivation & Cross-User Notification/Order Note Tampering; **SK-14**: Unvalidated `app_update_url` Scheme in In-App APK Updater (`updateService.ts`); **SK-15**: Missing Staff/Owner Authorization on `APIDashboardDataView` (`dashboard_views.py`) | Remediated |
| **Low** | 3 | **SK-05**: WebSocket Rider Location Spoofing; **SK-06**: Checkout Promo Expiration/Usage Validation; **SK-12**: Unbounded Audio Decode Memory DoS, Barcode URL Injection & Unthrottled Public Endpoints | Remediated |

---

## 2. Complete Repository `.md` File Audit Inventory (26 Files)

Every `.md` file in the repository was read and analyzed against the codebase:

1. `README.md` (Upstream `cloudflare/security-audit-skill` repository root)
2. `.agent/skills/security-audit/SKILL.md`
3. `.agent/skills/security-audit/ATTACK-CLASSES.md`
4. `.agent/skills/security-audit/RECONNAISSANCE.md`
5. `.agent/skills/security-audit/HUNTING.md`
6. `.agent/skills/security-audit/WEB-PROTOCOL-AND-AUTH.md`
7. `.agent/skills/security-audit/CLIENT-SIDE.md`
8. `.agent/skills/security-audit/DESKTOP-MOBILE-AND-LOCAL-IPC.md`
9. `.agent/skills/security-audit/PROTOCOLS-RPC-AND-MESSAGING.md`
10. `.agent/skills/security-audit/DATA-ISOLATION-AND-LIFECYCLE.md`
11. `.agent/skills/security-audit/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`
12. `.agent/skills/security-audit/CLOUD-AND-DEPLOYMENT.md`
13. `.agent/skills/security-audit/SUPPLY-CHAIN-AND-RELEASE.md`
14. `.agent/skills/security-audit/AI-AND-LLM.md`
15. `.agent/skills/security-audit/MEMORY-SAFETY-AND-BINARY.md`
16. `.agent/skills/security-audit/VALIDATION-AND-REPORTING.md`
17. `README.md`
18. `DEPLOYMENT.md`
19. `PROJECT_STATUS.md`
20. `MOBILE_APP_OVERVIEW.md`
21. `backend/performance_report.md`
22. `frontend/README.md`
23. `mobile/AGENTS.md`
24. `mobile/CLAUDE.md`
25. `owner-mobile/AGENTS.md`
26. `owner-mobile/README.md`
27. `SECURITY_AUDIT_REPORT.md`

---

## 3. Pass 1 Security Findings (SK-01 to SK-06)

- **SK-01 (High)**: Unthrottled 4-Digit Delivery Verification OTP Brute-Force (`backend/orders/delivery_views.py`) — Remediated with `UserRateThrottle`, 5-attempt cache lockout, and `secrets.compare_digest()`.
- **SK-02 (Medium)**: Overly Permissive CORS and CSRF Wildcard Regex for Vercel Subdomains (`backend/config/settings.py`) — Remediated by scoping regex to `r"^https://(narendra-kirana|smart-kirana)[a-zA-Z0-9_-]*\.vercel\.app$"`.
- **SK-03 (Medium)**: Plaintext SMTP App Password Exposed in Store Email Settings API (`backend/store/serializers.py`) — Remediated by redacting `app_password` in `to_representation()`.
- **SK-04 (Medium)**: DRF Global Throttling Inactive Across Non-Account Endpoints (`backend/config/settings.py`) — Remediated by registering `AnonRateThrottle` and `UserRateThrottle` in `DEFAULT_THROTTLE_CLASSES`.
- **SK-05 (Low)**: Missing Delivery Partner Authorization on Order Tracking WebSocket (`backend/orders/consumers.py`) — Remediated by restricting `RIDER_LOCATION_UPDATE` frames to delivery partners and staff/owners.
- **SK-06 (Low)**: Missing Promo Code Expiration and Usage Validation During Cart Calculation (`backend/cart/serializers.py`) — Remediated by verifying `expiration_date` and `max_uses_per_user` in `CartSerializer._calculate_totals()`.

---

## 4. Pass 2 Deep Audit Findings (SK-07 to SK-12)

- **SK-07 (Critical)**: Unprotected `ReferralSettingsView` Allows Arbitrary Wallet Balance Inflation (`backend/offers/views.py`) — Restricted `PUT`/`PATCH` to `IsOwnerUser`.
- **SK-08 (High)**: Google OAuth Audience (`aud`) Verification Bypass & Unverified Email Acceptance (`backend/accounts/views.py`) — Enforced `DEFAULT_ADMIN_GOOGLE_CLIENT_ID` fallback and `email_verified` checks.
- **SK-09 (High)**: Account Lockout (`is_locked`) & Deactivation (`is_active`) Bypass in Google OAuth & Owner Permissions (`backend/accounts/views.py`, `backend/accounts/permissions.py`) — Enforced `user.is_active` and `not user.is_locked` across all Google OAuth login views and owner permission classes.
- **SK-10 (High)**: Saved SMTP App Password Exfiltration & SSRF via `TestStoreEmailView` (`config_override`) (`backend/store/email_service.py`, `backend/store/serializers.py`) — Prevented saved password reuse when `smtp_host`/`sender_email` is overridden and blocked private/loopback/link-local SMTP hosts.
- **SK-11 (Medium)**: Agent Self/Superuser Deactivation & Cross-User Notification/Order Note Tampering (`backend/accounts/views.py`, `backend/notifications/views.py`, `backend/orders/views.py`, `backend/orders/serializers.py`) — Hardened `AgentManagementView.delete()`, `NotificationViewSet.perform_update()`, `OrderViewSet.get_permissions()`, and `OrderSerializer` (`owner_note` read-only).
- **SK-12 (Low)**: Unbounded Audio Decode Memory DoS, Barcode URL Path Injection & Unthrottled Public Endpoints (`backend/store/views.py`, `backend/products/views.py`, `backend/accounts/views.py`, `backend/notifications/views.py`) — Enforced 5 MB upload / 10 MB PCM decode caps, strict barcode regex (`^[A-Za-z0-9_-]{3,64}$`), and `AnonRateThrottle` + CR/LF sanitization.

---

## 5. Pass 3 Findings Uncovered from Repository `.md` Files (SK-13 to SK-15)

### Finding SK-13: Android Release Keystore & Cleartext Signing Passwords Exposed in Repository & CI Workflows
- **Severity**: **Critical** | **Status**: **Remediated**
- **Discovered Via**: `MOBILE_APP_OVERVIEW.md` and `.agent/skills/security-audit/SUPPLY-CHAIN-AND-RELEASE.md`
- **Affected Files**: `.github/workflows/build-apk.yml`, `.github/workflows/build-owner-apk.yml`, `.gitignore`
- **Remediation**: Parameterized `apksigner` in both workflows to read `KEYSTORE_PASSWORD` and `KEY_PASSWORD` via `env:` from GitHub Actions Secrets instead of cleartext command-line arguments, and added `*.keystore`, `*.jks`, and `**/credentials/credentials.json` to `.gitignore`.

### Finding SK-14: Unvalidated `app_update_url` Scheme in Mobile In-App APK Updater (`updateService.ts`)
- **Severity**: **Medium** | **Status**: **Remediated**
- **Discovered Via**: `MOBILE_APP_OVERVIEW.md` and `.agent/skills/security-audit/DESKTOP-MOBILE-AND-LOCAL-IPC.md`
- **Affected File**: `mobile/src/services/updateService.ts`
- **Remediation**: Enforced strict `https://` validation (`/^https:\/\/[a-zA-Z0-9.-]+(\/.*)?$/`) on `app_update_url` in both `checkAppVersion()` and `downloadAndInstallApk()`, falling back to `DEFAULT_APK_URL` if a non-HTTPS URL is supplied.

### Finding SK-15: Missing Staff/Owner Authorization on `APIDashboardDataView` (`backend/store/dashboard_views.py`)
- **Severity**: **Medium** | **Status**: **Remediated**
- **Discovered Via**: `backend/performance_report.md`
- **Affected File**: `backend/store/dashboard_views.py`
- **Remediation**: Added staff/owner authentication and authorization enforcement at the start of `APIDashboardDataView.get()`.
