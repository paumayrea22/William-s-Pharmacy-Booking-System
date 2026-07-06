-- Layer 2: Stored Procedures (RPC), Triggers and Realtime Streams

-- 1. Idempotent Realtime publication block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'appointments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
    END IF;
END
$$;

-- 2. Role-Based Access Control via app_metadata (Security Patched)
CREATE OR REPLACE FUNCTION sync_role_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_username TEXT;
    v_role TEXT;
BEGIN
    v_username := NEW.raw_user_meta_data ->> 'username';

    IF v_username LIKE 'D-%' THEN
        v_role := 'doctor';
    ELSIF v_username LIKE 'P-%' THEN
        v_role := 'pharmacist';
    ELSE
        v_role := NULL;
    END IF;

    -- Inject both the role and the raw username securely into app_metadata
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
                             jsonb_build_object('role', v_role, 'username', v_username);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_to_app_metadata ON auth.users;

CREATE TRIGGER trg_sync_role_to_app_metadata
BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_role_to_app_metadata();

-- 3. Stored Procedure with reinforced security and algebraic overlap optimization
CREATE OR REPLACE FUNCTION book_appointment_secure(
    p_professional_id BIGINT,
    p_room_number SMALLINT,
    p_client_name VARCHAR(150),
    p_client_phone VARCHAR(30),
    p_start_time_utc TIMESTAMPTZ,
    p_end_time_utc TIMESTAMPTZ,
    p_staff_username VARCHAR(50)
) RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_day_of_week SMALLINT;
    v_start_time TIME;
    v_end_time TIME;
    v_is_available BOOLEAN := FALSE;
    v_doctor_booked INT;
    v_room_booked INT;
BEGIN
    PERFORM id FROM professionals WHERE id = p_professional_id FOR UPDATE;

    v_day_of_week := EXTRACT(DOW FROM p_start_time_utc AT TIME ZONE 'Europe/Malta');
    v_start_time := (p_start_time_utc AT TIME ZONE 'Europe/Malta')::TIME;
    v_end_time := (p_end_time_utc AT TIME ZONE 'Europe/Malta')::TIME;

    SELECT EXISTS (
        SELECT 1 FROM availabilities
        WHERE professional_id = p_professional_id
          AND day_of_week = v_day_of_week
          AND start_time <= v_start_time
          AND end_time >= v_end_time
    ) INTO v_is_available;

    IF NOT v_is_available THEN
        RAISE EXCEPTION 'Operational Error: The selected time falls outside the professional working hours.';
    END IF;

    SELECT COUNT(*) INTO v_doctor_booked
    FROM appointments
    WHERE professional_id = p_professional_id
      AND status = 'confirmed'
      AND start_time_utc < p_end_time_utc 
      AND end_time_utc > p_start_time_utc;

    IF v_doctor_booked > 0 THEN
        RAISE EXCEPTION 'Conflict Error: This professional already has a confirmed appointment at this time.';
    END IF;

    SELECT COUNT(*) INTO v_room_booked
    FROM appointments
    WHERE room_number = p_room_number
      AND status = 'confirmed'
      AND start_time_utc < p_end_time_utc 
      AND end_time_utc > p_start_time_utc;

    IF v_room_booked > 0 THEN
        RAISE EXCEPTION 'Hardware Error: Clinic Room % is already occupied by another patient at this time.', p_room_number;
    END IF;

    INSERT INTO appointments (
        professional_id, room_number, client_name, client_phone,
        start_time_utc, end_time_utc, status, created_by_username
    ) VALUES (
        p_professional_id, p_room_number, p_client_name, p_client_phone,
        p_start_time_utc, p_end_time_utc, 'confirmed', p_staff_username
    );
END;
$$;

-- 4. Execution Privileges Hardening
REVOKE EXECUTE ON FUNCTION public.sync_role_to_app_metadata() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_role_to_app_metadata() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_role_to_app_metadata() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.book_appointment_secure FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_appointment_secure FROM anon;
GRANT EXECUTE ON FUNCTION public.book_appointment_secure TO authenticated;