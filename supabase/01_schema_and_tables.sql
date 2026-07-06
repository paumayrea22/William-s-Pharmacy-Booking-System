-- Layer 1: Data Definition Language (DDL) and Table Structures

-- 1. Destructive Operations (Cleanup obsolete tables)
DROP TABLE IF EXISTS public.holiday_overrides CASCADE;

-- 2. System Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
CREATE EXTENSION IF NOT EXISTS citext SCHEMA public;

-- 3. Core Tables
CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_number SMALLINT NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professionals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name extensions.citext NOT NULL UNIQUE,
    specialty VARCHAR(100) NOT NULL,
    default_duration_minutes SMALLINT NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availabilities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    professional_id BIGINT REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), 
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    professional_id BIGINT REFERENCES professionals(id) ON DELETE RESTRICT,
    room_number SMALLINT REFERENCES rooms(room_number) ON DELETE RESTRICT,
    client_name extensions.citext NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' 
        CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    internal_notes TEXT,
    created_by_username VARCHAR(50) NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (start_time_utc < end_time_utc)
);

CREATE TABLE IF NOT EXISTS doctor_leaves (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    professional_id INT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_username VARCHAR(50) NOT NULL,
    UNIQUE(professional_id, leave_date)
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_availabilities_prof_day ON availabilities(professional_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time_utc);
CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_number);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_professionals_name_trgm ON professionals USING GIN (full_name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_appointments_client_name_trgm ON appointments USING GIN (client_name extensions.gin_trgm_ops);

-- 5. Idempotent Seed Data & Mutators
INSERT INTO rooms (room_number, label) VALUES
(1, 'Room 1'),
(2, 'Room 2')
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO professionals (full_name, specialty, default_duration_minutes) VALUES 
('Dr. Fsadni', 'General Medicine', 15),
('Dr. Christopher Sciberras', 'Pediatrics', 30),
('Dra. Martha Spiteri', 'General Medicine', 15),
('Keith Pirotta', 'Educational Psychologist', 60),
('Anthea Borg', 'Podiatrist', 15),
('Dr. Sciberras', 'General Medicine', 15)
ON CONFLICT (full_name) DO NOTHING;

-- Enforce the 30-minute block invariant for existing DB instances
UPDATE professionals SET default_duration_minutes = 30 WHERE full_name = 'Dr. Christopher Sciberras';