ALTER TABLE "Message_v2" ADD COLUMN "updatedAt" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "parentMessageId" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "scid" varchar(128);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "spid" varchar(128);