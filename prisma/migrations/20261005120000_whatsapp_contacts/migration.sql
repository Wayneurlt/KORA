-- WhatsApp accounts that hide their number (usernames) are identified by the
-- SendPulse contact id; chats from unrecognised senders have no parent until linked.

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN "whatsappContactId" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "parentId" DROP NOT NULL,
ADD COLUMN "contactId" TEXT,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Parent_whatsappContactId_key" ON "Parent"("whatsappContactId");

-- CreateIndex
CREATE INDEX "Conversation_contactId_idx" ON "Conversation"("contactId");
