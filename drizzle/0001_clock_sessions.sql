CREATE TABLE "clock_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"clock_in_at" timestamp with time zone NOT NULL,
	"clock_out_at" timestamp with time zone,
	"in_distance_m" integer,
	"in_accuracy_m" integer,
	"out_distance_m" integer,
	"out_accuracy_m" integer,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"edited_by" text,
	"staff_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clock_session" ADD CONSTRAINT "clock_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clock_user_day_idx" ON "clock_session" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "clock_day_idx" ON "clock_session" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "clock_one_open_per_day" ON "clock_session" USING btree ("user_id","day") WHERE "clock_session"."clock_out_at" is null;