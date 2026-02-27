# 💰 Plano Financeiro — Elege.AI War Room

> Estimativa de custos operacionais e precificação para operações eleitorais.
> Última atualização: Fevereiro 2026

---

## Premissas Base

| Item | Valor |
|---|---|
| Mac Mini M2 | R$ 4.000 |
| Capacidade/Mac | 4 TVs **OU** 6 rádios |
| Período operacional | 6 meses (pré-eleição + durante) |
| Dólar estimado | R$ 5,80 |

---

## 🏛️ CENÁRIO 1: Eleição Presidencial (Nacional)

### 1. Hardware — Monitoramento TV/Rádio

| Item | Qtd | Unit. | Total |
|---|---|---|---|
| Mac Mini (TV) — 2/estado × 27 | 54 | R$ 4.000 | R$ 216.000 |
| Mac Mini (Rádio) — 1/estado × 27 | 27 | R$ 4.000 | R$ 108.000 |
| Captura de vídeo USB (4 entradas) | 54 | R$ 800 | R$ 43.200 |
| Receptores/antenas rádio FM/AM | 27 | R$ 300 | R$ 8.100 |
| Cabos, switches, nobreaks | lote | — | R$ 25.000 |
| **Subtotal Hardware** | | | **R$ 400.300** |

> 81 Mac Minis monitorando ~216 canais de TV + ~162 rádios = **378 fontes de mídia tradicional**

### 2. Infraestrutura Cloud

| Serviço | Especificação | Custo/mês | 6 meses |
|---|---|---|---|
| Supabase Pro (DB principal) | Pro + Add-ons | R$ 450 | R$ 2.700 |
| Servidor Backend (API + Workers) | 8 vCPU, 32GB RAM | R$ 1.500 | R$ 9.000 |
| Servidor Processamento IA | GPU-enabled | R$ 3.000 | R$ 18.000 |
| Storage (vídeos, áudios, docs) | ~5TB S3/R2 | R$ 400 | R$ 2.400 |
| CDN + Bandwidth | Cloudflare Pro | R$ 200 | R$ 1.200 |
| Backup + Redundância | Região secundária | R$ 600 | R$ 3.600 |
| **Subtotal Infra** | | **R$ 6.150/mês** | **R$ 36.900** |

### 3. APIs e Integrações

| API | Plano | USD/mês | BRL/mês | 6 meses |
|---|---|---|---|---|
| Twitter API | Pro ($5k) | $5.000 | R$ 29.000 | R$ 174.000 |
| SEMrush | Business | $499 | R$ 2.894 | R$ 17.364 |
| BuzzSumo | Pro | $299 | R$ 1.734 | R$ 10.404 |
| Perplexity AI | ~50k queries/mês | $250 | R$ 1.450 | R$ 8.700 |
| Manus AI | API usage | $200 | R$ 1.160 | R$ 6.960 |
| Google Gemini | ~500k tokens/dia | $800 | R$ 4.640 | R$ 27.840 |
| OpenAI (backup) | API usage | $300 | R$ 1.740 | R$ 10.440 |
| News API | Business | $449 | R$ 2.604 | R$ 15.624 |
| Brandwatch (opcional) | Custom | $3.000 | R$ 17.400 | R$ 104.400 |
| **Subtotal (sem BW)** | | **$7.797** | **R$ 45.222** | **R$ 271.332** |
| **Subtotal (com BW)** | | **$10.797** | **R$ 62.622** | **R$ 375.732** |

### 4. Software & Licenças

| Item | 6 meses |
|---|---|
| Domínio + SSL | R$ 300 |
| Monitoring (Sentry/Datadog) | R$ 3.000 |
| CI/CD (GitHub Actions) | R$ 1.200 |
| **Subtotal** | **R$ 4.500** |

### 📊 Total Presidencial

| Categoria | Sem Brandwatch | Com Brandwatch |
|---|---|---|
| Hardware | R$ 400.300 | R$ 400.300 |
| Infraestrutura (6m) | R$ 36.900 | R$ 36.900 |
| APIs (6m) | R$ 271.332 | R$ 375.732 |
| Software (6m) | R$ 4.500 | R$ 4.500 |
| **Custo Operacional** | **R$ 713.032** | **R$ 817.432** |
| Contingência (15%) | R$ 106.955 | R$ 122.615 |
| **TOTAL** | **~R$ 820.000** | **~R$ 940.000** |

