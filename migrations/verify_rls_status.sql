-- Verificar se RLS está ativo e políticas foram criadas

-- 1. Verificar se RLS está habilitado nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('activations', 'flows', 'demands', 'intelligence_feed', 'crisis_events', 'flow_schedules', 'activation_users')
ORDER BY tablename;

-- 2. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('activations', 'flows', 'demands', 'intelligence_feed', 'crisis_events', 'flow_schedules', 'activation_users')
ORDER BY tablename, policyname;

-- 3. Verificar se colunas user_id/created_by existem
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('activations', 'flows', 'demands', 'intelligence_feed', 'crisis_events', 'flow_schedules')
AND column_name IN ('user_id', 'created_by')
ORDER BY table_name, column_name;

-- 4. Verificar se activation_users existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'activation_users'
) as activation_users_exists;

-- 5. Testar query como usuário (simular)
-- Substitua 'USER_ID_AQUI' pelo ID de um usuário de teste
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'USER_ID_AQUI';

SELECT 
    id,
    name,
    created_by,
    created_at
FROM activations
LIMIT 5;

RESET ROLE;
