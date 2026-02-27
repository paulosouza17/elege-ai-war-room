-- ==========================================
-- LIMPEZA DE POLÍTICAS INSEGURAS
-- ==========================================

-- 1. ACTIVATIONS
DROP POLICY IF EXISTS "Enable all access for dev" ON activations;
DROP POLICY IF EXISTS "Enable insert access for all users" ON activations;
DROP POLICY IF EXISTS "Enable read access for all users" ON activations;
DROP POLICY IF EXISTS "Enable update access for all users" ON activations;
DROP POLICY IF EXISTS "Enable delete access for all users" ON activations;

-- 2. FLOWS
DROP POLICY IF EXISTS "Enable all access for dev" ON flows;
DROP POLICY IF EXISTS "Enable insert access for all users" ON flows;
DROP POLICY IF EXISTS "Enable read access for all users" ON flows;
DROP POLICY IF EXISTS "Enable update access for all users" ON flows;
DROP POLICY IF EXISTS "Enable delete access for all users" ON flows;

-- 3. DEMANDS
DROP POLICY IF EXISTS "Enable all access for dev" ON demands;
DROP POLICY IF EXISTS "Enable insert access for all users" ON demands;
DROP POLICY IF EXISTS "Enable read access for all users" ON demands;
DROP POLICY IF EXISTS "Enable update access for all users" ON demands;
DROP POLICY IF EXISTS "Enable delete access for all users" ON demands;

-- 4. INTELLIGENCE_FEED
DROP POLICY IF EXISTS "Enable all access for dev" ON intelligence_feed;
DROP POLICY IF EXISTS "Enable insert access for all users" ON intelligence_feed;
DROP POLICY IF EXISTS "Enable read access for all users" ON intelligence_feed;
DROP POLICY IF EXISTS "Enable update access for all users" ON intelligence_feed;
DROP POLICY IF EXISTS "Enable delete access for all users" ON intelligence_feed;

-- 5. CRISIS_EVENTS
DROP POLICY IF EXISTS "Enable all access for dev" ON crisis_events;
DROP POLICY IF EXISTS "Enable insert access for all users" ON crisis_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON crisis_events;
DROP POLICY IF EXISTS "Enable update access for all users" ON crisis_events;
DROP POLICY IF EXISTS "Enable delete access for all users" ON crisis_events;

-- 6. FLOW_SCHEDULES
DROP POLICY IF EXISTS "Enable all access for dev" ON flow_schedules;
DROP POLICY IF EXISTS "Enable insert access for all users" ON flow_schedules;
DROP POLICY IF EXISTS "Enable read access for all users" ON flow_schedules;
DROP POLICY IF EXISTS "Enable update access for all users" ON flow_schedules;
DROP POLICY IF EXISTS "Enable delete access for all users" ON flow_schedules;

-- 7. ACTIVATION_USERS
DROP POLICY IF EXISTS "Enable all access for dev" ON activation_users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON activation_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON activation_users;
DROP POLICY IF EXISTS "Enable update access for all users" ON activation_users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON activation_users;

-- 8. PROFILES (Segurança Extra)
-- Garantir que usuários comuns só editem seus próprios perfis
DROP POLICY IF EXISTS "Enable all access for dev" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
-- Admin pode editar qualquer perfil
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Verificar políticas restantes em activations
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'activations';
