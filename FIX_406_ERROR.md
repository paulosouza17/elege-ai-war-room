# 🚨 Erro 406: Flow Executions Table

## Problema
Frontend está tentando buscar de `flow_executions` mas recebe erro 406 (Not Acceptable).

## Causa Provável
Tabela `flow_executions` ainda não foi criada no Supabase.

## Solução Rápida

### 1️⃣ Verificar se tabela existe
Execute no Supabase SQL Editor:
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'flow_executions'
);
```

### 2️⃣ Criar a tabela
**Se retornar `false` (tabela não existe):**

Execute TODO o conteúdo de: [run_flow_executions_setup.sql](file:///Users/paulinho/Documents/CLIENTES/Elege.ai/WAR%20ROOM/sistema/run_flow_executions_setup.sql)

**OU use a versão original completa:**
[create_flow_executions_schema.sql](file:///Users/paulinho/Documents/CLIENTES/Elege.ai/WAR%20ROOM/sistema/create_flow_executions_schema.sql)

### 3️⃣ Testar novamente
Após executar o SQL:
1. Recarregue a página do Flow Builder
2. Click em "Simular Execução"
3. Painel lateral deve abrir automaticamente

## Alternativa - Se RLS estiver bloqueando

**Adicione estas policies:**
```sql
-- Allow anon to read executions (for testing)
CREATE POLICY flow_executions_anon_select ON flow_executions
    FOR SELECT
    TO anon
    USING (true);
```

## Verificação Final

Rode este teste: [quick_check_executions.sql](file:///Users/paulinho/Documents/CLIENTES/Elege.ai/WAR%20ROOM/sistema/quick_check_executions.sql)

Deve retornar:
```
status: "✅ Table EXISTS"
execution_count: 0 (ou mais)
```
