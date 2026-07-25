# Registro de Decisões

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este registro cobre decisões de processo, governança e produto. Decisões puramente arquiteturais/técnicas têm registro dedicado em `Docs/02_architecture/decisoes_tecnicas.md` — se a decisão é sobre código/infra, prefira aquele documento; se é sobre processo, prioridade ou governança, use este.

## 1. Objetivo

Registrar decisões caras de reverter para que ninguém (humano ou agente) precise reconstruir o raciocínio por trás delas a partir de memória ou suposição.

## 2. Decisões

Uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### RD-01 — _Título da decisão_

- **Data:** _..._
- **Contexto:** _..._
- **Decisão:** _..._
- **Alternativas consideradas:** _..._
- **Consequências:** _..._
- **Status:** Vigente / Superada por RD-_NN_

## 3. Governança para Mudanças Feitas por Agentes de IA

- [ ] Mudança de escopo durante a execução de um bloco é reportada antes de ser implementada, não decidida unilateralmente pelo agente.
- [ ] Toda decisão que um agente toma sem confirmação prévia do usuário (quando a confirmação era exigida) é registrada como pendência P1 no feedback do bloco.
- [ ] Decisões tomadas por um agente que afetam contratos (`Docs/03_contracts/`) ou design system (`Docs/07_design_system/`) são registradas aqui mesmo quando pequenas.

## 4. Perguntas Orientadoras

- Esta decisão foi tomada por uma pessoa/agente específico sob pressão de tempo? Isso deveria ser revisitado com calma depois?
- Esta decisão contradiz alguma decisão anterior (aqui ou em `decisoes_tecnicas.md`)? Se sim, a anterior foi marcada como superada?

## 5. Decisões Pendentes

- Biblioteca de acesso ao MySQL / estratégia de migrations: decisão técnica pendente, registrada em `Docs/02_architecture/decisoes_tecnicas.md` (seção 5) — adiada até o inventário do banco MySQL já existente na Clever Cloud.
