# Dmonitor Plugin Implementation Plan

This file defines a concrete issue/task list for building the Dmonitor external microservice solution.

## Enterprise feature checklist
- [ ] Support multiple glucometer brands and data upload protocols
- [ ] Support clinic/tenant isolation and configurable workflows
- [ ] Support offline mobile sync and high-volume batch ingestion
- [ ] Support OpenMRS/FHIR integration and national gateway interoperability
- [ ] Support configurable alert rules, predictive risk scoring, and clinician dashboards
- [ ] Support authentication, audit logging, encryption, and operational observability

## Recommended technology stack
- Backend: Java + Spring Boot or Node.js + NestJS
- Database: PostgreSQL
- Cache / queue: Redis
- Containerization: Docker
- API auth: OAuth2 / JWT
- Integration: OpenMRS REST API, FHIR, national gateway API
- Observability: Prometheus / Grafana (or equivalent) and structured logging
- CI/CD: GitHub Actions or equivalent pipeline

## Milestone alignment
| Milestone | Scope | Primary implementation plan focus |
|---|---|---|
| Milestone 1 | Core backend scaffold and security foundation | Phase 1, Phase 2 |
| Milestone 2 | Mobile ingestion and patient app sync | Phase 3 |
| Milestone 3 | OpenMRS sync and patient linking | Phase 3, Phase 5 |
| Milestone 4 | Analytics, trends, and alerts | Phase 4 |
| Milestone 5 | Dashboard APIs, clinic settings, tenant support | Phase 4, Phase 5 |
| Milestone 6 | Offline sync, batch ingestion, async workflows | Phase 5, Phase 6 |
| Milestone 7 | Multi-tenant admin, isolation, feature toggles | Phase 5, Phase 6 |
| Milestone 8 | Observability, monitoring, scaling | Phase 6 |
| Milestone 9 | Security hardening and privacy | Phase 6 |
| Milestone 10 | Testing, validation, release documentation | Phase 7 |

## Phase 1 — Requirements & Design

### 1.1 Clinical workflows
- [ ] Document caregiver app glucose upload workflow
- [ ] Document clinician monitoring and alert workflow
- [ ] Document national gateway integration flow
- [ ] Define edge cases for offline sync and retries
- [ ] Define dynamic survey flow: only ask context questions relevant to current reading
- [ ] Define static patient history capture separate from daily sync

### 1.2 Data model
- [ ] Define `PatientLink` entity
- [ ] Define `PatientHistory` entity for static clinical background
- [ ] Define `GlucoseReading` entity
- [ ] Define `ReadingContext` entity for meal, insulin, activity, symptoms, and device context
- [ ] Define `SyncEvent` / `AuditLog` entity
- [ ] Define `AlertEvent` and `ComplianceRecord`
- [ ] Create ER diagram and schema notes

### 1.3 API contract
- [ ] Define `POST /api/v1/readings`
- [ ] Define `POST /api/v1/patients/link`
- [ ] Define `GET /api/v1/patients/{id}/trends`
- [ ] Define `GET /api/v1/alerts`
- [ ] Define `GET /api/v1/patients/{id}/history`
- [ ] Define `POST /api/v1/sync-status`
- [ ] Define auth model (`OAuth2` / `JWT`)
- [ ] Publish OpenAPI-style endpoint definitions

### 1.4 Mobile UX design
- [ ] Define dynamic context questions for each reading
- [ ] Define static patient history capture separate from daily sync
- [ ] Define rules for when to ask: insulin dose, meal timing, exercise, symptoms
- [ ] Define process to avoid repeating static clinical history on every sync
- [ ] Define how AI assists with insights only (no decisions)

### 1.5 OpenMRS integration design
- [ ] Map readings to OpenMRS concepts
- [ ] Define patient matching rules and identifiers
- [ ] Define encounter/observation creation strategy
- [ ] Define duplicate detection and idempotency rules

### 1.5 Security requirements
- [ ] Define encryption requirements
- [ ] Define audit logging requirements
- [ ] Define data retention policy
- [ ] Define access control model

## Phase 2 — Platform Foundation

### 2.1 Service scaffold
- [ ] Create repository structure for backend service
- [ ] Initialize project and dependency management
- [ ] Add Dockerfile for local development
- [ ] Add `.env.example` for configuration

### 2.2 CI / CD and quality
- [ ] Add unit test framework and sample tests
- [ ] Add linting and static analysis config
- [ ] Add GitHub Actions or CI pipeline
- [ ] Add Docker build and test pipeline

### 2.3 Database foundation
- [ ] Create PostgreSQL schema definitions
- [ ] Add migration tooling (`Flyway` / `Liquibase`)
- [ ] Implement base repository layer
- [ ] Add Redis support for caching and queues

### 2.4 Security foundation
- [ ] Add authentication middleware
- [ ] Add authorization middleware
- [ ] Add HTTPS enforcement config
- [ ] Add audit logging interceptor

### 2.5 Environment configuration
- [ ] Add environment profiles for local/dev/staging/prod
- [ ] Add secret management guidance
- [ ] Add config documentation

## Phase 3 — Ingestion + OpenMRS Sync

### 3.1 Mobile ingestion API
- [ ] Implement `POST /api/v1/readings`
- [ ] Validate incoming payloads with schema rules
- [ ] Persist raw glucose readings
- [ ] Persist dynamic reading context with each upload
- [ ] Avoid asking repeated static history questions during sync
- [ ] Return structured success/error responses

