# Elege.ai — War Room

> Sistema de Monitoramento de Inteligência e Gestão de Crises

**Desenvolvido por:** Paulo Abner Menezes de Souza (Paulo Sart)  
**Empresa:** Criattor Labs  
**Contato:** paulosouza17@gmail.com  
**Licença:** Proprietária — Todos os direitos reservados  

---

## 📋 Visão Geral

Plataforma de monitoramento em tempo real que combina rastreamento de mídia, análise de IA e automação de fluxos para gestão de crises e inteligência estratégica.

### Funcionalidades Principais

- **Flow Builder** — Editor visual de fluxos de automação (drag & drop)
- **Análise de IA** — Classificação, sentimento, score de risco (Gemini)
- **Monitoramento de Mídia** — Rastreamento de portais de notícias
- **Intelligence Feed** — Feed centralizado de menções e alertas
- **Planos de Crise** — Geração automática de planos de contingência
- **Ativações** — Eventos monitoráveis com keywords e entidades

---

## 🛠 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS v4 + ReactFlow |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| IA | Google Gemini (2.5 Flash, Flash Lite, Pro) |
| Cache | Redis + BullMQ |
| Deploy | PM2 + Nginx (VPS) ou Docker Compose |

---

## 🚀 Setup Local

### Requisitos

- Node.js 20+
- Redis
- Conta Supabase

### Backend

```bash
cd backend
cp .env.example .env  # Configurar variáveis
npm install
npm run dev:all       # Server + Flow Worker
```

### Frontend

```bash
cd web
cp .env.example .env  # Configurar variáveis
npm install
npm run dev           # Vite dev server (porta 5173)
```

---

## 🚀 Deploy em Produção

Todos os arquivos de instalação e requisitos de servidor estão em [`install/`](./install/).

```bash
# Via script automático (VPS Ubuntu):
cd install
sudo ./setup-vps.sh --domain warroom.seudominio.com

# Via Docker:
cd install
docker compose up -d --build
```

👉 **Guia completo:** [install/README.md](./install/README.md)

---

## 📁 Estrutura do Projeto

```
sistema/
├── backend/
│   ├── src/
│   │   ├── config/         # Supabase, Redis
│   │   ├── nodes/          # Node Handlers (11 tipos)
│   │   │   ├── handlers/   # TriggerHandler, LoopHandler, etc.
│   │   │   └── utils/      # Interpolação de variáveis
│   │   ├── routes/         # API REST endpoints
│   │   ├── services/       # FlowExecutor, AIService
│   │   └── workers/        # Flow Worker, Scheduler
│   ├── Dockerfile
│   ├── deploy.sh
│   ├── ecosystem.config.js
│   └── package.json
├── web/
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # FlowBuilder, Dashboard, etc.
│   │   └── lib/            # Supabase client
│   ├── Dockerfile
│   └── package.json
├── install/                # ⬅️ Instalação & Requisitos de Servidor
│   ├── README.md           # Guia completo de deploy
│   ├── setup-vps.sh        # Instalador automático (VPS)
│   ├── docker-compose.yml  # Deploy via Docker
│   ├── nginx/warroom.conf  # Template Nginx
│   └── env-examples/       # Templates de variáveis de ambiente
├── migrations/             # SQL migrations
├── docs/                   # Documentação técnica
└── README.md
```

---

## 🔧 Node Handlers (Backend)

| Nó | Handler | Função |
|----|---------|--------|
| Trigger | `TriggerHandler` | Início do fluxo (manual, ativação, schedule) |
| MediaOutlet | `MediaOutletHandler` | Consulta veículos de mídia |
| Loop | `LoopHandler` | Iteração sobre listas |
| HTTP Request | `HttpRequestHandler` | Requisições HTTP externas |
| Script | `ScriptHandler` | JavaScript customizado (sandbox) |
| Condicional | `ConditionalHandler` | Lógica if/then (7 operadores) |
| Link Check | `LinkCheckHandler` | Deduplicação de URLs |
| Set | `SetHandler` | Transformação de dados |
| Análise IA | `AnalysisHandler` | Análise com Gemini |
| Publicar | `PublishHandler` | Inserção no intelligence_feed |
| Trigger Flow | `TriggerFlowHandler` | Execução de outro fluxo |

---

## 📄 Licença

**PROPRIETÁRIO** — © 2025-2026 Paulo Abner Menezes de Souza (Criattor Labs)

Este software é de propriedade exclusiva do autor. Todos os direitos reservados.
Uso, cópia, modificação ou distribuição sem autorização expressa é proibido.

