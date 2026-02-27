-- Listar TODAS as políticas de activations
SELECT 
    policyname,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'activations';
