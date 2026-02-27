-- ============================================
-- DIAGNÓSTICO AUTOMÁTICO DE RLS
-- Este script NÃO precisa de edição manual
-- ============================================

-- 1. Verificar se RLS está habilitado
SELECT 
    '1. RLS Status' as check_name,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESABILITADO - EXECUTE A MIGRAÇÃO!'
    END as status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('activations', 'flows', 'demands', 'intelligence_feed');

-- 2. Verificar políticas em activations
SELECT 
    '2. Políticas RLS' as check_name,
    policyname,
    cmd as command,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '✅ Admin policy'
        WHEN policyname LIKE '%user%' THEN '✅ User policy'
        ELSE '⚠️ Unknown policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'activations';

-- 3. Verificar se created_by existe e está preenchido
SELECT 
    '3. Coluna created_by' as check_name,
    COUNT(*) as total_activations,
    COUNT(created_by) as with_created_by,
    COUNT(*) - COUNT(created_by) as missing_created_by,
    CASE 
        WHEN COUNT(*) = COUNT(created_by) THEN '✅ Todas preenchidas'
        ELSE '❌ Algumas NULL - RODE UPDATE!'
    END as status
FROM activations;

-- 4. Verificar distribuição de ativações por usuário
SELECT 
    '4. Ativações por Usuário' as check_name,
    a.created_by,
    u.email,
    p.role,
    COUNT(*) as total_activations
FROM activations a
LEFT JOIN auth.users u ON a.created_by = u.id
LEFT JOIN profiles p ON a.created_by = p.id
GROUP BY a.created_by, u.email, p.role
ORDER BY COUNT(*) DESC;

-- 5. Verificar se activation_users existe
SELECT 
    '5. Tabela de Compartilhamento' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'activation_users'
        ) THEN '✅ activation_users existe'
        ELSE '❌ activation_users NÃO existe - RODE MIGRAÇÃO!'
    END as status;

-- 6. Contar compartilhamentos
SELECT 
    '6. Compartilhamentos Ativos' as check_name,
    COUNT(*) as total_shares,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Existem compartilhamentos'
        ELSE 'ℹ️ Nenhum compartilhamento ainda'
    END as status
FROM activation_users;

-- 7. TESTE REAL: Simular query como primeiro usuário não-admin
DO $$
DECLARE
    test_user_id UUID;
    test_user_email TEXT;
    total_visible INT;
    total_owned INT;
BEGIN
    -- Pegar primeiro usuário não-admin
    SELECT u.id, u.email INTO test_user_id, test_user_email
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.role != 'admin' OR p.role IS NULL
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Nenhum usuário não-admin encontrado para teste';
        RETURN;
    END IF;
    
    -- Contar ativações que esse usuário criou
    SELECT COUNT(*) INTO total_owned
    FROM activations
    WHERE created_by = test_user_id;
    
    -- Simular query com RLS (como se fosse o frontend)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    PERFORM set_config('role', 'authenticated', true);
    
    -- Contar ativações visíveis
    SELECT COUNT(*) INTO total_visible
    FROM activations;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '7. TESTE DE ISOLAMENTO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuário testado: % (%)', test_user_email, test_user_id;
    RAISE NOTICE 'Ativações criadas por ele: %', total_owned;
    RAISE NOTICE 'Ativações visíveis com RLS: %', total_visible;
    RAISE NOTICE '';
    
    IF total_visible = total_owned THEN
        RAISE NOTICE '✅ RLS FUNCIONANDO! Usuário vê apenas suas ativações';
    ELSIF total_visible > total_owned THEN
        RAISE NOTICE '❌ RLS NÃO ESTÁ FUNCIONANDO! Usuário vê % ativações a mais', (total_visible - total_owned);
        RAISE NOTICE '   SOLUÇÃO: Execute COMPLETE_RLS_MIGRATION.sql';
    ELSE
        RAISE NOTICE '⚠️ Situação inesperada. Verifique manualmente.';
    END IF;
    RAISE NOTICE '========================================';
    
END $$;

-- 8. Resumo final
SELECT 
    '8. RESUMO GERAL' as check_name,
    CASE 
        WHEN (
            SELECT rowsecurity FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'activations'
        ) THEN '✅ Sistema pronto para isolamento'
        ELSE '❌ RLS não está ativo - RODE A MIGRAÇÃO!'
    END as status;
