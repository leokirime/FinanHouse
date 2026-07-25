# Registro de Decisões

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este registro cobre decisões de processo, governança e produto. Decisões puramente arquiteturais/técnicas têm registro dedicado em `Docs/02_architecture/decisoes_tecnicas.md` — se a decisão é sobre código/infra, prefira aquele documento; se é sobre processo, prioridade ou governança, use este.

## 1. Objetivo

Registrar decisões caras de reverter para que ninguém (humano ou agente) precise reconstruir o raciocínio por trás delas a partir de memória ou suposição.

## 2. Decisões

Uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### RD-01 — Aprovação da persistência Drizzle + mysql2 e ressalva de TLS

- **Data:** 2026-07-25
- **Contexto:** Após o inventário do Bloco 02 confirmar o MySQL da Clever Cloud vazio, foi apresentada uma proposta técnica comparativa (mysql2 puro vs. Drizzle+mysql2) no feedback do Bloco 02.
- **Decisão:** O proprietário aprovou explicitamente Drizzle + mysql2 como estratégia de persistência (detalhe técnico em `Docs/02_architecture/decisoes_tecnicas.md`, DT-01, e `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`), com a restrição explícita de nunca usar `drizzle-kit push` e de só aplicar migrations mediante autorização explícita. O proprietário também levantou a ressalva de que a conexão Vercel → MySQL Clever Cloud precisa de TLS verificado antes de dados reais, registrada como pendência P2.
- **Alternativas consideradas:** ver DT-01.
- **Consequências:** Bloco 03 modela o schema inicial e gera (sem aplicar) a primeira migration. Verificação de TLS fica como bloqueador antes de qualquer inserção de dado real em produção.
- **Status:** Vigente

## 3. Governança para Mudanças Feitas por Agentes de IA

- [ ] Mudança de escopo durante a execução de um bloco é reportada antes de ser implementada, não decidida unilateralmente pelo agente.
- [ ] Toda decisão que um agente toma sem confirmação prévia do usuário (quando a confirmação era exigida) é registrada como pendência P1 no feedback do bloco.
- [ ] Decisões tomadas por um agente que afetam contratos (`Docs/03_contracts/`) ou design system (`Docs/07_design_system/`) são registradas aqui mesmo quando pequenas.

## 4. Perguntas Orientadoras

- Esta decisão foi tomada por uma pessoa/agente específico sob pressão de tempo? Isso deveria ser revisitado com calma depois?
- Esta decisão contradiz alguma decisão anterior (aqui ou em `decisoes_tecnicas.md`)? Se sim, a anterior foi marcada como superada?

## 5. Decisões Pendentes

- ~~Biblioteca de acesso ao MySQL / estratégia de migrations~~ — decidido (RD-01, DT-01): Drizzle + mysql2.
- Verificação de TLS/SSL entre Vercel e MySQL Clever Cloud (P2) — ver `Docs/02_architecture/decisoes_tecnicas.md` (seção 5).
- Autorização final para aplicar a migration inicial gerada no Bloco 03 (P2).
