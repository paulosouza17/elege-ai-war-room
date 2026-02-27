-- ============================================
-- DESABILITAR CONFIRMAÇÃO DE EMAIL
-- Execute no Supabase SQL Editor
-- ============================================

-- IMPORTANTE: Isso permite que usuários façam login SEM confirmar email
-- Use apenas em ambientes de desenvolvimento ou se você controla quem cria contas

-- Opção 1: Confirmar todos os usuários existentes
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Opção 2: Confirmar usuário específico
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'usuario@example.com';

-- ============================================
-- CONFIGURAÇÃO NO SUPABASE DASHBOARD
-- ============================================

-- Alternativamente, você pode desabilitar a confirmação de email via Dashboard:
-- 1. Supabase Dashboard → Authentication → Settings
-- 2. Procure por "Enable email confirmations"
-- 3. DESABILITE a opção
-- 4. Salve

-- Com isso, novos usuários NÃO precisarão confirmar email para fazer login

-- ============================================
-- VERIFICAR STATUS
-- ============================================

-- Ver usuários não confirmados
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '❌ Não confirmado'
        ELSE '✅ Confirmado'
    END as status
FROM auth.users
ORDER BY created_at DESC;
