-- ==============================================================================
-- AgroPulse: Database Schema & Row-Level Security (RLS)
-- Location: Estancia Didáctica Concordia, Entre Ríos
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Memberships (User roles: producer, operator, advisor)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('producer', 'operator', 'advisor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- 3. Plots (Lotes)
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    polygon JSONB NOT NULL, -- Array of coordinates [{latitude, longitude}, ...]
    threshold_min NUMERIC NOT NULL DEFAULT 25.0,
    threshold_max NUMERIC NOT NULL DEFAULT 45.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Stations (Estaciones telemétricas)
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hardware_id TEXT NOT NULL UNIQUE,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Readings (Telemetría de suelo y ambiente)
CREATE TABLE IF NOT EXISTS public.readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    moisture_pct NUMERIC NOT NULL,
    temperature_c NUMERIC NOT NULL,
    battery_pct NUMERIC NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries on plot historical telemetry
CREATE INDEX IF NOT EXISTS idx_readings_plot_measured_at ON public.readings (plot_id, measured_at DESC);

-- 6. Valves (Válvulas de riego)
CREATE TABLE IF NOT EXISTS public.valves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'closed',
    last_command_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Irrigation Commands (Comandos de apertura/cierre con idempotencia)
CREATE TABLE IF NOT EXISTS public.irrigation_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    valve_id UUID NOT NULL REFERENCES public.valves(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('open', 'close')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'failed')) DEFAULT 'pending',
    client_request_id UUID NOT NULL UNIQUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ
);

-- RF-16: Bloqueo SQL para evitar un segundo comando 'pending' sobre la misma válvula
CREATE UNIQUE INDEX IF NOT EXISTS idx_valves_pending_command 
ON public.irrigation_commands (valve_id) 
WHERE status = 'pending';

-- ==============================================================================
-- Security Helpers & Functions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(target_org_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT role FROM public.memberships 
    WHERE user_id = auth.uid() AND organization_id = target_org_id 
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE user_id = auth.uid() AND organization_id = target_org_id
    );
$$;

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_commands ENABLE ROW LEVEL SECURITY;

-- 1. Organizations Policies
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

-- 2. Memberships Policies
CREATE POLICY "Users can view members of their organizations"
    ON public.memberships FOR SELECT
    USING (public.is_org_member(organization_id) OR user_id = auth.uid());

-- 3. Plots Policies
CREATE POLICY "Members can view plots"
    ON public.plots FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Producer and operator can update plot thresholds"
    ON public.plots FOR UPDATE
    USING (public.get_user_role(organization_id) IN ('producer', 'operator'))
    WITH CHECK (public.get_user_role(organization_id) IN ('producer', 'operator'));

-- 4. Stations Policies
CREATE POLICY "Members can view stations"
    ON public.stations FOR SELECT
    USING (public.is_org_member(organization_id));

-- 5. Readings Policies
CREATE POLICY "Members can view readings"
    ON public.readings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.plots p
            JOIN public.memberships m ON m.organization_id = p.organization_id
            WHERE p.id = readings.plot_id AND m.user_id = auth.uid()
        )
    );

CREATE POLICY "Only service_role can insert readings"
    ON public.readings FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- 6. Valves Policies
CREATE POLICY "Members can view valves"
    ON public.valves FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Only service_role can update valves"
    ON public.valves FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 7. Irrigation Commands Policies
CREATE POLICY "Members can view irrigation commands"
    ON public.irrigation_commands FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Producer and operator can insert irrigation commands"
    ON public.irrigation_commands FOR INSERT
    WITH CHECK (
        public.get_user_role(organization_id) IN ('producer', 'operator')
        AND (requested_by = auth.uid() OR requested_by IS NULL)
    );

CREATE POLICY "Only service_role can update irrigation commands"
    ON public.irrigation_commands FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ==============================================================================
-- Realtime Setup
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'readings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.readings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'valves'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.valves;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'irrigation_commands'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigation_commands;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'plots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.plots;
    END IF;
END $$;
