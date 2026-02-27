-- Add monitoring_status to differentiate "Alvo Monitorado" from "Pessoa Cadastrada"
-- active = Alvo Monitorado (circuito de monitoramento direto)
-- standby = Pessoa Cadastrada (em espera até ser promovida a alvo)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='monitored_entities' AND column_name='monitoring_status') THEN
        ALTER TABLE public.monitored_entities ADD COLUMN monitoring_status TEXT DEFAULT 'standby';
    END IF;
END $$;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_monitored_entities_status ON public.monitored_entities(monitoring_status);
