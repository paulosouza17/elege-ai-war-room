# Pesquisa sobre a API v2 do Twitter (X)

## Endpoints e Funcionalidades da API

A API v2 do Twitter oferece uma ampla gama de endpoints para interagir com a plataforma. Alguns dos principais são:

- **Posts**: Pesquisar, recuperar e publicar posts. Acessar timelines, threads e quote posts.
- **Users**: Consultar usuários, gerenciar seguidores, bloqueios e silenciamentos.
- **Spaces**: Encontrar conversas de áudio ao vivo e seus participantes.
- **Direct Messages**: Enviar e receber mensagens privadas.
- **Lists**: Criar e gerenciar listas de contas.
- **Trends**: Acessar os tópicos mais comentados por localização.
- **Search**: A API de busca é dividida em "Recent Search" (últimos 7 dias) e "Full-Archive Search" (todo o histórico desde 2006).

## Tipos de Input

Cada endpoint requer parâmetros específicos. Por exemplo:

- **Busca de Posts**: `query` (com operadores para palavras-chave, hashtags, menções, etc.), `start_time`, `end_time`, `max_results`.
- **Consulta de Usuário**: `ids` ou `usernames`.

## Tipos de Output/Resposta

As respostas da API são em formato JSON e contêm objetos de dados ricos, como:

- **Posts**: Texto completo, métricas (likes, retweets), entidades (hashtags, menções), anotações e threads de conversa.
- **Users**: Perfis, contagem de seguidores, status de verificação.
- **Media**: Imagens, vídeos e GIFs com metadados.
- **Polls**: Opções e contagem de votos.

## Valor para Monitoramento 360

A API do Twitter é uma fonte valiosa para um sistema de monitoramento 360, permitindo:

- **Monitoramento de Redes Sociais em Tempo Real**: Acompanhar menções de marcas, produtos e concorrentes.
- **Análise de Sentimento**: Avaliar a percepção do público sobre determinados tópicos.
- **Identificação de Tendências**: Descobrir e analisar os assuntos mais relevantes para o público.
- **Busca Ampla com IA**: A capacidade de buscar em todo o arquivo histórico do Twitter permite uma análise profunda e retroativa de qualquer assunto.

## Planos e Limitações

A API v2 do Twitter opera em um modelo **pay-per-usage** (pague pelo que usar), sem planos de assinatura mensais. Os custos variam por endpoint e o uso é medido em créditos, que são comprados antecipadamente. Existe um nível gratuito com limites de requisições, e para volumes maiores, é necessário adquirir créditos ou contratar um plano Enterprise.
