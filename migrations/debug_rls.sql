-- DEBUG: Verificar status completo do RLS

-- 1. Verificar se RLS está REALMENTE habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'activations';

-- 2. Listar TODAS as políticas em activations
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'activations';

-- 3. Verificar se created_by existe e está preenchido
SELECT 
    id,
    name,
    created_by,
    created_at
FROM activations
ORDER BY created_at DESC
LIMIT 10;

-- 4. Contar ativações por usuário
SELECT 
    created_by,
    COUNT(*) as total_activations
FROM activations
GROUP BY created_by;

-- 5. Verificar se activation_users tem dados
SELECT COUNT(*) as total_shares FROM activation_users;

-- 6. Testar query COMO SE FOSSE um usuário específico
-- IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' por um ID real de usuário
DO $$
DECLARE
    test_user_id UUID := 'SEU_USER_ID_AQUI'::UUID; -- SUBSTITUA AQUI
BEGIN
    -- Simular contexto de autenticação
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    RAISE NOTICE 'Testando como usuário: %', test_user_id;
    RAISE NOTICE 'Ativações visíveis: %', (
        SELECT COUNT(*) FROM activations
    );
END $$;
