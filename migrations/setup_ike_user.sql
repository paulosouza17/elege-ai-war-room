-- Verificar e configurar usuário ike@gmail.com
DO $$
DECLARE
    target_email TEXT := 'ike@gmail.com';
    target_password TEXT := '123456';
    user_id UUID;
BEGIN
    -- 1. Verificar se usuário existe
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;

    IF user_id IS NULL THEN
        -- Criar se não existir
        user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data, 
            aud, role
        ) VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            target_email,
            crypt(target_password, gen_salt('bf')),
            NOW(), NOW(), NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Ike User"}',
            'authenticated',
            'authenticated'
        );
        
        RAISE NOTICE 'Usuário criado: % (ID: %)', target_email, user_id;
    ELSE
        -- Atualizar senha se já existir (para garantir o teste)
        UPDATE auth.users 
        SET encrypted_password = crypt(target_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = user_id;
        
        RAISE NOTICE 'Usuário existente atualizado: % (ID: %)', target_email, user_id;
    END IF;

    -- 2. Garantir perfil
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (user_id, target_email, 'Ike User', 'admin') -- Dando admin para teste irrestrito
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin'; -- Garantir permissão de escrita

END $$;
