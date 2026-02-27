-- ==========================================
-- TESTE FINAL DE ISOLAMENTO RLS
-- ==========================================

DO $$
DECLARE
    analyst1_id UUID;
    analyst2_id UUID;
    act1_id UUID;
    count_visible INTEGER;
BEGIN
    -- 1. Criar usuários temporários
    -- Tenta pegar ID se já existir (para re-run) ou cria novo
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teste_iso_1@test.com') THEN
        INSERT INTO auth.users (id, email, role) VALUES (gen_random_uuid(), 'teste_iso_1@test.com', 'authenticated') RETURNING id INTO analyst1_id;
    ELSE
        SELECT id INTO analyst1_id FROM auth.users WHERE email = 'teste_iso_1@test.com';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teste_iso_2@test.com') THEN
        INSERT INTO auth.users (id, email, role) VALUES (gen_random_uuid(), 'teste_iso_2@test.com', 'authenticated') RETURNING id INTO analyst2_id;
    ELSE
        SELECT id INTO analyst2_id FROM auth.users WHERE email = 'teste_iso_2@test.com';
    END IF;
    
    -- Atualizar profiles (garantir role analyst)
    INSERT INTO profiles (id, role, email) VALUES (analyst1_id, 'analyst', 'teste_iso_1@test.com')
    ON CONFLICT (id) DO UPDATE SET role = 'analyst';
    
    INSERT INTO profiles (id, role, email) VALUES (analyst2_id, 'analyst', 'teste_iso_2@test.com')
    ON CONFLICT (id) DO UPDATE SET role = 'analyst';

    -- 2. Analyst 1 cria uma ativação
    INSERT INTO activations (name, category, created_by, status) 
    VALUES ('Ativação Confidencial A1', 'Teste', analyst1_id, 'active') 
    RETURNING id INTO act1_id;

    -- 3. Analyst 2 tenta ver
    PERFORM set_config('request.jwt.claims', json_build_object('sub', analyst2_id)::text, true);
    PERFORM set_config('role', 'authenticated', true);

    SELECT COUNT(*) INTO count_visible FROM activations WHERE id = act1_id;

    -- 4. Resultado
    IF count_visible > 0 THEN
        RAISE EXCEPTION '❌ FALHA: Analyst 2 AINDA VÊ a ativação do Analyst 1';
    ELSE
        RAISE NOTICE '✅ SUCESSO: Analyst 2 NÃO VÊ a ativação do Analyst 1';
    END IF;

    -- 5. Limpeza
    DELETE FROM activations WHERE id = act1_id;
    DELETE FROM profiles WHERE id IN (analyst1_id, analyst2_id);
    DELETE FROM auth.users WHERE id IN (analyst1_id, analyst2_id);
END $$;
