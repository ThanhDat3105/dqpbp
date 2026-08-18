-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "department_id" INTEGER,
    "address" VARCHAR(500),
    "neighborhood" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" VARCHAR(20),
    "cccd" VARCHAR(20),
    "unit_code" VARCHAR(50),
    "managed_units" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "military_rank" VARCHAR(50),
    "position" VARCHAR(100),
    "date_of_birth" DATE,
    "enlistment_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "work_type" VARCHAR(100),
    "department" VARCHAR(255),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(255),
    "document_number" VARCHAR(100),
    "attached_files" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_by" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_tasks" (
    "id" SERIAL NOT NULL,
    "activity_id" INTEGER,
    "title" VARCHAR(255),
    "team" TEXT[],
    "due_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "report_fields" JSONB,
    "notes" TEXT,
    "completed" BOOLEAN,
    "completed_at" TIMESTAMP(3),
    "status" VARCHAR(50),
    "accepted_at" TIMESTAMP(3),
    "requires_dqcd" BOOLEAN NOT NULL DEFAULT false,
    "dqcd_unit" TEXT,
    "require_media_report" BOOLEAN NOT NULL DEFAULT false,
    "media_files" JSONB NOT NULL DEFAULT '[]',
    "reminded_6h" BOOLEAN NOT NULL DEFAULT false,
    "reminded_1h" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "work_type" VARCHAR(100),
    "department" VARCHAR(255),
    "location" VARCHAR(255),
    "document_number" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_template_tasks" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "team" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignees" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "notes" TEXT,
    "report_fields" JSONB NOT NULL DEFAULT '[]',
    "requires_dqcd" BOOLEAN NOT NULL DEFAULT false,
    "require_media_report" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_task_digests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "digest_date" DATE NOT NULL,
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_task_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youth_personnel" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "neighborhood" TEXT,
    "permanent_address" VARCHAR(255),
    "temporary_address" VARCHAR(255),
    "permanent_address_lat" DOUBLE PRECISION,
    "permanent_address_lng" DOUBLE PRECISION,
    "temporary_address_lat" DOUBLE PRECISION,
    "temporary_address_lng" DOUBLE PRECISION,
    "phone" VARCHAR(15),
    "education_level" VARCHAR(50),
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youth_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nguon" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "permanent_address" VARCHAR(255),
    "temporary_address" VARCHAR(255),
    "phone" VARCHAR(15),
    "education_level" VARCHAR(50),
    "youth_personnel_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nguon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quan_nhan_du_bi" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "neighborhood" TEXT,
    "permanent_address" VARCHAR(255),
    "temporary_address" VARCHAR(255),
    "permanent_address_lat" DOUBLE PRECISION,
    "permanent_address_lng" DOUBLE PRECISION,
    "temporary_address_lat" DOUBLE PRECISION,
    "temporary_address_lng" DOUBLE PRECISION,
    "phone" VARCHAR(15),
    "education_level" VARCHAR(50),
    "military_rank" VARCHAR(50),
    "unit" VARCHAR(100),
    "service_start_date" DATE,
    "service_end_date" DATE,
    "reserve_class" VARCHAR(5),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quan_nhan_du_bi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_articles" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500),
    "content" TEXT,
    "excerpt" TEXT,
    "author" VARCHAR(200),
    "category" VARCHAR(100) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_documents" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "doc_number" VARCHAR(100),
    "issued_by" VARCHAR(200),
    "issued_date" DATE,
    "category" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(500),
    "file_size" VARCHAR(50),
    "file_type" VARCHAR(10) NOT NULL DEFAULT 'PDF',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_slides" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_contacts" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(200),
    "subject" VARCHAR(100),
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_quick_links" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "url" VARCHAR(500),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_quick_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "workplace" VARCHAR(300) NOT NULL,
    "guardian_phone" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "client_ip" VARCHAR(45),
    "training_system" VARCHAR(100),
    "temporary_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_templates" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "file_type" VARCHAR(10) NOT NULL DEFAULT 'PDF',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "size" VARCHAR(50),
    "file_url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "office_columns" JSONB NOT NULL DEFAULT '[]',
    "commander" TEXT,
    "duty_officer" TEXT,
    "document_officer" TEXT,
    "internal_affairs" TEXT,
    "meal_duty" TEXT,
    "dqtt_leader" TEXT,
    "dqcd_patrol" JSONB,
    "office_duties" JSONB,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schedule_templates" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "week_start" DATE,
    "day_of_week" INTEGER NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dqcd_mobilize_summary" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "mobilize_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dqcd_mobilize_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_hash_key" ON "tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_tokens_user_type" ON "tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_tasks_due_date" ON "activity_tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_team" ON "activity_tasks"("team");

-- CreateIndex
CREATE INDEX "idx_tasks_activity_id" ON "activity_tasks"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_task_user_unique" ON "task_assignees"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_activity_templates_status_created_at" ON "activity_templates"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_templates_work_department" ON "activity_templates"("work_type", "department");

-- CreateIndex
CREATE INDEX "idx_activity_template_tasks_template_order" ON "activity_template_tasks"("template_id", "display_order", "id");

-- CreateIndex
CREATE INDEX "idx_daily_digest_user_date" ON "daily_task_digests"("user_id", "digest_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_digest_date" ON "daily_task_digests"("user_id", "digest_date");

-- CreateIndex
CREATE INDEX "idx_youth_personnel_full_name" ON "youth_personnel"("full_name");

-- CreateIndex
CREATE INDEX "idx_youth_personnel_is_registered" ON "youth_personnel"("is_registered");

-- CreateIndex
CREATE INDEX "idx_nguon_full_name" ON "nguon"("full_name");

-- CreateIndex
CREATE INDEX "idx_nguon_youth_personnel_id" ON "nguon"("youth_personnel_id");

-- CreateIndex
CREATE INDEX "idx_qndb_full_name" ON "quan_nhan_du_bi"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "website_articles_slug_key" ON "website_articles"("slug");

-- CreateIndex
CREATE INDEX "idx_website_articles_category_visible_order" ON "website_articles"("category", "is_visible", "display_order");

-- CreateIndex
CREATE INDEX "idx_website_documents_category_status_visible" ON "website_documents"("category", "status", "is_visible");

-- CreateIndex
CREATE INDEX "idx_website_slides_visible_order" ON "website_slides"("is_visible", "display_order");

-- CreateIndex
CREATE INDEX "idx_website_quick_links_visible_order" ON "website_quick_links"("is_visible", "display_order");

-- CreateIndex
CREATE INDEX "idx_registrations_phone_created" ON "registrations"("phone", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_registrations_ip_created" ON "registrations"("client_ip", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_registration_templates_category" ON "registration_templates"("category", "is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_date_key" ON "schedule_days"("date");

-- CreateIndex
CREATE UNIQUE INDEX "user_schedule_templates_user_id_week_start_day_of_week_shif_key" ON "user_schedule_templates"("user_id", "week_start", "day_of_week", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "dqcd_mobilize_summary_user_id_week_start_key" ON "dqcd_mobilize_summary"("user_id", "week_start");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_tasks" ADD CONSTRAINT "activity_tasks_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "activity_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_templates" ADD CONSTRAINT "activity_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_template_tasks" ADD CONSTRAINT "activity_template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_task_digests" ADD CONSTRAINT "daily_task_digests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_articles" ADD CONSTRAINT "website_articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_documents" ADD CONSTRAINT "website_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_slides" ADD CONSTRAINT "website_slides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_quick_links" ADD CONSTRAINT "website_quick_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schedule_templates" ADD CONSTRAINT "user_schedule_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dqcd_mobilize_summary" ADD CONSTRAINT "dqcd_mobilize_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
