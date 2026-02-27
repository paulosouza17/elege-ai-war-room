# 🔍 Debug: Execution Tracking

## Verificar Record no Banco

Execute no Supabase:
```sql
SELECT * FROM flow_executions 
WHERE id = '808749c7-c0fd-4ddf-a64f-13c61f4f3f45';
```

**Se retornar 0 rows:** Backend não está inserindo ❌  
**Se retornar 1 row:** Backend insere mas Realtime não funciona ⚠️

## Verificar Realtime Publication

Execute no Supabase:
```sql
-- Check if realtime is enabled
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Check if flow_executions is published
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'flow_executions';
```

**Se não aparecer flow_executions:**
```sql
-- Add table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE flow_executions;
```

## Verificar Logs do Backend

Procure no terminal do backend por:
- `[FlowService] Execution record created:`
- `[FlowService] Failed to create execution record:`

## Próximos Passos

1. Execute [check_execution_record.sql](file:///Users/paulinho/Documents/CLIENTES/Elege.ai/WAR%20ROOM/sistema/check_execution_record.sql)
2. Se record existe → Habilite Realtime
3. Se record NÃO existe → Debug backend insert
