ALTER TABLE "Message_v2" ALTER COLUMN "updatedAt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "relativeMessageId" varchar;--> statement-breakpoint
ALTER TABLE "Message_v2" DROP COLUMN "parentMessageId";