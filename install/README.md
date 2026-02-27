# 🚀 Elege.ai WAR ROOM — Guia de Instalação

> Requisitos de servidor e instruções de deploy para produção.

---

## Requisitos Mínimos do Servidor

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| vCPU | 2 | 4 |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Portas | 22, 80, 443 | IPv4 fixo |

### Dependências

| Software | Versão |
|----------|--------|
| Node.js | 20 LTS |
| Redis | 7+ |
| Nginx | latest |
| PM2 | latest (global) |

---

## Opção 1: Instalação Automática (VPS — Recomendado)

### 1. Envie o projeto para a VPS

```bash
# Via SCP:
scp -r ./sistema root@SEU_IP:/tmp/warroom-src

# Ou via Git:
ssh root@SEU_IP
git clone git@github.com:paulosouza17/war-room.git /tmp/warroom-src
```

### 2. Execute o instalador

```bash
ssh root@SEU_IP
cd /tmp/warroom-src/install

chmod +x setup-vps.sh

# Com domínio + SSL
sudo ./setup-vps.sh --domain warroom.seudominio.com

# Sem SSL (testar antes de configurar DNS)
sudo ./setup-vps.sh --domain warroom.seudominio.com --skip-ssl

# Apenas backend (sem frontend)
sudo ./setup-vps.sh --domain warroom.seudominio.com --no-frontend
```

### 3. Configure as variáveis de ambiente

```bash
nano /opt/warroom/backend/.env
nano /opt/warroom/web/.env
```

Veja os templates em [`env-examples/`](./env-examples/) para referência.

### 4. Rebuild após editar .env

```bash
cd /opt/warroom/backend && bash deploy.sh
cd /opt/warroom/web && npm run build && sudo systemctl reload nginx
```

---

## Opção 2: Docker Compose

### 1. Instale o Docker

```bash
curl -fsSL https://get.docker.com | bash
```

### 2. Configure os .env

```bash
cp env-examples/backend.env.example ../backend/.env
cp env-examples/web.env.example ../web/.env
nano ../backend/.env
nano ../web/.env
```

### 3. Suba tudo

```bash
docker compose -f docker-compose.yml up -d --build
```

### Comandos úteis

```bash
docker compose logs -f          # Logs em tempo real
docker compose logs backend     # Logs só do backend
docker compose restart backend  # Reiniciar backend
docker compose down             # Parar tudo
docker compose up -d --build    # Rebuild + reiniciar
```

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Obrigatório | Descrição |
|----------|:-----------:|-----------|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | ✅ | Service Role Key (bypass de RLS) |
| `REDIS_URL` | ✅ | URL do Redis (default: `redis://localhost:6379`) |
| `INGESTION_API_KEY` | ✅ | Chave para API de ingestão (auto-gerada pelo script) |
| `ELEGEAI_API_TOKEN` | ✅ | Token da API Elege.ai |
| `PORT` | — | Porta da API (default: `3000`) |

### Frontend (`web/.env`)

| Variável | Obrigatório | Descrição |
|----------|:-----------:|-----------|
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon Key (chave pública) |
| `VITE_BACKEND_URL` | ✅ | URL do backend (ex: `https://seudominio.com`) |
| `VITE_API_URL` | ✅ | Mesma URL do backend |

---

## SSL com Certbot

```bash
# Pré-requisito: DNS apontando para o IP da VPS

# Gerar certificado
sudo certbot --nginx -d seudominio.com

# Testar renovação
sudo certbot renew --dry-run
```

---

## Monitoramento

```bash
pm2 status                # Status dos processos
pm2 logs                  # Todos os logs
pm2 logs warroom-api      # Logs da API
pm2 logs warroom-worker   # Logs do Worker
pm2 monit                 # Monitor em tempo real

systemctl status redis nginx  # Status dos serviços
```

---

## Atualização

```bash
cd /opt/warroom
git pull origin main

# Backend
cd backend && bash deploy.sh

# Frontend (se houve mudanças)
cd ../web && npm run build && sudo systemctl reload nginx
```

---

## Troubleshooting

### API não responde

```bash
pm2 status
pm2 logs warroom-api --err --lines 50
lsof -i :3000
pm2 delete all && cd /opt/warroom/backend && bash deploy.sh
```

### Redis não conecta

```bash
sudo systemctl status redis-server
redis-cli ping
sudo systemctl restart redis-server
```

### Nginx retorna 502

```bash
pm2 status                                    # Backend rodando?
sudo nginx -t                                 # Config válida?
sudo tail -20 /var/log/nginx/warroom_error.log
```

---

## Estrutura em Produção

```
/opt/warroom/
├── backend/
│   ├── dist/              # JS compilado
│   ├── ecosystem.config.js
│   ├── deploy.sh
│   ├── .env               # ⚠️ NÃO COMITAR
│   └── logs/
├── web/
│   ├── dist/              # Frontend estático (Nginx)
│   └── .env               # ⚠️ NÃO COMITAR
├── install/
│   ├── README.md          # Este arquivo
│   ├── setup-vps.sh       # Instalador automático
│   ├── docker-compose.yml # Alternativa Docker
│   ├── nginx/warroom.conf # Template Nginx
│   └── env-examples/      # Templates de variáveis
├── migrations/            # SQL migrations
└── README.md              # Documentação principal
```
