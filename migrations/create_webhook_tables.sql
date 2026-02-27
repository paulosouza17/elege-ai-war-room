-- ================================================
-- WEBHOOK ENDPOINTS + DELIVERY LOG
-- ================================================

-- 1. Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    event_types TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    headers JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Webhook Deliveries (audit log)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    response_status INT,
    response_body TEXT,
    status TEXT CHECK (status IN ('success', 'failed', 'pending')),
    attempt_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON public.webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_events ON public.webhook_endpoints USING GIN (event_types);

-- RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_endpoints_all" ON public.webhook_endpoints;
CREATE POLICY "webhook_endpoints_all" ON public.webhook_endpoints FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "webhook_deliveries_read" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_read" ON public.webhook_deliveries FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "webhook_deliveries_insert" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_insert" ON public.webhook_deliveries FOR INSERT TO public WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_webhook_endpoints_updated_at ON public.webhook_endpoints;
CREATE TRIGGER update_webhook_endpoints_updated_at
    BEFORE UPDATE ON public.webhook_endpoints
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
