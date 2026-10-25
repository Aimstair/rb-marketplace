-- Multiple images per item listing. "image" stays as the cover (images[0]) so cards, OG tags
-- and older code keep working; existing listings get their single image copied in.
ALTER TABLE "item_listings" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "item_listings" SET "images" = ARRAY["image"] WHERE cardinality("images") = 0 AND "image" <> '';
