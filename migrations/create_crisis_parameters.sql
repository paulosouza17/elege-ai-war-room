-- Create table for crisis parameters
create table if not exists crisis_parameters (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    parameter_key text not null unique,
    value jsonb not null,
    description text,
    updated_at timestamp with time zone default now()
);

-- Insert default values from the "7 Pillars of Crisis Identification"
insert into crisis_parameters (category, parameter_key, value, description)
values
    ('volume', 'spike_threshold_percent', '200', 'Aumento percentual de volume em curto período para considerar Spike'),
    ('volume', 'spike_timeframe_hours', '1', 'Janela de tempo em horas para cálculo de Spike'),
    ('sentiment', 'critical_sentiment_score', '80', 'Pontuação de risco para considerar sentimento crítico'),
    ('response', 'max_response_time_hours', '2', 'Tempo máximo aceitável para primeira resposta'),
    ('influence', 'verified_weight_multiplier', '2.5', 'Multiplicador de peso para perfis verificados/influenciadores')
on conflict (parameter_key) do nothing;

-- Enable RLS
alter table crisis_parameters enable row level security;

-- Policy: Authenticated users can read
create policy "Authenticated users can read parameters"
    on crisis_parameters for select
    to authenticated
    using (true);

-- Policy: Admins/Analysts can update
create policy "Staff can update parameters"
    on crisis_parameters for update
    to authenticated
    using ( true ) -- For now, allow all authenticated. Ideally restriction by role.
    with check ( true );
