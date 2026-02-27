-- Criar usuário de teste para o Browser Agent
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'browser_test@warroom.ai') THEN
        RETURN;
    END IF;

    -- Inserir em auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'browser_test@warroom.ai',
        crypt('Test@1234', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Browser Test User"}',
        'authenticated',
        'authenticated'
    );
    
    -- Inserir em profiles
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        new_user_id,
        'browser_test@warroom.ai',
        'Browser Test User',
        'admin' -- Dando admin para garantir permissões iniciais
    );
    
    RAISE NOTICE 'Usuário de teste criado: browser_test@warroom.ai / Test@1234';
END $$;
