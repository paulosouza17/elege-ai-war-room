# Notas do PDF - WARRoom ELEGEAI

## 1. Objetivo do produto
- Software War Room baseado no monitoramento do Elege.AI (TV, rádio, portais, redes sociais)
- Detecta eventos relevantes, classifica risco/narrativa/sentimento
- Entrega: Alertas imediatos, Crisis Brief, Plano de ação por janelas (2h/24h/72h), Relatórios recorrentes

## 2. Escopo funcional
### 2.1 Entradas
- Dados e menções do Elege.AI (perímetro fechado)
- Configuração: pessoas rastreadas, temas/palavras sensíveis, portais estratégicos, perfis sociais, regras de severidade

### 2.2 Saídas
- Alertas com severidade (Verde/Amarelo/Vermelho)
- Pacote de crise (CrisisPacket)
- Relatório (PDF/Doc)
- Tarefas para execução (CRM)

## 3. Pilares do processo e ramificações

### PILAR A — Captação & Diagnóstico (PR prévio)
- Objetivo: transformar lead em inteligência inicial + proposta de POC
- A1. Entrada do lead (briefing estruturado)
- A2. Pesquisa ampla (mar aberto) — Perplexity + Manus
- A3. Curadoria e priorização (score de risco/oportunidade)
- A4. Pré-relatório de diagnóstico (para reunião)
- Direcionado para: Diretor Estratégico + Analista de Inteligência
- Automação: briefing enviado → cria pasta/cliente no DB + dispara pesquisa e gera diagnóstico

### PILAR B — Setup Fechado no Elege.AI
- Objetivo: converter inteligência em perímetro de monitoramento preciso
- B1. Consolidar listas finais (pessoas/temas/portais/perfis)
- B2. Criar monitoramentos no Elege.AI via API
- B3. Configurar regras e gatilhos (termos sensíveis, veículos críticos, adversários)
- Direcionado para: Operador Técnico
- Automação: aprovação do setup → n8n publica no Elege.AI + salva versão

### PILAR C — Monitoramento contínuo & classificação
- Objetivo: organizar e classificar menções em tempo real
- C1. Ingestão (pull/callback) de novas menções
- C2. Deduplicação + enriquecimento (fonte, autor, região, histórico)
- C3. Classificação (tema, sentimento, narrativa, risco)
- Direcionado para: Sistema (automático) + Analista (supervisão)
- Automação: menção classificada → atualiza KPIs + alimenta dashboards

### PILAR D — Detecção de crise (War Mode)
- Objetivo: identificar escaladas e disparar pacote de crise
- D1. Regras de severidade (volume, fonte crítica, termo sensível, adversário)
- D2. Geração de Crisis Brief (1 pág) com evidências
- D3. Seleção automática de playbook (com revisão)
- Direcionado para: Diretor Estratégico + Analista
- Automação: severidade Vermelha → cria ticket + notifica equipe + gera CrisisPacket

### PILAR E — Direcionamentos (Playbooks) e aprovação humana
- Objetivo: recomendar ações rápidas e coerentes
- E1. Playbooks por cenário: Resposta oficial/nota, Q&A e alinhamento, Estratégia de imprensa, Plano de contenção, Mobilização positiva
- E2. Aprovação humana (obrigatória)
- Direcionado para: Diretor Estratégico
- Automação: após aprovação → envia pacote final + cria tarefas em CRM

### PILAR F — Relatórios recorrentes e otimização
- Objetivo: transformar dados em valor recorrente
- F1. Relatório diário (campanha) / semanal (pré)
- F2. Tendências, narrativas dominantes e recomendações
- F3. Loop semanal com Perplexity/Manus para atualizar perímetro
- Direcionado para: Analista (conteúdo) + Operador (entrega)
- Automação: fechamento do período → gera PDF + envia + registra entrega

## 4. Arquitetura do produto (componentes)
### 4.1 Módulos
1. Ingestão (Elege.AI → n8n)
2. Enriquecimento (dedup, metadados, score de fonte)
3. Classificação IA (tema/sentimento/narrativa/risco)
4. Rules Engine (gatilhos e severidade)
5. Playbook Engine (seleção de resposta)
6. Draft Engine (rascunhos: nota/post/Q&A)
7. Approval UI (aprovar/editar)
8. Notificações (WhatsApp/Slack/e-mail)
9. Relatórios (HTML→PDF / Docs)
10. Auditoria & Logs (rastreabilidade)

### 4.2 Tecnologias sugeridas
- n8n: orquestração
- Supabase/Postgres: dados, auditoria, versões
- Elege.AI: monitoramento fechado
- Perplexity + Manus: inteligência mar aberto
- LLM (OpenAI ou similar): classificação, resumo, relatórios
- WhatsApp: alertas
- Dashboard: Metabase/Retool/Next.js

