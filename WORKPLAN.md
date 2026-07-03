# Dmonitor Milestone Workplan

This workplan organizes development into milestone-based phases, prioritizes backend work for security, separates backend, patient app, and OpenMRS integration tasks, and includes testing validation before moving to the next milestone.

## Overview
- Timeline: 10 milestones over 16 weeks
- Priority: backend first, minimal frontend for patient app UI
- Validation: test each milestone fully before proceeding
- Scope: service backend, patient app sync front-end, OpenMRS integration

## Alignment with IMPLEMENTATION_PLAN.md
| Milestone | Primary Implementation Plan Phase | Description |
|---|---|---|
| Milestone 1 | Phase 1, Phase 2 | Requirements, security, architecture, scaffold, service foundation |
| Milestone 2 | Phase 3 | Ingestion API, dynamic context capture, patient app sync |
| Milestone 3 | Phase 3, Phase 5 | Patient linking, OpenMRS sync pipeline, integration |
| Milestone 4 | Phase 4 | Trend analytics, alert engine, compliance scoring |
| Milestone 5 | Phase 4, Phase 5 | Dashboard APIs, clinic settings, tenant support |
| Milestone 6 | Phase 5, Phase 6 | Offline sync, batch ingestion, async workflows, gateway readiness |
| Milestone 7 | Phase 5, Phase 6 | Multi-tenant admin, tenant isolation, feature toggles |
| Milestone 8 | Phase 6 | Observability, monitoring, scaling |
| Milestone 9 | Phase 6 | Security hardening, privacy, audit logging |
| Milestone 10 | Phase 7 | Testing, validation, release documentation |

## Milestone 1 — Core Backend Scaffold and Security Foundation (Weeks 1-2)
### Goals
- Establish backend architecture
- Build secure service foundation
- Define APIs and data model

### Tasks
- Backend
  - Initialize repository structure and backend project
  - Add Dockerfile and local development environment
  - Implement authentication middleware (OAuth2/JWT)
  - Add HTTPS enforcement and input validation
  - Define core entities: PatientLink, GlucoseReading, ReadingContext, SyncEvent, AlertEvent
  - Add database migration tooling (PostgreSQL)
- Patient App
  - Define upload schema and minimal sync UI requirements
  - Create lightweight payload design for readings/context
- OpenMRS Integration
  - Define OpenMRS mapping strategy and patient matching rules
  - Document REST/FHIR integration contract

### Deliverables
- Working backend scaffold
- Security middleware and DB schema stub
- API contract draft
- Patient app payload spec
- OpenMRS integration design

### Validation
- Run backend startup smoke tests
- Validate auth enforcement and schema validation
- Review API contract and OpenMRS mapping

## Milestone 2 — Secure Reading Ingestion and Context Capture (Weeks 3-4)
### Goals
- Accept readings securely from patient app
- Persist dynamic context for each reading
- Minimize frontend logic to only necessary questions

### Tasks
- Backend
  - Implement `POST /api/v1/readings`
  - Validate and persist GlucoseReading + ReadingContext
  - Add raw ingestion logging and audit trail
  - Add patient history storage separate from daily sync
- Patient App
  - Implement minimal upload form for reading + context
  - Capture insulin dose, meal timing, exercise, symptoms
  - Avoid repeated static history questions during sync
- OpenMRS Integration
  - Build patient identifier lookup endpoint design
  - Prepare backend adapter stub for later syncing

### Deliverables
- Reading ingestion endpoint
- Patient app upload flow prototype
- Stored reading context model
- Audit logging for ingestion

### Validation
- Test ingestion flow with valid and invalid payloads
- Test dynamic context capture and repeat-question avoidance
- Verify backend logs and persistence

## Milestone 3 — Patient Matching and OpenMRS Sync Pipeline (Weeks 5-6)
### Goals
- Link readings to patients
- Sync records into OpenMRS
- Ensure idempotent, retryable backend sync

### Tasks
- Backend
  - Implement patient lookup by national ID/OpenMRS UUID
  - Implement manual pairing fallback API
  - Build OpenMRS adapter for patient metadata fetch
  - Implement observation and encounter creation
  - Add retry and error handling for OpenMRS failures
  - Add idempotency for duplicate readings
- Patient App
  - Add patient identifier entry for pairing
  - Add feedback when sync status is pending or failed
- OpenMRS Integration
  - Configure OpenMRS REST/FHIR service account
  - Test sample observation creation against local instance

### Deliverables
- Patient linking service
- OpenMRS sync pipeline
- Sync status recording
- Minimal patient pairing UI

### Validation
- Full end-to-end test from app upload to OpenMRS observation
- Verify handling of duplicates and retry logic
- Validate patient matching edge cases

## Milestone 4 — Alerting and Trend Analytics (Weeks 7-8)
### Goals
- Build core analytics and alert generation
- Produce clinician-facing flags using backend rules

### Tasks
- Backend
  - Implement rolling glucose trend calculations
  - Implement threshold detection and trend categories
  - Implement missed-reading detection and compliance scoring
  - Build alert engine for severe values and abnormal trends
  - Persist alert history and severity levels
- Patient App
  - Add simple status feedback for critical readings
