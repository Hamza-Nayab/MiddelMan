-- Add primary key to profiles table.
-- The table previously only had a UNIQUE constraint on user_id with no PK.
-- First drop the existing unique constraint, then add PK.
-- The existing unique constraint name from the initial migration: profiles_user_id_unique

DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
    AND constraint_name = 'profiles_user_id_unique'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_unique";
  END IF;

  -- Add primary key if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE "profiles" ADD PRIMARY KEY ("user_id");
  END IF;
END $$;