## 5. Modelo de dados (mínimo viável)
- clients, setups, sources, mentions, classifications, alerts, crisis_packets, deliveries, audit_log

## 6. Fluxos n8n (workflows)
- WF-01: Onboarding + Diagnóstico + Setup
- WF-02: Monitoramento contínuo + alertas
- WF-03: War Mode (CrisisPacket)
- WF-04: Relatórios

## 7. Papéis e responsabilidades
### Time enxuto (2 pessoas)
1. Diretor Estratégico (owner)
2. Operador Técnico / Automação

### Time ideal (3 pessoas)
1. Diretor Estratégico
2. Analista de Inteligência
3. Operador Técnico

## 8. Cronograma POC (2-4 semanas)
- Semana 1: Pesquisa prévia + Setup
- Semana 2: Monitoramento + ajustes
- Semana 3: Primeiros resultados + relatório
- Semana 4: Consolidação + POC entregue
- Versões aceleradas: Express (7-10 dias), War (48-72h)

## 9. Custos (estimativas)
- Fixos/mensais: Infra R$300-1500, Logs R$0-800, Armazenamento R$50-400, Dashboard R$0-1000
- Variáveis/cliente: LLM R$80-2500+, WhatsApp R$50-1500+, Tempo humano 4-20h/semana
- Implementação one-time: R$6.000-25.000 (n8n+DB), R$15.000-80.000 (Dashboard/UI)
- Plano Leve: ~R$350/mês, Plano Campanha: ~R$2.500/mês

## 10. Entregáveis do projeto
- Templates de briefing, setup, Playbooks (5-10 cenários), Workflows n8n, Modelo de dados, CrisisPacket, Templates relatório, Política de logs

## 11. Critérios de sucesso (POC)
- Setup ativo em 7-10 dias ou 2-4 semanas
- Baixa taxa de falso positivo
- Relatório com insights acionáveis
- Aprovação humana clara e rápida
- Evidências sempre anexadas

## 12. Riscos e mitigação
- Ruído alto → templates + curadoria + whitelists
- Crise simultânea → plano por severidade + escalonamento
- Erros de classificação IA → human-in-the-loop + auditoria
- Compliance → sem assédio, foco em comunicação oficial

## 13. Projeto de Software — Plataforma War Room
### 13.1 Visão: plataforma multi-tenant com segurança e rastreabilidade
### 13.2 Arquitetura: API Ingestão, Banco Postgres, Fila/Jobs, Classificação, Rules Engine, Playbook Engine, Gerador Relatórios, Dashboard, Notificações, Auditoria & RBAC
### 13.3 Modelo de dados detalhado: clients, users, roles_permissions, setups, setup_entities, sources, mentions, mention_embeddings, classifications, alerts, crisis_packets, tasks, deliveries, audit_log
### 13.4 Fluxos de processamento: Ingestão & Normalização, Classificação, Rules Engine, CrisisPacket (War Mode), Relatórios
### 13.5 Dashboard War Room (telas)

### Dashboard Telas: Visão Geral, Timeline de Crise, CrisisPacket, Setup & Versões, Relatórios

### 13.6 Notificações: WhatsApp (alertas/pacotes), Slack (internos), Email (relatórios/backups)

### 13.7 Segurança: Multi-tenant, Tokens por cliente, Logs, Aprovação humana, RBAC, Backup criptografado

### 13.8 Roadmap: MVP (2-4 sem), V1 (4-8 sem), V2 (8-16 sem)

## 14. Precificação
- Presidencial Top Tier: R$300k-800k/mês
- Presidencial Competitivo: R$120k-300k/mês
- Presidencial Estrutural: R$60k-120k/mês
- Governador Estado Grande: R$120k-250k/mês
- Governador Estado Médio: R$70k-150k/mês
- Governador Estado Pequeno: R$40k-90k/mês

## 15. Projeção Financeira
- Cenário Moderado (4 meses): R$4.640.000, Lucro R$3.7M+
- Cenário Conservador: R$880.000, Lucro R$580k-680k
- Cenário Agressivo: R$7.600.000, Lucro R$5.8M+

## 16. Estrutura de Colaboradores
- Fase Inicial (até R$300k): 3 pessoas
- Fase Expansão (R$300k-1M): 6 pessoas
- Fase Presidencial Top (R$1M+): 10+ pessoas

## 17. Escala por Partido
- Estadual: R$80k-150k/mês
- Nacional Premium: R$150k-300k/mês

## 18. Conclusão Estratégica
- War Room viável, escalável, alta margem
- Core enxuto: ingestão, classificação, rules, playbooks, relatórios
- Diferencial: CrisisPacket, auditoria e velocidade
- Começar com MVP e evoluir para V1/V2
