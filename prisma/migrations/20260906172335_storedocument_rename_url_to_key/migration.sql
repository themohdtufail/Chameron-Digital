-- Renames StoreDocument.url to StoreDocument.key. This is a plain column
-- rename, not a drop-and-recreate: existing rows and their values are
-- preserved exactly, only the column name changes, because the "url" name
-- was misleading a private-storage reference is not always a directly
-- usable URL (see the S3 storage driver, which stores an object key here
-- for the private "documents" folder and requires a signed URL to access
-- it) as if it were one.
ALTER TABLE "StoreDocument" RENAME COLUMN "url" TO "key";
