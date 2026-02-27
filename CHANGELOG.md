# Changelog

Todas as alterações notáveis do projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-02-22

### 🎉 Lançamento Inicial

#### Adicionado
- **Flow Builder** — Editor visual de fluxos com drag & drop (ReactFlow)
- **11 Node Handlers** — Trigger, Loop, HTTP, Script, Condicional, LinkCheck, Set, MediaOutlet, IA, Publicar, TriggerFlow
- **Análise de IA** — Integração Gemini (2.5 Flash, Flash Lite, Pro) com análise contextual
- **Intelligence Feed** — Feed centralizado com risk score, sentimento, keywords e entidades
- **Ativações** — Sistema de monitoramento com briefing, keywords e pessoas de interesse
- **Planos de Crise** — Geração automática via IA
- **Debug Panel** — Visualização de dados por nó em tempo de execução
- **Keyboard Shortcuts** — Ctrl/Cmd+S (salvar), Ctrl/Cmd+Z (desfazer)
- **Flow Worker** — Executor assíncrono de fluxos com scheduler
- **Watchdog** — Monitoramento de crises em background

#### Infraestrutura
- Backend: Node.js + Express + TypeScript
- Frontend: React 19 + Vite + Tailwind CSS v4
- Database: Supabase (PostgreSQL)
- Cache: Redis + BullMQ
- IA: Google Gemini API
