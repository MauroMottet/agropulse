-- ==============================================================================
-- AgroPulse: Seed Data
-- Location: Estancia Didáctica Concordia, Entre Ríos
-- Demo Users:
--   - productor@agropulse.test / AgroPulse2026! (role: producer)
--   - operador@agropulse.test  / AgroPulse2026! (role: operator)
--   - asesor@agropulse.test    / AgroPulse2026! (role: advisor)
-- ==============================================================================

-- 1. Create Organization
INSERT INTO public.organizations (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Estancia Didáctica Concordia')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create Demo Users in auth.users (if running inside Supabase PostgreSQL)
DO $$
DECLARE
    producer_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    operator_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    advisor_id  UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    encrypted_pw TEXT;
BEGIN
    encrypted_pw := crypt('AgroPulse2026!', gen_salt('bf'));

    -- Producer
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'productor@agropulse.test') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            producer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'productor@agropulse.test', encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Productor"}', now(), now()
        );
    ELSE
        SELECT id INTO producer_id FROM auth.users WHERE email = 'productor@agropulse.test';
    END IF;

    -- Operator
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operador@agropulse.test') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            operator_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'operador@agropulse.test', encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}', '{"full_name":"Lucía Operadora"}', now(), now()
        );
    ELSE
        SELECT id INTO operator_id FROM auth.users WHERE email = 'operador@agropulse.test';
    END IF;

    -- Advisor
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'asesor@agropulse.test') THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            advisor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'asesor@agropulse.test', encrypted_pw, now(),
            '{"provider":"email","providers":["email"]}', '{"full_name":"Martín Asesor Agronómico"}', now(), now()
        );
    ELSE
        SELECT id INTO advisor_id FROM auth.users WHERE email = 'asesor@agropulse.test';
    END IF;

    -- Memberships
    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES
        ('11111111-1111-1111-1111-111111111111', producer_id, 'producer'),
        ('11111111-1111-1111-1111-111111111111', operator_id, 'operator'),
        ('11111111-1111-1111-1111-111111111111', advisor_id, 'advisor')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;
END $$;

-- 3. Plots (3 Lotes en Concordia)
-- Costa 1: Citrus (Óptimo, ~34% de humedad)
INSERT INTO public.plots (id, organization_id, name, crop_type, polygon, threshold_min, threshold_max)
VALUES (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Costa 1',
    'Citrus (Naranjas Valencia)',
    '[
        {"latitude": -31.3750, "longitude": -58.0120},
        {"latitude": -31.3750, "longitude": -58.0050},
        {"latitude": -31.3820, "longitude": -58.0050},
        {"latitude": -31.3820, "longitude": -58.0120}
    ]'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, crop_type = EXCLUDED.crop_type, polygon = EXCLUDED.polygon;

-- Costa 2: Citrus (Seco, < 25%, actual ~18% para requerir riego)
INSERT INTO public.plots (id, organization_id, name, crop_type, polygon, threshold_min, threshold_max)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Costa 2',
    'Citrus (Mandarinas Murcott)',
    '[
        {"latitude": -31.3850, "longitude": -58.0120},
        {"latitude": -31.3850, "longitude": -58.0040},
        {"latitude": -31.3930, "longitude": -58.0040},
        {"latitude": -31.3930, "longitude": -58.0120}
    ]'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, crop_type = EXCLUDED.crop_type, polygon = EXCLUDED.polygon;

-- Monte A: Soja (Stale, última lectura > 15 min para semáforo Gris)
INSERT INTO public.plots (id, organization_id, name, crop_type, polygon, threshold_min, threshold_max)
VALUES (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'Monte A',
    'Soja 1ra',
    '[
        {"latitude": -31.3700, "longitude": -58.0250},
        {"latitude": -31.3700, "longitude": -58.0150},
        {"latitude": -31.3790, "longitude": -58.0150},
        {"latitude": -31.3790, "longitude": -58.0250}
    ]'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, crop_type = EXCLUDED.crop_type, polygon = EXCLUDED.polygon;

-- 4. Stations (1 estación por lote)
INSERT INTO public.stations (id, organization_id, plot_id, name, hardware_id, lat, lng)
VALUES
    ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Estación C1-Alpha', 'ST-CONC-01', -31.3785, -58.0085),
    ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Estación C2-Beta',  'ST-CONC-02', -31.3890, -58.0080),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'Estación MA-Gamma', 'ST-CONC-03', -31.3745, -58.0200)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng;

-- 5. Valves (1 válvula por lote)
INSERT INTO public.valves (id, organization_id, plot_id, name, status, last_command_at)
VALUES
    ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Válvula Principal Costa 1', 'closed', now() - interval '2 hours'),
    ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Válvula Principal Costa 2', 'closed', now() - interval '5 hours'),
    ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'Válvula Pivot Monte A',     'closed', now() - interval '1 day')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 6. Readings (Historial de 6 horas con >= 12 puntos por lote)
-- Costa 1: Óptimo (~34%-36%)
INSERT INTO public.readings (station_id, plot_id, moisture_pct, temperature_c, battery_pct, measured_at)
SELECT 
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222221',
    34.0 + (sin(step::numeric) * 2.5),
    22.5 + (cos(step::numeric) * 1.5),
    95.0 - (step * 0.1),
    now() - (interval '25 minutes' * (13 - step))
FROM generate_series(1, 13) AS step;

-- Costa 2: Seco (< 25%, arrancando en 22% y bajando a 18%)
INSERT INTO public.readings (station_id, plot_id, moisture_pct, temperature_c, battery_pct, measured_at)
SELECT 
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    23.0 - (step * 0.4),
    26.0 + (step * 0.2),
    92.0 - (step * 0.1),
    now() - (interval '25 minutes' * (13 - step))
FROM generate_series(1, 13) AS step;

-- Monte A: Stale (última lectura emitida hace 45 minutos > 15 min)
INSERT INTO public.readings (station_id, plot_id, moisture_pct, temperature_c, battery_pct, measured_at)
SELECT 
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222223',
    28.0 + (sin(step::numeric) * 1.2),
    24.0 + (cos(step::numeric) * 1.0),
    88.0 - (step * 0.2),
    now() - interval '45 minutes' - (interval '25 minutes' * (13 - step))
FROM generate_series(1, 13) AS step;
