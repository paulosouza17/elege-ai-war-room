-- Remove old configs to avoid duplicates if constraints are missing
DELETE FROM public.ai_configs WHERE provider IN ('manus', 'perplexity');

-- Add Manus and Perplexity API Keys
INSERT INTO public.ai_configs (client_id, provider, model, api_key, is_active)
VALUES 
(NULL, 'manus', 'manus-research-v1', 'sk-uL47VbJZPF0jAMlqe9g-AO6GnvUIwBVzD0fetE6Xqy6fzF_IgPaWWsJk6DsptfTY2ozZs8QgIIwcnClGTNNdmoR6Z_F1', true),
(NULL, 'perplexity', 'sonar-medium-online', 'pplx-placeholder-key', true);
