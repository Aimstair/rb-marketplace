-- CreateTable
CREATE TABLE "hall_of_shame_entries" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "incidentSummary" TEXT NOT NULL,
    "transactionContext" TEXT,
    "incidentDate" TIMESTAMP(3),
    "amount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerNotes" TEXT,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hall_of_shame_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_shame_aliases" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_shame_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_shame_identifiers" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_shame_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_shame_social_links" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT,
    "handle" TEXT,
    "normalizedHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_shame_social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_shame_evidence" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_shame_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_shame_comments" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hall_of_shame_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hall_of_shame_entries_reporterId_idx" ON "hall_of_shame_entries"("reporterId");

-- CreateIndex
CREATE INDEX "hall_of_shame_entries_reviewerId_idx" ON "hall_of_shame_entries"("reviewerId");

-- CreateIndex
CREATE INDEX "hall_of_shame_entries_status_idx" ON "hall_of_shame_entries"("status");

-- CreateIndex
CREATE INDEX "hall_of_shame_entries_publishedAt_idx" ON "hall_of_shame_entries"("publishedAt");

-- CreateIndex
CREATE INDEX "hall_of_shame_entries_createdAt_idx" ON "hall_of_shame_entries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hall_of_shame_aliases_entryId_normalizedAlias_key" ON "hall_of_shame_aliases"("entryId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "hall_of_shame_aliases_normalizedAlias_idx" ON "hall_of_shame_aliases"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "hall_of_shame_identifiers_entryId_type_normalizedValue_key" ON "hall_of_shame_identifiers"("entryId", "type", "normalizedValue");

-- CreateIndex
CREATE INDEX "hall_of_shame_identifiers_type_idx" ON "hall_of_shame_identifiers"("type");

-- CreateIndex
CREATE INDEX "hall_of_shame_identifiers_normalizedValue_idx" ON "hall_of_shame_identifiers"("normalizedValue");

-- CreateIndex
CREATE INDEX "hall_of_shame_social_links_platform_idx" ON "hall_of_shame_social_links"("platform");

-- CreateIndex
CREATE INDEX "hall_of_shame_social_links_normalizedHandle_idx" ON "hall_of_shame_social_links"("normalizedHandle");

-- CreateIndex
CREATE INDEX "hall_of_shame_evidence_entryId_idx" ON "hall_of_shame_evidence"("entryId");

-- CreateIndex
CREATE INDEX "hall_of_shame_comments_entryId_idx" ON "hall_of_shame_comments"("entryId");

-- CreateIndex
CREATE INDEX "hall_of_shame_comments_authorId_idx" ON "hall_of_shame_comments"("authorId");

-- CreateIndex
CREATE INDEX "hall_of_shame_comments_createdAt_idx" ON "hall_of_shame_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "hall_of_shame_entries" ADD CONSTRAINT "hall_of_shame_entries_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_entries" ADD CONSTRAINT "hall_of_shame_entries_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_aliases" ADD CONSTRAINT "hall_of_shame_aliases_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "hall_of_shame_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_identifiers" ADD CONSTRAINT "hall_of_shame_identifiers_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "hall_of_shame_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_social_links" ADD CONSTRAINT "hall_of_shame_social_links_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "hall_of_shame_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_evidence" ADD CONSTRAINT "hall_of_shame_evidence_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "hall_of_shame_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_comments" ADD CONSTRAINT "hall_of_shame_comments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "hall_of_shame_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_shame_comments" ADD CONSTRAINT "hall_of_shame_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
