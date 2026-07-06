-- Layer 8: Dynamic Clinic Rooms
-- Rooms were previously hardcoded (appointments.room_number CHECK IN (1,2)) across the whole app.
-- This introduces a real rooms table so Staff Management can add/remove clinic rooms, and
-- AppointmentModal/Calendar read the room list dynamically instead of assuming exactly two exist.

CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_number SMALLINT NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preserve the two rooms already referenced by live appointment data
INSERT INTO rooms (room_number, label) VALUES
(1, 'Room 1'),
(2, 'Room 2')
ON CONFLICT (room_number) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

-- Replace the fixed CHECK(room_number IN (1,2)) with a real foreign key so any registered
-- room can be used, and deleting a room that still has appointments on record is rejected
-- instead of silently orphaning those rows (mirrors professionals' ON DELETE RESTRICT).
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_room_number_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_room_number_fkey'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_room_number_fkey
        FOREIGN KEY (room_number) REFERENCES rooms(room_number) ON DELETE RESTRICT;
    END IF;
END
$$;

-- RLS: any signed-in staff can read the room list; only pharmacists can add/remove rooms,
-- consistent with the professionals UPDATE policy in 07_professionals_update_policy.sql.
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON rooms;
DROP POLICY IF EXISTS "Enable insert for pharmacists only" ON rooms;
DROP POLICY IF EXISTS "Enable delete for pharmacists only" ON rooms;

CREATE POLICY "Enable read access for authenticated users"
ON rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for pharmacists only"
ON rooms FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'pharmacist');

CREATE POLICY "Enable delete for pharmacists only"
ON rooms FOR DELETE TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'pharmacist');