### 💵 Precificação Sugerida

| Modelo | Valor |
|---|---|
| Custo real | R$ 820k - R$ 940k |
| Markup 3x | **R$ 2.460.000 - R$ 2.820.000** |
| Markup 5x (premium) | **R$ 4.100.000 - R$ 4.700.000** |

> Campanhas presidenciais gastam R$ 50-100M+. War Room = ~3-5% do orçamento.

---

## 🏙️ CENÁRIO 2: Governo Local (1 Estado/Capital)

### 1. Hardware

| Item | Qtd | Unit. | Total |
|---|---|---|---|
| Mac Mini (TV) | 2 | R$ 4.000 | R$ 8.000 |
| Mac Mini (Rádio) | 1 | R$ 4.000 | R$ 4.000 |
| Acessórios | lote | — | R$ 3.600 |
| **Subtotal** | | | **R$ 15.600** |

> 3 Mac Minis: 8 TVs + 6 rádios = **14 fontes**

### 2. Infraestrutura

| Serviço | Custo/mês | 6 meses |
|---|---|---|
| Supabase Pro | R$ 200 | R$ 1.200 |
| Servidor Backend | R$ 600 | R$ 3.600 |
| Storage (~500GB) | R$ 100 | R$ 600 |
| CDN | R$ 100 | R$ 600 |
| **Subtotal** | **R$ 1.000/mês** | **R$ 6.000** |

### 3. APIs

| API | BRL/mês | 6 meses |
|---|---|---|
| Twitter API (Basic $200) | R$ 1.160 | R$ 6.960 |
| SEMrush Pro | R$ 780 | R$ 4.680 |
| BuzzSumo Pro | R$ 1.734 | R$ 10.404 |
| Perplexity AI | R$ 290 | R$ 1.740 |
| Manus AI | R$ 580 | R$ 3.480 |
| Google Gemini | R$ 900 | R$ 5.400 |
| News API | R$ 2.604 | R$ 15.624 |
| **Subtotal** | **R$ 8.048/mês** | **R$ 48.288** |

### 📊 Total Governo Local

| Categoria | Valor |
|---|---|
| Hardware | R$ 15.600 |
| Infraestrutura (6m) | R$ 6.000 |
| APIs (6m) | R$ 48.288 |
| Software (6m) | R$ 2.000 |
| **Custo Total** | **R$ 71.888** |
| Contingência (15%) | R$ 10.783 |
| **TOTAL** | **~R$ 83.000** |

### 💵 Precificação Sugerida

| Modelo | Valor |
|---|---|
| Custo real | R$ 83k |
| Markup 3x | **R$ 250.000** |
| Markup 5x (premium) | **R$ 415.000** |

> Campanhas a governador gastam R$ 5-30M. War Room = ~2-5%.

---

## 📋 Resumo Comparativo

| | Presidencial | Local |
|---|---|---|
| Hardware | 81 Mac Minis | 3 Mac Minis |
| Fontes de mídia | ~378 | ~14 |
| Custo mensal APIs | R$ 45-63k | R$ 8k |
| **Custo total (6m)** | **R$ 820k-940k** | **~R$ 83k** |
| **Preço 3x** | **R$ 2,5M-2,8M** | **R$ 250k** |
| **Preço 5x** | **R$ 4,1M-4,7M** | **R$ 415k** |

---

## 🔗 Links para Geração de Tokens

| Serviço | URL | Observações |
|---|---|---|
| Twitter API | https://developer.x.com/en/portal/dashboard | Developer Portal → Projects & Apps → Keys |
| SEMrush | https://www.semrush.com/accounts/profile/ | My Profile → API Key |
| BuzzSumo | https://app.buzzsumo.com/account/api | Account → API Access |
| Perplexity AI | https://www.perplexity.ai/settings/api | Settings → API Keys |
| Manus AI | https://manus.im/settings | Settings → API Keys |
| Brandwatch | https://developers.brandwatch.com/ | Developer Hub → OAuth Token |
| Google Gemini | https://aistudio.google.com/apikey | Google AI Studio → API Keys |
| OpenAI | https://platform.openai.com/api-keys | Platform → API Keys |
| News API | https://newsapi.org/account | Account → API Key |
