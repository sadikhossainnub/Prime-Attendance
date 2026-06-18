-- Make lastSyncedAt nullable to track unsynced users
ALTER TABLE "device_users" ALTER COLUMN "last_synced_at" DROP NOT NULL;
