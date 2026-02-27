-- Verificar se RLS permite INSERT em activations

-- 1. Verificar políticas de INSERT
SELECT 
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'activations'
AND cmd IN ('ALL', 'INSERT');

-- 2. Testar INSERT como usuário autenticado
-- SUBSTITUA 'USER_ID_AQUI' pelo ID de um usuário real
DO $$
DECLARE
    test_user_id UUID := 'USER_ID_AQUI'::UUID;
    new_activation_id UUID;
BEGIN
    -- Simular contexto de autenticação
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    PERFORM set_config('role', 'authenticated', true);
    
    -- Tentar inserir
    INSERT INTO activations (
        name,
        category,
        priority,
        keywords,
        status,
        created_by
    ) VALUES (
        'Teste RLS INSERT',
        'Proteção de Reputação',
        'high',
        ARRAY['teste', 'rls', 'insert'],
        'active',
        test_user_id
    ) RETURNING id INTO new_activation_id;
    
    RAISE NOTICE 'Sucesso! Ativação criada com ID: %', new_activation_id;
    
    -- Limpar teste
    DELETE FROM activations WHERE id = new_activation_id;
    RAISE NOTICE 'Teste limpo';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO: %', SQLERRM;
END $$;

-- 3. Verificar se created_by é obrigatório
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activations'
AND column_name = 'created_by';
