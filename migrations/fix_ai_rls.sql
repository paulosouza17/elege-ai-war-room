-- FIX SQL: Erro "new row violates row-level security policy"
-- Este script permite que qualquer usuário (autenticado ou não) salve configurações no ambiente de dev.

-- 1. Remove políticas antigas restritivas
DROP POLICY IF EXISTS "Admins can view ai_configs" ON ai_configs;
DROP POLICY IF EXISTS "Enable all access for dev" ON ai_configs;

-- 2. Cria política permissiva para SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Enable all access for dev" ON ai_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Confirmação
SELECT 'Policies updated successfully' as status;
