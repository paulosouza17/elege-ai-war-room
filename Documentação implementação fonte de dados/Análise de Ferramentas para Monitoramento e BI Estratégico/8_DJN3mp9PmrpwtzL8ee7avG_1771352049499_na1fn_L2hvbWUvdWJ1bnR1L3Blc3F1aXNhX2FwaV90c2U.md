# Pesquisa sobre a API de Dados Eleitorais do TSE (via Brasil.IO)

## 1. Nome da Ferramenta

Dados TSE API Brasil eleições, acessada através da plataforma Brasil.IO.

## 2. Finalidades da API (Endpoints e Funcionalidades)

A API do Brasil.IO permite o acesso a dados de eleições brasileiras desde 1996, que são capturados do Tribunal Superior Eleitoral (TSE). As principais funcionalidades incluem:

- **Consulta de Candidatos:** Obter informações detalhadas sobre os candidatos, como nome, CPF, data de nascimento, partido, cargo, etc.
- **Consulta de Bens dos Candidatos:** Acessar a lista de bens declarados pelos candidatos.
- **Consulta de Votações:** Obter os resultados das votações, incluindo o número de votos por candidato, partido, e localidade.
- **Consulta de Filiações Partidárias:** Verificar a filiação partidária dos cidadãos.

Os endpoints seguem o padrão:
`https://api.brasil.io/v1/dataset/eleicoes-brasil/<tabela>/`

Onde `<tabela>` pode ser `candidatos`, `bens-candidato`, `votacoes`, ou `filiados`.

## 3. Tipos de Input (Parâmetros)

A API permite a filtragem dos dados através de diversos parâmetros na URL, como:

- `ano_eleicao`: Ano da eleição
- `sigla_uf`: Sigla da Unidade Federativa (Estado)
- `descricao_ue`: Unidade Eleitoral
- `num_turno`: Número do turno
- `descricao_cargo`: Cargo disputado
- `sigla_partido`: Sigla do partido
- `cpf_candidato`: CPF do candidato
- `nome_candidato`: Nome do candidato
- `nome_urna_candidato`: Nome do candidato na urna

## 4. Tipos de Output/Resposta (Formato)

A API retorna os dados em formato **JSON**. A resposta é paginada e inclui uma lista de resultados, onde cada resultado é um objeto com os dados da tabela consultada. Por exemplo, para a tabela de candidatos, cada objeto contém informações como `ano_eleicao`, `sigla_uf`, `nome_candidato`, `nome_urna_candidato`, `sigla_partido`, etc.

## 5. Valor Agregado para Monitoramento 360

Essa API oferece um grande valor para um sistema de monitoramento 360, pois permite:

- **Análise de Perfil de Candidatos:** Cruzar informações de candidatos com sua presença e menções em mídias sociais, notícias, TV e rádio.
- **Monitoramento de Desempenho Eleitoral:** Acompanhar em tempo real (ou quase) os resultados das votações e comparar com a cobertura da mídia e o sentimento nas redes sociais.
- **Detecção de Padrões e Tendências:** Identificar tendências de votação, correlações entre o perfil do candidato, seu desempenho e a cobertura da mídia.
- **Enriquecimento de Dados:** Combinar os dados eleitorais com outras fontes de dados para gerar insights mais profundos sobre o cenário político.

## 6. Planos e Limitações da API

- **Gratuito com Autenticação:** O acesso à API do Brasil.IO é gratuito, mas requer autenticação via token (API key).
- **Limites de Requisição:** A API possui limites de requisição para evitar abuso e garantir a estabilidade do serviço. Usuários que excedem o limite podem ter seu acesso bloqueado.
- **Financiamento:** O projeto Brasil.IO é mantido por voluntários e doações, portanto, não há planos pagos, mas a continuidade do serviço depende do apoio da comunidade.
