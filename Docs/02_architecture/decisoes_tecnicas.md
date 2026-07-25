# Decisões Técnicas

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### DT-01 — Persistência: Drizzle ORM + mysql2

- **Data:** 2026-07-25
- **Contexto:** O MySQL do Finanhouse existe na Clever Cloud mas está confirmado vazio (Bloco 02). Era preciso decidir a camada de acesso a dados antes de modelar o schema.
- **Decisão:** Drizzle ORM (schema tipado + geração de migrations) sobre `mysql2` (driver real). Ver ADR completo em `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`.
- **Alternativas consideradas:** `mysql2` puro (mais simples, mas migrations e tipagem manuais); Prisma/TypeORM/Sequelize/Knex (mais peso/complexidade do que o projeto precisa).
- **Consequências:** Schema TypeScript vira fonte de verdade; migrations são geradas e revisadas, nunca aplicadas via `drizzle-kit push`; aplicação de migration exige autorização explícita.
- **Status:** Vigente

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

- **Verificação de TLS/SSL entre a futura aplicação (Vercel) e o MySQL da Clever Cloud** — a inspeção do Bloco 02 usou `DATABASE_SSL=false` apenas para ler metadados; produção precisa de transporte seguro confirmado antes da primeira migration real e antes de qualquer dado real. Ver ADR-001 (`Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`) e `Docs/03_contracts/contrato_banco_dados.md`.
- **Aplicação da migration inicial gerada no Bloco 03** — depende de revisão e autorização explícita do proprietário; não é automática mesmo após o schema estar modelado.
