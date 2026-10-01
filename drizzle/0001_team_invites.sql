CREATE TABLE `team_invites` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `token_hash` text NOT NULL,
  `invited_by` text NOT NULL,
  `expires_at` text NOT NULL,
  `accepted_at` text,
  `revoked_at` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invites_token_hash_unique` ON `team_invites` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `team_invites_email` ON `team_invites` (`email`);
--> statement-breakpoint
CREATE INDEX `team_invites_active` ON `team_invites` (`expires_at`,`accepted_at`,`revoked_at`);