- OpenMRS Integration
  - Ensure alerts can be correlated with synced patient data

### Deliverables
- Trend analytics engine
- Compliance scoring
- Alert generation and storage
- Basic alert feedback in app

### Validation
- Test trend analytics with sample reading sequences
- Validate alert generation rules and severity
- Verify alert persistence and API responses

## Milestone 5 — Clinician and Clinic Dashboard Endpoints (Weeks 9-10)
### Goals
- Expose clinician summary APIs
- Provide multi-clinic configuration endpoints

### Tasks
- Backend
  - Implement patient trend endpoints
  - Implement compliance summary endpoints
  - Implement alert summary endpoints
  - Implement admin/clinic dashboard endpoints
  - Implement per-clinic configurable alert thresholds
- Patient App
  - No production UI required; minimal admin/status views only if needed
- OpenMRS Integration
  - Add patient/clinic context in synced records

### Deliverables
- Dashboard-ready backend APIs
- Tenant-aware clinic config support
- Admin summary endpoints

### Validation
- Test dashboard endpoints with sample data
- Validate per-clinic settings and multi-tenant isolation
- Confirm API contracts for clinician views

## Milestone 6 — Offline Sync, Gateway, and High-volume Support (Weeks 11-12)
### Goals
- Add robust mobile offline sync support
- Add gateway integration readiness
- Prepare for higher data volumes

### Tasks
- Backend
  - Implement offline sync metadata and conflict handling
  - Implement device origin and timestamp normalization
  - Add batch ingestion support for high-volume uploads
  - Add asynchronous OpenMRS sync queueing
  - Implement gateway adapter interface for national portal
- Patient App
  - Support offline save and later retry upload
  - Provide sync status feedback for offline mode
- OpenMRS Integration
  - Add gateway sync coordination design

### Deliverables
- Offline sync backend support
- Batch ingestion flow
- Async sync queue and retry mechanism
- Gateway adapter stub
- App offline sync behavior

### Validation
- Test offline sync, retry, and conflict resolution
- Validate batch upload and queue processing
- Verify gateway adapter contract and coordination logic

## Milestone 7 — Multi-tenant and Clinic Administration (Weeks 13-14)
### Goals
- Support multiple clinics/tenants securely
- Add clinic admin configuration

### Tasks
- Backend
  - Implement tenant isolation model
  - Add clinic configuration and feature toggles
  - Add clinic admin roles and permissions
  - Add per-tenant alert rule configuration
- Patient App
  - Include minimal clinic selection or tenant binding
- OpenMRS Integration
  - Add tenant-aware OpenMRS mapping where required

### Deliverables
- Multi-tenant support
- Clinic admin APIs
- Tenant-aware alert/config handling

### Validation
- Test tenant isolation with sample clinics
- Validate admin configs and permission enforcement
- Confirm correct tenant mapping in OpenMRS sync

## Milestone 8 — Observability, Monitoring, and Scaling (Week 15)
### Goals
- Make the service observable and ready for production scaling

### Tasks
- Backend
  - Add metrics export and health checks
  - Add logs aggregation shape
  - Add tracing for critical workflows
  - Add operational dashboards for sync health and throughput
  - Add alerting for system failures and backpressure
- Patient App
  - No new frontend required
- OpenMRS Integration
  - Verify monitoring of integration health

### Deliverables
- Observability stack readiness
- Service health endpoints
- Monitoring dashboard guidance

### Validation
- Test metrics, tracing, and health probes
- Validate operational alert behavior
- Confirm service metrics for scaling decisions

## Milestone 9 — Security Hardening and Compliance (Week 16)
### Goals
- Harden the system for security and privacy
- Finalize compliance measures

### Tasks
- Backend
  - Add secrets management guidance
  - Add rate limiting and request throttling
  - Add payload sanitization and input validation hardening
  - Add audit logging for all access and sync events
  - Add vulnerability scans in CI
- Patient App
  - Ensure secure local storage and minimal data retention
- OpenMRS Integration
  - Verify secure service account usage and audit logging

### Deliverables
- Security hardening checklist completed
- Production privacy and compliance documentation
- Final CI security scans

### Validation
- Run security and vulnerability scans
- Review audit logging coverage
- Validate compliance requirements for data handling

## Milestone 10 — Release Readiness and Documentation (Week 16)
### Goals
- Prepare for launch and handoff
- Document system usage and operations

### Tasks
- Backend
  - Finalize README, deployment guide, and environment docs
  - Publish Docker build and deployment pipeline
  - Add versioning and rollback strategy
- Patient App
  - Document minimal app install and sync workflow
- OpenMRS Integration
  - Document OpenMRS configuration and integration steps

### Deliverables
- Release documentation set
- Deployment and rollback plan
- Final project handoff materials

### Validation
- Review end-to-end release checklist
- Confirm documentation covers backend, app, and OpenMRS
- Verify deployment process in staging

## Notes
- Testing is built-in: complete tests for each milestone before moving to the next
- Backend work remains primary; front-end is minimal and focused on patient sync context
- OpenMRS integration work is tracked separately but aligned with backend milestones
- Timeline is modular and can be shortened or extended based on team capacity
