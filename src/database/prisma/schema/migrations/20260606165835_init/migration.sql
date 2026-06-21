-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'INVENTORY_LOW', 'OCCUPANCY_THRESHOLD', 'OTA_SYNC_FAILED', 'HOUSEKEEPING_COMPLETED', 'MAINTENANCE_OPENED', 'SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED', 'AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('ROOM_UPGRADE', 'PRICING_ADJUSTMENT', 'OCCUPANCY_OPTIMIZATION', 'OTA_PERFORMANCE', 'STAFFING_ADJUSTMENT', 'MAINTENANCE_PRIORITY', 'UPSELL_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'APPLIED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('OCCUPANCY_TREND', 'BOOKING_PATTERN', 'CANCELLATION_SPIKE', 'REVENUE_ANOMALY', 'OPERATIONAL_BOTTLENECK', 'STAFF_WORKLOAD', 'PRICING_EFFECTIVENESS');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('SUSPICIOUS_BOOKING', 'PAYMENT_ANOMALY', 'UNUSUAL_CANCELLATION', 'INVENTORY_MISMATCH', 'PRICING_OUTLIER', 'OTA_SYNC_FAILURE', 'OPERATIONAL_DELAY');

-- CreateEnum
CREATE TYPE "AutomationRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('SEND_NOTIFICATION', 'UPDATE_STATUS', 'ESCALATE', 'LOG', 'HTTP_CALLBACK', 'CONDITIONAL', 'DELAY');

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'OTA', 'WALK_IN', 'PHONE', 'EMAIL', 'AGENT', 'ONLINE');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('GUEST_REQUEST', 'NO_SHOW', 'HOTEL_REQUEST', 'FORCE_MAJEURE', 'DUPLICATE_BOOKING', 'OTHER');

-- CreateEnum
CREATE TYPE "GovIdType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingAuditEvent" AS ENUM ('CREATED', 'CONFIRMED', 'MODIFIED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW_MARKED', 'NOTE_ADDED', 'ROOM_CHANGED', 'GUEST_UPDATED', 'PAYMENT_RECORDED');

-- CreateEnum
CREATE TYPE "BookingRoomStatus" AS ENUM ('RESERVED', 'OCCUPIED', 'VACATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'HOTEL_MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'PENDING_SETUP');

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "HotelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HotelCategory" AS ENUM ('BUDGET', 'ECONOMY', 'MIDSCALE', 'UPSCALE', 'LUXURY', 'BOUTIQUE', 'RESORT', 'HOSTEL');

-- CreateEnum
CREATE TYPE "HotelOperationalStatus" AS ENUM ('OPEN', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY', 'UNDER_RENOVATION', 'PRE_OPENING');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT', 'ASSIGN', 'CANCEL');

-- CreateEnum
CREATE TYPE "AuditResource" AS ENUM ('USER', 'ORGANIZATION', 'HOTEL', 'ROOM', 'BOOKING', 'PAYMENT', 'INVENTORY', 'HOUSEKEEPING_TASK', 'RATE_PLAN', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "EventQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER', 'RETRYING');

-- CreateEnum
CREATE TYPE "WorkerExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryBlockReason" AS ENUM ('MAINTENANCE', 'OTA_BLOCK', 'MANUAL_BLOCK', 'HOTEL_USE', 'RENOVATION', 'VIP_HOLD', 'CONTINGENCY');

-- CreateEnum
CREATE TYPE "HousekeepingTaskType" AS ENUM ('STANDARD_CLEANING', 'DEEP_CLEANING', 'TURNDOWN', 'INSPECTION', 'LINEN_CHANGE', 'BATHROOM_CLEANING', 'CHECKOUT_CLEANING');

-- CreateEnum
CREATE TYPE "HousekeepingPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "MaintenanceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OperationalTaskCategory" AS ENUM ('FRONT_DESK', 'CONCIERGE', 'FOOD_BEVERAGE', 'GENERAL', 'MAINTENANCE_FOLLOWUP', 'GUEST_REQUEST', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "OperationalTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OTAProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('INVENTORY_PUSH', 'RATE_PUSH', 'RESERVATION_PULL', 'RESERVATION_IMPORT', 'RECONCILIATION', 'FULL_SYNC');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'RETRYING');