### 3.2 Patient linking
- [ ] Implement patient lookup by national ID or OpenMRS UUID
- [ ] Implement manual pairing fallback
- [ ] Persist patient link records

### 3.3 OpenMRS sync pipeline
- [ ] Implement OpenMRS patient metadata fetch
- [ ] Implement observation creation
- [ ] Implement encounter creation
- [ ] Add retry and error handling for OpenMRS failures
- [ ] Add idempotency for duplicate readings

### 3.4 Sync status reporting
- [ ] Implement `POST /api/v1/sync-status`
- [ ] Record sync success/failure states
- [ ] Surface pending retries and failure reasons

### 3.5 Logging and error handling
- [ ] Add structured request logging
- [ ] Add detailed error responses
- [ ] Track OpenMRS sync errors

## Phase 4 — Analytics, Trends & Alerts

### 4.1 Trend analytics
- [ ] Implement rolling glucose trend calculations
- [ ] Implement threshold detection for hypoglycemia/hyperglycemia
- [ ] Implement trend categories: improving/stable/worsening

### 4.2 Compliance engine
- [ ] Define expected reading cadence per patient
- [ ] Implement missed-reading detection
- [ ] Implement adherence scoring
- [ ] Persist compliance history

### 4.3 Alert engine
- [ ] Build alert rule engine
- [ ] Generate alerts for severe values, abnormal trends, and missed readings
- [ ] Add alert severity levels
- [ ] Persist alert history
- [ ] Add configurable alert rules per clinic/tenant
- [ ] Add predictive alert scoring for risk detection

### 4.4 Alert delivery
- [ ] Add clinician alert query endpoint
- [ ] Add notification hooks for email/SMS/WhatsApp/stub delivery
- [ ] Add dashboard-ready alert summaries
- [ ] Add configurable notification channels per clinic

### 4.5 Dashboard endpoints
- [ ] Add patient trend endpoints
- [ ] Add compliance summary endpoints
- [ ] Add alert summary endpoints
- [ ] Add clinic/admin dashboard endpoints for multi-facility management

## Phase 5 — Gateway & External Integration

### 5.1 National gateway adapter
- [ ] Analyze Kenya digital highway API requirements
- [ ] Implement gateway adapter interface
- [ ] Map service events to gateway contract
- [ ] Add gateway sync status tracking

### 5.2 OpenMRS + gateway coordination
- [ ] Implement optional OpenMRS + gateway synchronization path
- [ ] Preserve consistency between OpenMRS and national gateway data

### 5.3 App sync enhancements
- [ ] Support offline sync metadata and retries
- [ ] Add conflict handling for duplicated uploads
- [ ] Add device origin and timestamp normalization
- [ ] Support dynamic context capture: insulin dose, meal timing, exercise, symptoms
- [ ] Store static medical history separately and avoid repeated questions on every sync

### 5.4 Multi-tenant / clinic config
- [ ] Add clinic configuration support
- [ ] Add tenant isolation model
- [ ] Add per-clinic alert threshold config
- [ ] Add clinic admin role and permissions
- [ ] Add per-tenant feature toggles

## Phase 6 — Deployment, Scaling & Hardening

### 6.1 Containerization
- [ ] Finalize Docker image
- [ ] Add multi-stage build
- [ ] Add health check endpoints
- [ ] Add readiness/liveness probes

### 6.2 Scaling
- [ ] Add Redis caching for patient lookup
- [ ] Add background job queue for sync and alert processing
- [ ] Add connection pooling and resource limits
- [ ] Add horizontal scaling guidance
- [ ] Add batch ingestion support for high-volume uploads
- [ ] Add asynchronous OpenMRS sync and retry queueing
- [ ] Add data partitioning guidance for multi-tenant deployments

### 6.3 Observability
- [ ] Add metrics export
- [ ] Add logs aggregation shape
- [ ] Add tracing for critical workflows
- [ ] Add health status endpoint
- [ ] Add operational dashboards for sync health and device throughput
- [ ] Add alerting for system failures and backpressure

### 6.4 Security hardening
- [ ] Add secrets management guidance
- [ ] Add rate limiting
- [ ] Add input validation and sanitization
- [ ] Add vulnerability scan step

### 6.5 Release readiness
- [ ] Define versioning strategy
- [ ] Add deployment guide
- [ ] Add rollback plan

## Phase 7 — Testing, Validation & Release

### 7.1 Automated tests
- [ ] Add unit tests for ingestion, sync, analytics
- [ ] Add integration tests for OpenMRS adapter
- [ ] Add API contract tests

### 7.2 End-to-end validation
- [ ] Simulate caregiver app upload
- [ ] Validate OpenMRS observation creation
- [ ] Validate alert generation
- [ ] Validate gateway publishing (if applicable)

### 7.3 Performance validation
- [ ] Load test ingestion endpoint
- [ ] Load test sync pipeline
- [ ] Validate concurrency and scaling

### 7.4 Documentation
- [ ] Add API docs
- [ ] Add developer docs
- [ ] Add operator docs
- [ ] Add security/privacy docs

### 7.5 Release
- [ ] Create release package
- [ ] Publish Docker image
- [ ] Publish documentation
- [ ] Execute rollout plan

## Priority backlog
1. Requirements document + API contract
2. Service scaffold + CI
3. Security/auth foundation
4. Ingestion API
5. OpenMRS sync pipeline
6. Patient linking
7. Trend and alert engine
8. Compliance scoring
9. Multi-tenant config
10. Gateway adapter
11. Offline sync support
12. Batch ingestion and async sync
13. Observability and scaling
14. Security hardening
15. Release documentation
