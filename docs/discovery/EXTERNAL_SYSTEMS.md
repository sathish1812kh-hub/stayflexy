# External System Inventory — Stayflexi Platform

This document inventories all external integrations, third-party APIs, messaging platforms, storage locations, and telemetry endpoints integrated into Stayflexi.

---

## 1. Payment Systems

| Provider   | Purpose                                                                             | Integration Details                                                | Verification & Webhooks                                                                                               |
| :--------- | :---------------------------------------------------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Stripe** | Primary credit card capture, auth holds, invoice payments, and transaction refunds. | REST API SDK inside `payment-service`. Generates checkout intents. | Webhook listening route: `/api/v1/payments/webhooks`. Real-time signature checks via timing-safe HMAC-SHA256 headers. |

---

## 2. Channel Managers & OTAs (Online Travel Agencies)

Stayflexi interacts with major hospitality distribution channels to synchronize inventory availability, rate rules, and import reservations:

| Channel Provider | Data Synced                                                    | Direction                            | Protocol                                 |
| :--------------- | :------------------------------------------------------------- | :----------------------------------- | :--------------------------------------- |
| **Booking.com**  | Availability block counts, room prices, reservation downloads. | Bidirectional (Sync out / Import in) | HTTPS REST payload syncs, webhook pulls. |
| **Expedia**      | Availability ranges, room rates, check-in blocks.              | Bidirectional                        | HTTPS XML/JSON synchronization.          |
| **Airbnb**       | Calendar blocks, booking details.                              | Bidirectional                        | iCal sync and REST APIs.                 |

---

## 3. Communication & Messaging Providers

The `notification-service` connects to external messaging APIs to dispatch operational notifications:

- **Twilio SMS API**: Sends check-in/check-out confirmation codes and housekeeper task alarms.
- **SendGrid / SMTP Gateway**: Delivers guest booking vouchers, check-out invoices, and organization member invitations.

---

## 4. Storage & Infrastructure Providers

| Integration | Purpose                                        | Details                                                               | Credentials                                                 |
| :---------- | :--------------------------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------- |
| **AWS S3**  | Persistent postgresql dumps and Redis backups. | Configured via K8s CronJob jobs exporting dumps at `02:00 UTC` daily. | Loaded via `stayflexi-backup-secret` environment variables. |

---

## 5. Telemetry & Analytics Sinks

Telemetry metrics and tracing variables are forwarded to external sinks for monitoring:

- **Jaeger Collector**: Receives trace spans from services via OpenTelemetry at port `14268`.
- **Prometheus**: Pulls CPU, memory, and HTTP metrics data from services scraping `/metrics`.
- **Loki / Promtail**: Collects Pino formatted JSON log outputs.