-- CreateEnum
CREATE TYPE "SyncEventType" AS ENUM ('SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'RETRY_INITIATED', 'INVENTORY_UPDATED', 'RATE_UPDATED', 'RESERVATION_RECEIVED', 'RESERVATION_IMPORTED', 'MAPPING_VALIDATED', 'RECONCILIATION_COMPLETE');

-- CreateEnum
CREATE TYPE "ReservationImportStatus" AS ENUM ('PENDING', 'IMPORTED', 'FAILED', 'DUPLICATE', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('PAYMENT', 'REFUND', 'FEE', 'ADJUSTMENT', 'TAX');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'UPI', 'WALLET', 'OTA_COLLECT', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('ROOM_CHARGE', 'TAX', 'DISCOUNT', 'SERVICE_CHARGE', 'FOOD_BEVERAGE', 'LAUNDRY', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentAuditEvent" AS ENUM ('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUND_INITIATED', 'REFUND_SUCCESS', 'REFUND_FAILED', 'RECONCILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PricingStrategy" AS ENUM ('FLAT_RATE', 'PERCENTAGE_ADJUSTMENT', 'OCCUPANCY_BASED', 'SEASONAL', 'WEEKEND', 'SPECIAL_EVENT', 'DEMAND_BASED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCREASE', 'DECREASE', 'FIXED');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('DAILY_BOOKING', 'WEEKLY_BOOKING', 'MONTHLY_BOOKING', 'PAYMENT_SUMMARY', 'OTA_PERFORMANCE', 'HOUSEKEEPING_PERFORMANCE', 'OPERATIONAL_SUMMARY');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_CHECKED_IN', 'BOOKING_CHECKED_OUT', 'PAYMENT_COMPLETED', 'PAYMENT_REFUNDED', 'INVENTORY_RESERVED', 'INVENTORY_RELEASED', 'OTA_SYNC_COMPLETED', 'AGGREGATION_COMPLETED');

-- CreateEnum
CREATE TYPE "AnalyticsReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnalyticsReportType" AS ENUM ('FINANCIAL', 'OCCUPANCY', 'OTA', 'BOOKINGS', 'OPERATIONS', 'DASHBOARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AggregationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ForecastConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PricingTrigger" AS ENUM ('MANUAL', 'OCCUPANCY_RULE', 'SEASONAL_RULE', 'DEMAND_FORECAST', 'SURGE', 'SCHEDULED', 'OTA_SYNC');

-- CreateEnum
CREATE TYPE "RevenueSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RoomTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('KING', 'QUEEN', 'DOUBLE', 'TWIN', 'SINGLE', 'BUNK', 'SOFA_BED', 'CALIFORNIA_KING');

-- CreateEnum
CREATE TYPE "RoomOperationalStatus" AS ENUM ('AVAILABLE', 'OUT_OF_ORDER', 'UNDER_MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('CLEAN', 'DIRTY', 'INSPECTED', 'IN_PROGRESS', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('NONE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'DUE_IN', 'DUE_OUT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'TOKEN_REVOKED', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_DETECTED', 'SESSION_HIJACK_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'DATA_EXPORT_REQUESTED', 'ADMIN_ACTION', 'RATE_LIMIT_EXCEEDED', 'MFA_CHALLENGE', 'PERMISSION_DENIED');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplianceRequestType" AS ENUM ('DATA_EXPORT', 'DATA_DELETION', 'DATA_ANONYMIZATION', 'AUDIT_REPORT', 'CONSENT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "ComplianceRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('DATABASE', 'REDIS_SNAPSHOT', 'QUEUE_STATE', 'FULL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'VERIFIED', 'CORRUPTED');

-- CreateEnum
CREATE TYPE "RecoveryType" AS ENUM ('DATABASE_RESTORE', 'CACHE_WARMUP', 'QUEUE_REPLAY', 'FULL_RECOVERY');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "SystemServiceStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NotificationDeliveryResult" AS ENUM ('SUCCESS', 'FAILED', 'TIMEOUT', 'BOUNCED', 'REJECTED');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "ruleName" VARCHAR(200) NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "conditionPayload" JSONB NOT NULL,
    "actionPayload" JSONB NOT NULL,
    "ruleStatus" "AutomationRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "workflowName" VARCHAR(200) NOT NULL,
    "automationRuleId" TEXT,
    "executionStatus" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerSource" VARCHAR(100) NOT NULL,
    "executionPayload" JSONB,
    "resultPayload" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(255),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" VARCHAR(2000),
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stepName" VARCHAR(200) NOT NULL,
    "stepType" "WorkflowStepType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_execution_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "workflowStepId" TEXT,
    "organizationId" TEXT NOT NULL,
    "stepName" VARCHAR(200) NOT NULL,
    "stepStatus" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
    "inputPayload" JSONB,
    "outputPayload" JSONB,
    "failureReason" VARCHAR(2000),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_retry_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "retryNumber" INTEGER NOT NULL,
    "failureReason" VARCHAR(2000),
    "triggeredBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_retry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_audit_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT,
    "automationRuleId" TEXT,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "actionType" VARCHAR(100) NOT NULL,
    "actorId" VARCHAR(255),
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "recommendationType" "RecommendationType" NOT NULL,
    "recommendationPayload" JSONB NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "recommendationStatus" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "explanation" VARCHAR(1000),
    "expiresAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_insights" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "insightPayload" JSONB NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_detections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "anomalyPayload" JSONB NOT NULL,
    "riskScore" DECIMAL(4,3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "primaryRole" "UserRoleType" NOT NULL DEFAULT 'FRONT_DESK',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organizationId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "bookingNumber" VARCHAR(30) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "primaryGuestId" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "specialRequests" TEXT,
    "internalNotes" TEXT,
    "bookedById" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" "CancellationReason",
    "cancellationNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_rooms" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "nightCount" INTEGER NOT NULL,
    "adultCount" INTEGER NOT NULL DEFAULT 1,
    "childCount" INTEGER NOT NULL DEFAULT 0,
    "roomRate" DECIMAL(10,2) NOT NULL,
    "totalRoomAmount" DECIMAL(12,2) NOT NULL,
    "status" "BookingRoomStatus" NOT NULL DEFAULT 'RESERVED',
    "specialRequests" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "nationality" VARCHAR(100),
    "governmentIdType" "GovIdType",
    "governmentIdNumber" VARCHAR(100),
    "dateOfBirth" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_audit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventType" "BookingAuditEvent" NOT NULL,
    "eventDescription" VARCHAR(1000) NOT NULL,
    "performedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource" "AuditResource" NOT NULL,
    "resourceId" VARCHAR(255) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "before" JSONB,
    "after" JSONB,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "hotelCode" VARCHAR(20),
    "organizationId" TEXT NOT NULL,
    "status" "HotelStatus" NOT NULL DEFAULT 'ACTIVE',
    "operationalStatus" "HotelOperationalStatus" NOT NULL DEFAULT 'PRE_OPENING',
    "category" "HotelCategory" NOT NULL,
    "starRating" INTEGER NOT NULL DEFAULT 3,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "website" VARCHAR(255),
    "description" TEXT,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "addressLine1" VARCHAR(255) NOT NULL,
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(2) NOT NULL,
    "postalCode" VARCHAR(20),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "checkInTime" VARCHAR(5) NOT NULL DEFAULT '14:00',
    "checkOutTime" VARCHAR(5) NOT NULL DEFAULT '11:00',
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "amenities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_queue_items" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(150) NOT NULL,
    "eventPayload" JSONB NOT NULL,
    "queueStatus" "EventQueueStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "idempotencyKey" VARCHAR(255),
    "scheduledAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedReason" VARCHAR(2000),
    "organizationId" TEXT,
    "source" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_executions" (
    "id" TEXT NOT NULL,
    "workerName" VARCHAR(100) NOT NULL,
    "executionStatus" "WorkerExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedReason" VARCHAR(2000),
    "durationMs" INTEGER,
    "itemsProcessed" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "inventoryDate" DATE NOT NULL,
    "totalInventory" INTEGER NOT NULL DEFAULT 0,
    "reservedInventory" INTEGER NOT NULL DEFAULT 0,
    "blockedInventory" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_blocks" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reason" "InventoryBlockReason" NOT NULL,
    "blockedById" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "taskType" "HousekeepingTaskType" NOT NULL,
    "priority" "HousekeepingPriority" NOT NULL DEFAULT 'NORMAL',
    "taskStatus" "HousekeepingTaskStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" VARCHAR(1000),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "issueType" VARCHAR(100) NOT NULL,
    "severity" "MaintenanceSeverity" NOT NULL,
    "ticketStatus" "MaintenanceTicketStatus" NOT NULL DEFAULT 'OPEN',
    "reportedBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "taskTitle" VARCHAR(255) NOT NULL,
    "taskDescription" TEXT,
    "taskCategory" "OperationalTaskCategory" NOT NULL,
    "priority" "HousekeepingPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "taskStatus" "OperationalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_audit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "performedBy" TEXT NOT NULL,
    "eventMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(300),
    "slug" VARCHAR(64) NOT NULL,
    "plan" "OrgPlan" NOT NULL DEFAULT 'FREE',
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "website" VARCHAR(255),
    "logoUrl" TEXT,
    "addressLine1" VARCHAR(255),
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(2) NOT NULL DEFAULT 'US',
    "postalCode" VARCHAR(20),
    "maxHotels" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "organizationId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT,
    "hotelId" TEXT,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_providers" (
    "id" TEXT NOT NULL,
    "providerName" VARCHAR(100) NOT NULL,
    "providerCode" VARCHAR(50) NOT NULL,
    "status" "OTAProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "webhookUrl" VARCHAR(500),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "providerId" TEXT NOT NULL,
    "externalHotelId" VARCHAR(200) NOT NULL,
    "externalRoomTypeId" VARCHAR(200),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" VARCHAR(2000),
    "payload" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_events" (
    "id" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "eventType" "SyncEventType" NOT NULL,
    "payload" JSONB,
    "processingStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_reservations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalReservationId" VARCHAR(200) NOT NULL,
    "bookingId" TEXT,
    "syncStatus" "ReservationImportStatus" NOT NULL DEFAULT 'PENDING',
    "rawPayload" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentReference" VARCHAR(50) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentProvider" VARCHAR(100),
    "transactionId" VARCHAR(255),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" VARCHAR(500),
    "metadata" JSONB,
    "processedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "refundReference" VARCHAR(50) NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "refundReason" VARCHAR(500) NOT NULL,
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processedById" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(30) NOT NULL,
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemType" "InvoiceItemType" NOT NULL,
    "itemName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_audit" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" "PaymentAuditEvent" NOT NULL,
    "eventDescription" VARCHAR(1000) NOT NULL,
    "performedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_idempotency_keys" (
    "id" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "externalEventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "paymentId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "gatewayName" VARCHAR(100) NOT NULL,
    "gatewayTxnId" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "failureReason" VARCHAR(500),
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "referenceId" VARCHAR(255) NOT NULL,
    "referenceType" VARCHAR(50) NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "description" VARCHAR(1000) NOT NULL,
    "correlationId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "ruleName" VARCHAR(200) NOT NULL,
    "pricingStrategy" "PricingStrategy" NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "adjustmentValue" DECIMAL(10,4) NOT NULL,
    "minimumPrice" DECIMAL(10,2),
    "maximumPrice" DECIMAL(10,2),
    "applicableDays" TEXT[],
    "applicableSeasons" TEXT[],
    "activeFrom" DATE NOT NULL,
    "activeTo" DATE,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_rates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "inventoryDate" DATE NOT NULL,
    "calculatedRate" DECIMAL(10,2) NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "appliedRuleId" TEXT,
    "occupancyFactor" DECIMAL(6,4) NOT NULL DEFAULT 1.0,
    "demandFactor" DECIMAL(6,4) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "occupancyRate" DECIMAL(6,4) NOT NULL,
    "adr" DECIMAL(10,2) NOT NULL,
    "revpar" DECIMAL(10,2) NOT NULL,
    "totalRevenue" DECIMAL(14,2) NOT NULL,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DECIMAL(6,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "snapshotType" "SnapshotType" NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "metricsPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" VARCHAR(255),
    "eventType" "AnalyticsEventType" NOT NULL,
    "externalEventId" VARCHAR(255) NOT NULL,
    "eventData" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reportType" "AnalyticsReportType" NOT NULL,
    "reportStatus" "AnalyticsReportStatus" NOT NULL DEFAULT 'PENDING',
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "format" VARCHAR(10) NOT NULL DEFAULT 'json',
    "reportData" JSONB,
    "errorMessage" VARCHAR(500),
    "requestedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_aggregation_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "jobType" VARCHAR(50) NOT NULL DEFAULT 'daily',
    "jobStatus" "AggregationJobStatus" NOT NULL DEFAULT 'PENDING',
    "targetDate" DATE NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(500),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_aggregation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_campaigns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "campaignName" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "multiplier" DECIMAL(5,3) NOT NULL,
    "minimumPrice" DECIMAL(10,2),
    "maximumPrice" DECIMAL(10,2),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "applicableRoomTypeIds" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_targets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "targetPeriod" VARCHAR(7) NOT NULL,
    "targetRevenue" DECIMAL(14,2) NOT NULL,
    "targetRevPar" DECIMAL(10,2) NOT NULL,
    "targetAdr" DECIMAL(10,2) NOT NULL,
    "targetOccupancy" DECIMAL(5,4) NOT NULL,
    "actualRevenue" DECIMAL(14,2),
    "actualRevPar" DECIMAL(10,2),
    "actualAdr" DECIMAL(10,2),
    "actualOccupancy" DECIMAL(5,4),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "targetDate" VARCHAR(10) NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "recommendedPrice" DECIMAL(10,2) NOT NULL,
    "minPrice" DECIMAL(10,2) NOT NULL,
    "maxPrice" DECIMAL(10,2) NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "occupancyFactor" DECIMAL(5,3) NOT NULL,
    "seasonalFactor" DECIMAL(5,3) NOT NULL,
    "demandFactor" DECIMAL(5,3) NOT NULL,
    "rationale" VARCHAR(1000),
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_data_points" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "forecastDate" VARCHAR(10) NOT NULL,
    "projectedOccupancy" DECIMAL(5,4) NOT NULL,
    "projectedAdr" DECIMAL(10,2) NOT NULL,
    "projectedRevPar" DECIMAL(10,2) NOT NULL,
    "confidence" "ForecastConfidence" NOT NULL DEFAULT 'MEDIUM',
    "bookingVelocity" DECIMAL(6,2),
    "competitorRateIndex" DECIMAL(5,3),
    "eventImpact" JSONB,
    "forecastedBy" VARCHAR(50) NOT NULL DEFAULT 'ALGORITHM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecast_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "targetDate" VARCHAR(10),
    "actionType" VARCHAR(100) NOT NULL,
    "triggeredBy" "PricingTrigger" NOT NULL,
    "previousPrice" DECIMAL(10,2),
    "newPrice" DECIMAL(10,2),
    "effectiveMultiplier" DECIMAL(5,3),
    "performedBy" VARCHAR(255),
    "ruleId" TEXT,
    "campaignId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_rate_syncs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "otaProviderId" TEXT NOT NULL,
    "targetDate" VARCHAR(10) NOT NULL,
    "syncedRate" DECIMAL(10,2) NOT NULL,
    "syncStatus" "RevenueSyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(500),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_rate_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(255),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "maxInfants" INTEGER NOT NULL DEFAULT 1,
    "minChildAge" INTEGER NOT NULL DEFAULT 7,
    "maxChildAge" INTEGER NOT NULL DEFAULT 12,
    "minInfantAge" INTEGER NOT NULL DEFAULT 0,
    "maxInfantAge" INTEGER NOT NULL DEFAULT 6,
    "minOccupancy" INTEGER NOT NULL DEFAULT 1,
    "absoluteMax" INTEGER NOT NULL DEFAULT 3,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "hourlyPrice" DECIMAL(10,2),
    "extraBedPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "extraGuestPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "maxExtraBeds" INTEGER NOT NULL DEFAULT 0,
    "sizeM2" DECIMAL(8,2),
    "bedType" "BedType" NOT NULL DEFAULT 'QUEEN',
    "amenities" TEXT[],
    "status" "RoomTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" VARCHAR(20) NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "description" VARCHAR(500),
    "view" VARCHAR(100),
    "operationalStatus" "RoomOperationalStatus" NOT NULL DEFAULT 'AVAILABLE',
    "housekeepingStatus" "HousekeepingStatus" NOT NULL DEFAULT 'CLEAN',
    "occupancyStatus" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "maintenanceStatus" "MaintenanceStatus" NOT NULL DEFAULT 'NONE',
    "notes" VARCHAR(1000),
    "wing" VARCHAR(100),
    "zone" VARCHAR(100),
    "wifiSSID" VARCHAR(100),
    "wifiPassword" VARCHAR(100),
    "arrivalNotes" VARCHAR(1000),
    "lockVendor" VARCHAR(50),
    "lockDeviceId" VARCHAR(100),
    "lockSecret" VARCHAR(500),
    "connectingRoomId" VARCHAR(100),
    "parentRoomId" VARCHAR(100),
    "lastCleanedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "deviceId" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(500) NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "sessionStatus" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "hotelId" TEXT,
    "userId" TEXT,
    "eventType" "SecurityEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'LOW',
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestType" "ComplianceRequestType" NOT NULL,
    "requestStatus" "ComplianceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "notes" VARCHAR(2000),
    "resultPayload" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_snapshots" (
    "id" TEXT NOT NULL,
    "backupType" "BackupType" NOT NULL,
    "backupStatus" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "storageLocation" VARCHAR(500) NOT NULL,
    "sizeBytes" BIGINT,
    "checksum" VARCHAR(128),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_executions" (
    "id" TEXT NOT NULL,
    "recoveryType" "RecoveryType" NOT NULL,
    "recoveryStatus" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "backupSnapshotId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "executionLogs" JSONB,
    "metadata" JSONB,
    "initiatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "notificationType" "NotificationType" NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "message" TEXT NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedReason" VARCHAR(1000),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "deliveryResult" "NotificationDeliveryResult" NOT NULL,
    "providerName" VARCHAR(100),
    "providerMessageId" VARCHAR(255),
    "responsePayload" JSONB,
    "latencyMs" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_retry_logs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "retryNumber" INTEGER NOT NULL,
    "failureReason" VARCHAR(1000),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_retry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_audit_logs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "actionType" VARCHAR(100) NOT NULL,
    "actorId" VARCHAR(255),
    "previousStatus" "DeliveryStatus",
    "currentStatus" "DeliveryStatus" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "templateName" VARCHAR(100) NOT NULL,
    "templateType" "NotificationType" NOT NULL,
    "subjectTemplate" VARCHAR(500),
    "bodyTemplate" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "central_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" TEXT NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "previousState" JSONB,
    "currentState" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "central_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "jobType" VARCHAR(100) NOT NULL,
    "jobStatus" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "idempotencyKey" VARCHAR(255),
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedReason" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL,
    "serviceName" VARCHAR(100) NOT NULL,
    "serviceStatus" "SystemServiceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_idx" ON "automation_rules"("organizationId");

-- CreateIndex
CREATE INDEX "automation_rules_hotelId_idx" ON "automation_rules"("hotelId");

-- CreateIndex
CREATE INDEX "automation_rules_triggerType_idx" ON "automation_rules"("triggerType");

-- CreateIndex
CREATE INDEX "automation_rules_ruleStatus_idx" ON "automation_rules"("ruleStatus");

-- CreateIndex
CREATE INDEX "automation_rules_priority_idx" ON "automation_rules"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_idempotencyKey_key" ON "workflow_executions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "workflow_executions_organizationId_idx" ON "workflow_executions"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_executions_hotelId_idx" ON "workflow_executions"("hotelId");

-- CreateIndex
CREATE INDEX "workflow_executions_executionStatus_idx" ON "workflow_executions"("executionStatus");

-- CreateIndex
CREATE INDEX "workflow_executions_workflowName_idx" ON "workflow_executions"("workflowName");

-- CreateIndex
CREATE INDEX "workflow_executions_triggerSource_idx" ON "workflow_executions"("triggerSource");

-- CreateIndex
CREATE INDEX "workflow_executions_createdAt_idx" ON "workflow_executions"("createdAt");

-- CreateIndex
CREATE INDEX "workflow_steps_automationRuleId_idx" ON "workflow_steps"("automationRuleId");

-- CreateIndex
CREATE INDEX "workflow_steps_organizationId_idx" ON "workflow_steps"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_steps_stepOrder_idx" ON "workflow_steps"("stepOrder");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_executionId_idx" ON "workflow_execution_logs"("executionId");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_organizationId_idx" ON "workflow_execution_logs"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_stepStatus_idx" ON "workflow_execution_logs"("stepStatus");

-- CreateIndex
CREATE INDEX "workflow_execution_logs_createdAt_idx" ON "workflow_execution_logs"("createdAt");

-- CreateIndex
CREATE INDEX "workflow_retry_logs_executionId_idx" ON "workflow_retry_logs"("executionId");

-- CreateIndex
CREATE INDEX "workflow_retry_logs_organizationId_idx" ON "workflow_retry_logs"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_retry_logs_createdAt_idx" ON "workflow_retry_logs"("createdAt");

-- CreateIndex
CREATE INDEX "workflow_audit_logs_executionId_idx" ON "workflow_audit_logs"("executionId");

-- CreateIndex
CREATE INDEX "workflow_audit_logs_automationRuleId_idx" ON "workflow_audit_logs"("automationRuleId");

-- CreateIndex
CREATE INDEX "workflow_audit_logs_organizationId_idx" ON "workflow_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_audit_logs_actionType_idx" ON "workflow_audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "workflow_audit_logs_createdAt_idx" ON "workflow_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "recommendations_organizationId_idx" ON "recommendations"("organizationId");

-- CreateIndex
CREATE INDEX "recommendations_hotelId_idx" ON "recommendations"("hotelId");

-- CreateIndex
CREATE INDEX "recommendations_recommendationType_idx" ON "recommendations"("recommendationType");

-- CreateIndex
CREATE INDEX "recommendations_recommendationStatus_idx" ON "recommendations"("recommendationStatus");

-- CreateIndex
CREATE INDEX "recommendations_generatedAt_idx" ON "recommendations"("generatedAt");

-- CreateIndex
CREATE INDEX "recommendations_expiresAt_idx" ON "recommendations"("expiresAt");

-- CreateIndex
CREATE INDEX "operational_insights_organizationId_idx" ON "operational_insights"("organizationId");

-- CreateIndex
CREATE INDEX "operational_insights_hotelId_idx" ON "operational_insights"("hotelId");

-- CreateIndex
CREATE INDEX "operational_insights_insightType_idx" ON "operational_insights"("insightType");

-- CreateIndex
CREATE INDEX "operational_insights_severity_idx" ON "operational_insights"("severity");

-- CreateIndex
CREATE INDEX "operational_insights_generatedAt_idx" ON "operational_insights"("generatedAt");

-- CreateIndex
CREATE INDEX "anomaly_detections_organizationId_idx" ON "anomaly_detections"("organizationId");

-- CreateIndex
CREATE INDEX "anomaly_detections_hotelId_idx" ON "anomaly_detections"("hotelId");

-- CreateIndex
CREATE INDEX "anomaly_detections_anomalyType_idx" ON "anomaly_detections"("anomalyType");

-- CreateIndex
CREATE INDEX "anomaly_detections_riskScore_idx" ON "anomaly_detections"("riskScore");

-- CreateIndex
CREATE INDEX "anomaly_detections_detectedAt_idx" ON "anomaly_detections"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_primaryRole_idx" ON "users"("primaryRole");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_organizationId_idx" ON "bookings"("organizationId");

-- CreateIndex
CREATE INDEX "bookings_hotelId_idx" ON "bookings"("hotelId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_source_idx" ON "bookings"("source");

-- CreateIndex
CREATE INDEX "bookings_bookingNumber_idx" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_primaryGuestId_idx" ON "bookings"("primaryGuestId");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_deletedAt_idx" ON "bookings"("deletedAt");

-- CreateIndex
CREATE INDEX "booking_rooms_bookingId_idx" ON "booking_rooms"("bookingId");

-- CreateIndex
CREATE INDEX "booking_rooms_roomId_idx" ON "booking_rooms"("roomId");

-- CreateIndex
CREATE INDEX "booking_rooms_roomTypeId_idx" ON "booking_rooms"("roomTypeId");

-- CreateIndex
CREATE INDEX "booking_rooms_hotelId_idx" ON "booking_rooms"("hotelId");

-- CreateIndex
CREATE INDEX "booking_rooms_checkInDate_checkOutDate_idx" ON "booking_rooms"("checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- CreateIndex
CREATE INDEX "booking_guests_email_idx" ON "booking_guests"("email");

-- CreateIndex
CREATE INDEX "booking_audit_bookingId_idx" ON "booking_audit"("bookingId");

-- CreateIndex
CREATE INDEX "booking_audit_eventType_idx" ON "booking_audit"("eventType");

-- CreateIndex
CREATE INDEX "booking_audit_createdAt_idx" ON "booking_audit"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "hotels_organizationId_idx" ON "hotels"("organizationId");

-- CreateIndex
CREATE INDEX "hotels_status_idx" ON "hotels"("status");

-- CreateIndex
CREATE INDEX "hotels_operationalStatus_idx" ON "hotels"("operationalStatus");

-- CreateIndex
CREATE INDEX "hotels_city_country_idx" ON "hotels"("city", "country");

-- CreateIndex
CREATE INDEX "hotels_starRating_idx" ON "hotels"("starRating");

-- CreateIndex
CREATE INDEX "hotels_category_idx" ON "hotels"("category");

-- CreateIndex
CREATE INDEX "hotels_deletedAt_idx" ON "hotels"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_organizationId_slug_key" ON "hotels"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_organizationId_hotelCode_key" ON "hotels"("organizationId", "hotelCode");

-- CreateIndex
CREATE UNIQUE INDEX "event_queue_items_idempotencyKey_key" ON "event_queue_items"("idempotencyKey");

-- CreateIndex
CREATE INDEX "event_queue_items_queueStatus_idx" ON "event_queue_items"("queueStatus");

-- CreateIndex
CREATE INDEX "event_queue_items_eventType_idx" ON "event_queue_items"("eventType");

-- CreateIndex
CREATE INDEX "event_queue_items_organizationId_idx" ON "event_queue_items"("organizationId");

-- CreateIndex
CREATE INDEX "event_queue_items_scheduledAt_idx" ON "event_queue_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "event_queue_items_createdAt_idx" ON "event_queue_items"("createdAt");

-- CreateIndex
CREATE INDEX "worker_executions_workerName_idx" ON "worker_executions"("workerName");

-- CreateIndex
CREATE INDEX "worker_executions_executionStatus_idx" ON "worker_executions"("executionStatus");

-- CreateIndex
CREATE INDEX "worker_executions_startedAt_idx" ON "worker_executions"("startedAt");

-- CreateIndex
CREATE INDEX "worker_executions_createdAt_idx" ON "worker_executions"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_hotelId_idx" ON "inventory"("hotelId");

-- CreateIndex
CREATE INDEX "inventory_organizationId_idx" ON "inventory"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_roomTypeId_idx" ON "inventory"("roomTypeId");

-- CreateIndex
CREATE INDEX "inventory_inventoryDate_idx" ON "inventory"("inventoryDate");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_roomTypeId_inventoryDate_key" ON "inventory"("roomTypeId", "inventoryDate");

-- CreateIndex
CREATE INDEX "inventory_blocks_inventoryId_idx" ON "inventory_blocks"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_blocks_hotelId_idx" ON "inventory_blocks"("hotelId");

-- CreateIndex
CREATE INDEX "inventory_blocks_isActive_idx" ON "inventory_blocks"("isActive");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_organizationId_idx" ON "housekeeping_tasks"("organizationId");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_hotelId_idx" ON "housekeeping_tasks"("hotelId");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_roomId_idx" ON "housekeeping_tasks"("roomId");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_assignedTo_idx" ON "housekeeping_tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_taskStatus_idx" ON "housekeeping_tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_priority_idx" ON "housekeeping_tasks"("priority");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_scheduledAt_idx" ON "housekeeping_tasks"("scheduledAt");

-- CreateIndex
CREATE INDEX "housekeeping_tasks_createdAt_idx" ON "housekeeping_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "maintenance_tickets_organizationId_idx" ON "maintenance_tickets"("organizationId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_hotelId_idx" ON "maintenance_tickets"("hotelId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_roomId_idx" ON "maintenance_tickets"("roomId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_ticketStatus_idx" ON "maintenance_tickets"("ticketStatus");

-- CreateIndex
CREATE INDEX "maintenance_tickets_severity_idx" ON "maintenance_tickets"("severity");

-- CreateIndex
CREATE INDEX "maintenance_tickets_assignedTo_idx" ON "maintenance_tickets"("assignedTo");

-- CreateIndex
CREATE INDEX "maintenance_tickets_reportedAt_idx" ON "maintenance_tickets"("reportedAt");

-- CreateIndex
CREATE INDEX "operational_tasks_organizationId_idx" ON "operational_tasks"("organizationId");

-- CreateIndex
CREATE INDEX "operational_tasks_hotelId_idx" ON "operational_tasks"("hotelId");

-- CreateIndex
CREATE INDEX "operational_tasks_assignedTo_idx" ON "operational_tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "operational_tasks_taskStatus_idx" ON "operational_tasks"("taskStatus");

-- CreateIndex
CREATE INDEX "operational_tasks_taskCategory_idx" ON "operational_tasks"("taskCategory");

-- CreateIndex
CREATE INDEX "operational_tasks_priority_idx" ON "operational_tasks"("priority");

-- CreateIndex
CREATE INDEX "operational_tasks_dueDate_idx" ON "operational_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "operational_tasks_createdAt_idx" ON "operational_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "operational_audit_organizationId_idx" ON "operational_audit"("organizationId");

-- CreateIndex
CREATE INDEX "operational_audit_hotelId_idx" ON "operational_audit"("hotelId");

-- CreateIndex
CREATE INDEX "operational_audit_entityType_entityId_idx" ON "operational_audit"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "operational_audit_eventType_idx" ON "operational_audit"("eventType");

-- CreateIndex
CREATE INDEX "operational_audit_performedBy_idx" ON "operational_audit"("performedBy");

-- CreateIndex
CREATE INDEX "operational_audit_createdAt_idx" ON "operational_audit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_ownerId_key" ON "organizations"("ownerId");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_plan_idx" ON "organizations"("plan");

-- CreateIndex
CREATE INDEX "organizations_ownerId_idx" ON "organizations"("ownerId");

-- CreateIndex
CREATE INDEX "organizations_deletedAt_idx" ON "organizations"("deletedAt");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE INDEX "organization_members_removedAt_idx" ON "organization_members"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "roles"("organizationId");

-- CreateIndex
CREATE INDEX "roles_isSystem_idx" ON "roles"("isSystem");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "user_roles_organizationId_idx" ON "user_roles"("organizationId");

-- CreateIndex
CREATE INDEX "user_roles_hotelId_idx" ON "user_roles"("hotelId");

-- CreateIndex
CREATE INDEX "user_roles_expiresAt_idx" ON "user_roles"("expiresAt");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ota_providers_providerCode_key" ON "ota_providers"("providerCode");

-- CreateIndex
CREATE INDEX "ota_providers_providerCode_idx" ON "ota_providers"("providerCode");

-- CreateIndex
CREATE INDEX "ota_providers_status_idx" ON "ota_providers"("status");

-- CreateIndex
CREATE INDEX "ota_mappings_organizationId_idx" ON "ota_mappings"("organizationId");

-- CreateIndex
CREATE INDEX "ota_mappings_hotelId_idx" ON "ota_mappings"("hotelId");

-- CreateIndex
CREATE INDEX "ota_mappings_roomTypeId_idx" ON "ota_mappings"("roomTypeId");

-- CreateIndex
CREATE INDEX "ota_mappings_providerId_idx" ON "ota_mappings"("providerId");

-- CreateIndex
CREATE INDEX "ota_mappings_syncStatus_idx" ON "ota_mappings"("syncStatus");

-- CreateIndex
CREATE INDEX "ota_mappings_isActive_idx" ON "ota_mappings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ota_mappings_hotelId_providerId_externalHotelId_key" ON "ota_mappings"("hotelId", "providerId", "externalHotelId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_jobs_idempotencyKey_key" ON "sync_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sync_jobs_organizationId_idx" ON "sync_jobs"("organizationId");

-- CreateIndex
CREATE INDEX "sync_jobs_hotelId_idx" ON "sync_jobs"("hotelId");

-- CreateIndex
CREATE INDEX "sync_jobs_providerId_idx" ON "sync_jobs"("providerId");

-- CreateIndex
CREATE INDEX "sync_jobs_syncStatus_idx" ON "sync_jobs"("syncStatus");

-- CreateIndex
CREATE INDEX "sync_jobs_syncType_idx" ON "sync_jobs"("syncType");

-- CreateIndex
CREATE INDEX "sync_jobs_createdAt_idx" ON "sync_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "sync_events_syncJobId_idx" ON "sync_events"("syncJobId");

-- CreateIndex
CREATE INDEX "sync_events_eventType_idx" ON "sync_events"("eventType");

-- CreateIndex
CREATE INDEX "sync_events_processingStatus_idx" ON "sync_events"("processingStatus");

-- CreateIndex
CREATE INDEX "sync_events_createdAt_idx" ON "sync_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ota_reservations_bookingId_key" ON "ota_reservations"("bookingId");

-- CreateIndex
CREATE INDEX "ota_reservations_organizationId_idx" ON "ota_reservations"("organizationId");

-- CreateIndex
CREATE INDEX "ota_reservations_hotelId_idx" ON "ota_reservations"("hotelId");

-- CreateIndex
CREATE INDEX "ota_reservations_providerId_idx" ON "ota_reservations"("providerId");

-- CreateIndex
CREATE INDEX "ota_reservations_syncStatus_idx" ON "ota_reservations"("syncStatus");

-- CreateIndex
CREATE INDEX "ota_reservations_bookingId_idx" ON "ota_reservations"("bookingId");

-- CreateIndex
CREATE INDEX "ota_reservations_externalReservationId_idx" ON "ota_reservations"("externalReservationId");

-- CreateIndex
CREATE UNIQUE INDEX "ota_reservations_providerId_externalReservationId_key" ON "ota_reservations"("providerId", "externalReservationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentReference_key" ON "payments"("paymentReference");

-- CreateIndex
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");

-- CreateIndex
CREATE INDEX "payments_hotelId_idx" ON "payments"("hotelId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_paymentStatus_idx" ON "payments"("paymentStatus");

-- CreateIndex
CREATE INDEX "payments_paymentReference_idx" ON "payments"("paymentReference");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundReference_key" ON "refunds"("refundReference");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "refunds_refundStatus_idx" ON "refunds"("refundStatus");

-- CreateIndex
CREATE INDEX "refunds_createdAt_idx" ON "refunds"("createdAt");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_hotelId_idx" ON "invoices"("hotelId");

-- CreateIndex
CREATE INDEX "invoices_bookingId_idx" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "invoices_invoiceStatus_idx" ON "invoices"("invoiceStatus");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_hotelId_invoiceNumber_key" ON "invoices"("hotelId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_itemType_idx" ON "invoice_items"("itemType");

-- CreateIndex
CREATE INDEX "payment_audit_paymentId_idx" ON "payment_audit"("paymentId");

-- CreateIndex
CREATE INDEX "payment_audit_eventType_idx" ON "payment_audit"("eventType");

-- CreateIndex
CREATE INDEX "payment_audit_createdAt_idx" ON "payment_audit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_idempotency_keys_idempotencyKey_key" ON "payment_idempotency_keys"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_idempotency_keys_organizationId_idx" ON "payment_idempotency_keys"("organizationId");

-- CreateIndex
CREATE INDEX "payment_idempotency_keys_expiresAt_idx" ON "payment_idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_externalEventId_key" ON "payment_webhook_events"("externalEventId");

-- CreateIndex
CREATE INDEX "payment_webhook_events_externalEventId_idx" ON "payment_webhook_events"("externalEventId");

-- CreateIndex
CREATE INDEX "payment_webhook_events_paymentId_idx" ON "payment_webhook_events"("paymentId");

-- CreateIndex
CREATE INDEX "payment_webhook_events_processed_idx" ON "payment_webhook_events"("processed");

-- CreateIndex
CREATE INDEX "payment_webhook_events_createdAt_idx" ON "payment_webhook_events"("createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_paymentId_idx" ON "payment_transactions"("paymentId");

-- CreateIndex
CREATE INDEX "payment_transactions_gatewayTxnId_idx" ON "payment_transactions"("gatewayTxnId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_attemptedAt_idx" ON "payment_transactions"("attemptedAt");

-- CreateIndex
CREATE INDEX "ledger_entries_organizationId_idx" ON "ledger_entries"("organizationId");

-- CreateIndex
CREATE INDEX "ledger_entries_hotelId_idx" ON "ledger_entries"("hotelId");

-- CreateIndex
CREATE INDEX "ledger_entries_referenceId_idx" ON "ledger_entries"("referenceId");

-- CreateIndex
CREATE INDEX "ledger_entries_entryType_idx" ON "ledger_entries"("entryType");

-- CreateIndex
CREATE INDEX "ledger_entries_category_idx" ON "ledger_entries"("category");

-- CreateIndex
CREATE INDEX "ledger_entries_currency_idx" ON "ledger_entries"("currency");

-- CreateIndex
CREATE INDEX "ledger_entries_createdAt_idx" ON "ledger_entries"("createdAt");

-- CreateIndex
CREATE INDEX "pricing_rules_organizationId_idx" ON "pricing_rules"("organizationId");

-- CreateIndex
CREATE INDEX "pricing_rules_hotelId_idx" ON "pricing_rules"("hotelId");

-- CreateIndex
CREATE INDEX "pricing_rules_roomTypeId_idx" ON "pricing_rules"("roomTypeId");

-- CreateIndex
CREATE INDEX "pricing_rules_status_idx" ON "pricing_rules"("status");

-- CreateIndex
CREATE INDEX "pricing_rules_pricingStrategy_idx" ON "pricing_rules"("pricingStrategy");

-- CreateIndex
CREATE INDEX "pricing_rules_priority_idx" ON "pricing_rules"("priority");

-- CreateIndex
CREATE INDEX "pricing_rules_activeFrom_activeTo_idx" ON "pricing_rules"("activeFrom", "activeTo");

-- CreateIndex
CREATE INDEX "dynamic_rates_organizationId_idx" ON "dynamic_rates"("organizationId");

-- CreateIndex
CREATE INDEX "dynamic_rates_hotelId_idx" ON "dynamic_rates"("hotelId");

-- CreateIndex
CREATE INDEX "dynamic_rates_roomTypeId_idx" ON "dynamic_rates"("roomTypeId");

-- CreateIndex
CREATE INDEX "dynamic_rates_inventoryDate_idx" ON "dynamic_rates"("inventoryDate");

-- CreateIndex
CREATE INDEX "dynamic_rates_appliedRuleId_idx" ON "dynamic_rates"("appliedRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_rates_roomTypeId_inventoryDate_key" ON "dynamic_rates"("roomTypeId", "inventoryDate");

-- CreateIndex
CREATE INDEX "revenue_metrics_organizationId_idx" ON "revenue_metrics"("organizationId");

-- CreateIndex
CREATE INDEX "revenue_metrics_hotelId_idx" ON "revenue_metrics"("hotelId");

-- CreateIndex
CREATE INDEX "revenue_metrics_metricDate_idx" ON "revenue_metrics"("metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_metrics_hotelId_metricDate_key" ON "revenue_metrics"("hotelId", "metricDate");

-- CreateIndex
CREATE INDEX "analytics_snapshots_organizationId_idx" ON "analytics_snapshots"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_snapshots_hotelId_idx" ON "analytics_snapshots"("hotelId");

-- CreateIndex
CREATE INDEX "analytics_snapshots_snapshotType_idx" ON "analytics_snapshots"("snapshotType");

-- CreateIndex
CREATE INDEX "analytics_snapshots_snapshotDate_idx" ON "analytics_snapshots"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_hotelId_snapshotType_snapshotDate_key" ON "analytics_snapshots"("hotelId", "snapshotType", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_externalEventId_key" ON "analytics_events"("externalEventId");

-- CreateIndex
CREATE INDEX "analytics_events_organizationId_idx" ON "analytics_events"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_events_hotelId_idx" ON "analytics_events"("hotelId");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_idx" ON "analytics_events"("eventType");

-- CreateIndex
CREATE INDEX "analytics_events_processedAt_idx" ON "analytics_events"("processedAt");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_reports_organizationId_idx" ON "analytics_reports"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_reports_hotelId_idx" ON "analytics_reports"("hotelId");

-- CreateIndex
CREATE INDEX "analytics_reports_reportType_idx" ON "analytics_reports"("reportType");

-- CreateIndex
CREATE INDEX "analytics_reports_reportStatus_idx" ON "analytics_reports"("reportStatus");

-- CreateIndex
CREATE INDEX "analytics_reports_expiresAt_idx" ON "analytics_reports"("expiresAt");

-- CreateIndex
CREATE INDEX "analytics_reports_createdAt_idx" ON "analytics_reports"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_aggregation_jobs_organizationId_idx" ON "analytics_aggregation_jobs"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_aggregation_jobs_jobStatus_idx" ON "analytics_aggregation_jobs"("jobStatus");

-- CreateIndex
CREATE INDEX "analytics_aggregation_jobs_targetDate_idx" ON "analytics_aggregation_jobs"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_aggregation_jobs_hotelId_jobType_targetDate_key" ON "analytics_aggregation_jobs"("hotelId", "jobType", "targetDate");

-- CreateIndex
CREATE INDEX "pricing_campaigns_organizationId_idx" ON "pricing_campaigns"("organizationId");

-- CreateIndex
CREATE INDEX "pricing_campaigns_hotelId_idx" ON "pricing_campaigns"("hotelId");

-- CreateIndex
CREATE INDEX "pricing_campaigns_startDate_endDate_idx" ON "pricing_campaigns"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "pricing_campaigns_isActive_idx" ON "pricing_campaigns"("isActive");

-- CreateIndex
CREATE INDEX "pricing_campaigns_priority_idx" ON "pricing_campaigns"("priority");

-- CreateIndex
CREATE INDEX "revenue_targets_organizationId_idx" ON "revenue_targets"("organizationId");

-- CreateIndex
CREATE INDEX "revenue_targets_hotelId_idx" ON "revenue_targets"("hotelId");

-- CreateIndex
CREATE INDEX "revenue_targets_targetPeriod_idx" ON "revenue_targets"("targetPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_targets_hotelId_targetPeriod_key" ON "revenue_targets"("hotelId", "targetPeriod");

-- CreateIndex
CREATE INDEX "rate_recommendations_organizationId_idx" ON "rate_recommendations"("organizationId");

-- CreateIndex
CREATE INDEX "rate_recommendations_hotelId_idx" ON "rate_recommendations"("hotelId");

-- CreateIndex
CREATE INDEX "rate_recommendations_targetDate_idx" ON "rate_recommendations"("targetDate");

-- CreateIndex
CREATE INDEX "rate_recommendations_expiresAt_idx" ON "rate_recommendations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_recommendations_hotelId_roomTypeId_targetDate_key" ON "rate_recommendations"("hotelId", "roomTypeId", "targetDate");

-- CreateIndex
CREATE INDEX "forecast_data_points_organizationId_idx" ON "forecast_data_points"("organizationId");

-- CreateIndex
CREATE INDEX "forecast_data_points_hotelId_idx" ON "forecast_data_points"("hotelId");

-- CreateIndex
CREATE INDEX "forecast_data_points_forecastDate_idx" ON "forecast_data_points"("forecastDate");

-- CreateIndex
CREATE INDEX "forecast_data_points_confidence_idx" ON "forecast_data_points"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_data_points_hotelId_forecastDate_key" ON "forecast_data_points"("hotelId", "forecastDate");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_organizationId_idx" ON "pricing_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_hotelId_idx" ON "pricing_audit_logs"("hotelId");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_roomTypeId_idx" ON "pricing_audit_logs"("roomTypeId");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_triggeredBy_idx" ON "pricing_audit_logs"("triggeredBy");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_actionType_idx" ON "pricing_audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "pricing_audit_logs_createdAt_idx" ON "pricing_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ota_rate_syncs_organizationId_idx" ON "ota_rate_syncs"("organizationId");

-- CreateIndex
CREATE INDEX "ota_rate_syncs_hotelId_idx" ON "ota_rate_syncs"("hotelId");

-- CreateIndex
CREATE INDEX "ota_rate_syncs_syncStatus_idx" ON "ota_rate_syncs"("syncStatus");

-- CreateIndex
CREATE INDEX "ota_rate_syncs_targetDate_idx" ON "ota_rate_syncs"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "ota_rate_syncs_hotelId_roomTypeId_otaProviderId_targetDate_key" ON "ota_rate_syncs"("hotelId", "roomTypeId", "otaProviderId", "targetDate");

-- CreateIndex
CREATE INDEX "analytics_audit_logs_organizationId_idx" ON "analytics_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "analytics_audit_logs_userId_idx" ON "analytics_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "analytics_audit_logs_resourceType_idx" ON "analytics_audit_logs"("resourceType");

-- CreateIndex
CREATE INDEX "analytics_audit_logs_createdAt_idx" ON "analytics_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "room_types_hotelId_idx" ON "room_types"("hotelId");

-- CreateIndex
CREATE INDEX "room_types_organizationId_idx" ON "room_types"("organizationId");

-- CreateIndex
CREATE INDEX "room_types_status_idx" ON "room_types"("status");

-- CreateIndex
CREATE INDEX "room_types_deletedAt_idx" ON "room_types"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_hotelId_slug_key" ON "room_types"("hotelId", "slug");

-- CreateIndex
CREATE INDEX "rooms_hotelId_idx" ON "rooms"("hotelId");

-- CreateIndex
CREATE INDEX "rooms_organizationId_idx" ON "rooms"("organizationId");

-- CreateIndex
CREATE INDEX "rooms_roomTypeId_idx" ON "rooms"("roomTypeId");

-- CreateIndex
CREATE INDEX "rooms_operationalStatus_idx" ON "rooms"("operationalStatus");

-- CreateIndex
CREATE INDEX "rooms_housekeepingStatus_idx" ON "rooms"("housekeepingStatus");

-- CreateIndex
CREATE INDEX "rooms_occupancyStatus_idx" ON "rooms"("occupancyStatus");

-- CreateIndex
CREATE INDEX "rooms_deletedAt_idx" ON "rooms"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hotelId_roomNumber_key" ON "rooms"("hotelId", "roomNumber");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_organizationId_idx" ON "user_sessions"("organizationId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionStatus_idx" ON "user_sessions"("sessionStatus");

-- CreateIndex
CREATE INDEX "user_sessions_refreshTokenHash_idx" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "user_sessions_lastActivityAt_idx" ON "user_sessions"("lastActivityAt");

-- CreateIndex
CREATE INDEX "security_events_organizationId_idx" ON "security_events"("organizationId");

-- CreateIndex
CREATE INDEX "security_events_hotelId_idx" ON "security_events"("hotelId");

-- CreateIndex
CREATE INDEX "security_events_userId_idx" ON "security_events"("userId");

-- CreateIndex
CREATE INDEX "security_events_eventType_idx" ON "security_events"("eventType");

-- CreateIndex
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");

-- CreateIndex
CREATE INDEX "security_events_detectedAt_idx" ON "security_events"("detectedAt");

-- CreateIndex
CREATE INDEX "compliance_requests_organizationId_idx" ON "compliance_requests"("organizationId");

-- CreateIndex
CREATE INDEX "compliance_requests_requestStatus_idx" ON "compliance_requests"("requestStatus");

-- CreateIndex
CREATE INDEX "compliance_requests_requestType_idx" ON "compliance_requests"("requestType");

-- CreateIndex
CREATE INDEX "compliance_requests_requestedBy_idx" ON "compliance_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "compliance_requests_subjectUserId_idx" ON "compliance_requests"("subjectUserId");

-- CreateIndex
CREATE INDEX "compliance_requests_createdAt_idx" ON "compliance_requests"("createdAt");

-- CreateIndex
CREATE INDEX "backup_snapshots_backupType_idx" ON "backup_snapshots"("backupType");

-- CreateIndex
CREATE INDEX "backup_snapshots_backupStatus_idx" ON "backup_snapshots"("backupStatus");

-- CreateIndex
CREATE INDEX "backup_snapshots_startedAt_idx" ON "backup_snapshots"("startedAt");

-- CreateIndex
CREATE INDEX "backup_snapshots_retentionUntil_idx" ON "backup_snapshots"("retentionUntil");

-- CreateIndex
CREATE INDEX "recovery_executions_recoveryType_idx" ON "recovery_executions"("recoveryType");

-- CreateIndex
CREATE INDEX "recovery_executions_recoveryStatus_idx" ON "recovery_executions"("recoveryStatus");

-- CreateIndex
CREATE INDEX "recovery_executions_backupSnapshotId_idx" ON "recovery_executions"("backupSnapshotId");

-- CreateIndex
CREATE INDEX "recovery_executions_startedAt_idx" ON "recovery_executions"("startedAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_hotelId_idx" ON "notifications"("hotelId");

-- CreateIndex
CREATE INDEX "notifications_deliveryStatus_idx" ON "notifications"("deliveryStatus");

-- CreateIndex
CREATE INDEX "notifications_notificationType_idx" ON "notifications"("notificationType");

-- CreateIndex
CREATE INDEX "notifications_scheduledAt_idx" ON "notifications"("scheduledAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_organizationId_idx" ON "notification_deliveries"("organizationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_deliveryResult_idx" ON "notification_deliveries"("deliveryResult");

-- CreateIndex
CREATE INDEX "notification_deliveries_attemptedAt_idx" ON "notification_deliveries"("attemptedAt");

-- CreateIndex
CREATE INDEX "notification_retry_logs_notificationId_idx" ON "notification_retry_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_retry_logs_organizationId_idx" ON "notification_retry_logs"("organizationId");

-- CreateIndex
CREATE INDEX "notification_retry_logs_createdAt_idx" ON "notification_retry_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notification_audit_logs_notificationId_idx" ON "notification_audit_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_audit_logs_organizationId_idx" ON "notification_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "notification_audit_logs_actionType_idx" ON "notification_audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "notification_audit_logs_createdAt_idx" ON "notification_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_templateName_key" ON "notification_templates"("templateName");

-- CreateIndex
CREATE INDEX "notification_templates_templateType_idx" ON "notification_templates"("templateType");

-- CreateIndex
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");

-- CreateIndex
CREATE INDEX "central_audit_logs_organizationId_idx" ON "central_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "central_audit_logs_hotelId_idx" ON "central_audit_logs"("hotelId");

-- CreateIndex
CREATE INDEX "central_audit_logs_entityType_entityId_idx" ON "central_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "central_audit_logs_actionType_idx" ON "central_audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "central_audit_logs_performedBy_idx" ON "central_audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "central_audit_logs_createdAt_idx" ON "central_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "background_jobs_idempotencyKey_key" ON "background_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "background_jobs_jobStatus_idx" ON "background_jobs"("jobStatus");

-- CreateIndex
CREATE INDEX "background_jobs_jobType_idx" ON "background_jobs"("jobType");

-- CreateIndex
CREATE INDEX "background_jobs_scheduledAt_idx" ON "background_jobs"("scheduledAt");

-- CreateIndex
CREATE INDEX "background_jobs_createdAt_idx" ON "background_jobs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_health_serviceName_key" ON "system_health"("serviceName");

-- CreateIndex
CREATE INDEX "system_health_serviceStatus_idx" ON "system_health"("serviceStatus");

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_retry_logs" ADD CONSTRAINT "workflow_retry_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_insights" ADD CONSTRAINT "operational_insights_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detections" ADD CONSTRAINT "anomaly_detections_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit" ADD CONSTRAINT "booking_audit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_blocks" ADD CONSTRAINT "inventory_blocks_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_tasks" ADD CONSTRAINT "operational_tasks_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_mappings" ADD CONSTRAINT "ota_mappings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_mappings" ADD CONSTRAINT "ota_mappings_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_mappings" ADD CONSTRAINT "ota_mappings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ota_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ota_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "sync_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_reservations" ADD CONSTRAINT "ota_reservations_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_reservations" ADD CONSTRAINT "ota_reservations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ota_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_reservations" ADD CONSTRAINT "ota_reservations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_audit" ADD CONSTRAINT "payment_audit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_rates" ADD CONSTRAINT "dynamic_rates_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_rates" ADD CONSTRAINT "dynamic_rates_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_rates" ADD CONSTRAINT "dynamic_rates_appliedRuleId_fkey" FOREIGN KEY ("appliedRuleId") REFERENCES "pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_metrics" ADD CONSTRAINT "revenue_metrics_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_campaigns" ADD CONSTRAINT "pricing_campaigns_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_targets" ADD CONSTRAINT "revenue_targets_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_data_points" ADD CONSTRAINT "forecast_data_points_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_executions" ADD CONSTRAINT "recovery_executions_backupSnapshotId_fkey" FOREIGN KEY ("backupSnapshotId") REFERENCES "backup_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_retry_logs" ADD CONSTRAINT "notification_retry_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
