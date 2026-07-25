# Decisões Técnicas

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### DT-01 — _Título da decisão_

- **Data:** _..._
- **Contexto:** Por que esta decisão precisou ser tomada agora?
- **Decisão:** O que foi decidido, em uma frase direta.
- **Alternativas consideradas:** O que mais foi avaliado e por que foi descartado.
- **Consequências:** O que essa decisão torna mais fácil, mais difícil, ou impossível depois.
- **Status:** Vigente / Superada por DT-_NN_

## 2. Perguntas Orientadoras

- Esta decisão seria cara de reverter dentro de 3 meses? Se sim, ela pertence aqui.
- As alternativas descartadas estão registradas com o motivo real, ou só "decidimos não fazer assim"?
- Esta decisão contradiz alguma decisão anterior? Se sim, a anterior foi marcada como superada?

## 3. Critérios de Aceite

- [ ] Toda decisão tem alternativas consideradas registradas, não apenas a escolha final.
- [ ] Nenhuma decisão antiga foi editada in-place quando uma nova decisão a substituiu — foi criada uma nova entrada com referência cruzada.

## 4. Riscos

Decisões tomadas sob pressão de tempo, sem alternativas reais avaliadas, ou que dependem de uma pessoa específica para serem entendidas.

_..._

## 5. Decisões Pendentes

Decisões que precisam ser tomadas mas ainda não foram.

- **Biblioteca de acesso ao MySQL e estratégia de migrations** (ex.: Drizzle + mysql2, mysql2 puro, ou outra solução): ainda não aprovada. O MySQL do Finanhouse já existe na Clever Cloud, potencialmente com estrutura ou dados; a decisão será tomada somente após o inventário do banco existente (inspeção somente leitura em `database/inspection/`, documentada em `database/current-schema/`), na sessão dedicada à arquitetura/contratos do banco. A escolha não deve ser justificada por o projeto ser online ou local — ORM é uma camada de acesso a dados, não uma forma de hospedagem.
