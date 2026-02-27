-- ==========================================
-- LIMPEZA FINAL E VERIFICAÇÃO
-- ==========================================

-- 1. Garantir que políticas inseguras se foram
DROP POLICY IF EXISTS "Enable all access for dev" ON activations;
DROP POLICY IF EXISTS "Enable read access for all users" ON activations;

-- 2. Limpar dados de teste
DELETE FROM activations WHERE name LIKE 'Ativação Confidencial A1%';
DELETE FROM profiles WHERE email LIKE 'teste_iso_%';
-- Tenta deletar users, mas ignora erro se não for superuser
DO $$
BEGIN
    DELETE FROM auth.users WHERE email LIKE 'teste_iso_%';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Não foi possível deletar auth.users (permissão), mas profiles foram limpos.';
END $$;

-- 3. Listar políticas atuais para confirmação visual
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'activations';
