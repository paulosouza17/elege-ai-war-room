-- ==========================================
-- DIAGNÓSTICO PROFUNDO DE RLS
-- ==========================================

-- 1. Listar TODAS as policies ativas em activations
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'activations';

-- 2. Testar vazamento entre analistas
DO $$
DECLARE
    analyst1_id UUID;
    analyst2_id UUID;
    act1_id UUID;
    count_visible INTEGER;
BEGIN
    -- Criar dois analistas fake para teste
    INSERT INTO auth.users (id, email, role) VALUES (gen_random_uuid(), 'analyst1@test.com', 'authenticated') RETURNING id INTO analyst1_id;
    INSERT INTO auth.users (id, email, role) VALUES (gen_random_uuid(), 'analyst2@test.com', 'authenticated') RETURNING id INTO analyst2_id;
    
    INSERT INTO profiles (id, role, email) VALUES (analyst1_id, 'analyst', 'analyst1@test.com');
    INSERT INTO profiles (id, role, email) VALUES (analyst2_id, 'analyst', 'analyst2@test.com');

    -- Analyst 1 cria uma ativação
    INSERT INTO activations (name, category, created_by, status) 
    VALUES ('Ativação Secreta do 1', 'Teste', analyst1_id, 'active') 
    RETURNING id INTO act1_id;

    -- Analyst 2 tenta ver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', analyst2_id)::text, true);
    PERFORM set_config('role', 'authenticated', true);

    SELECT COUNT(*) INTO count_visible FROM activations WHERE id = act1_id;

    IF count_visible > 0 THEN
        RAISE NOTICE '🚨 VAZAMENTO DETECTADO! Analyst 2 consegue ver ativação do Analyst 1';
    ELSE
        RAISE NOTICE '✅ ISOLAMENTO OK: Analyst 2 não vê ativação do Analyst 1';
    END IF;

    -- Limpeza
    DELETE FROM activations WHERE id = act1_id;
    DELETE FROM profiles WHERE id IN (analyst1_id, analyst2_id);
    DELETE FROM auth.users WHERE id IN (analyst1_id, analyst2_id);
END $$;
