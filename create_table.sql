CREATE TABLE "CustomAutomation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerEventType" TEXT NOT NULL,
    "gallaboxTemplateName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variableMappings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomAutomation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomAutomation_triggerEventType_key" ON "CustomAutomation"("triggerEventType");
