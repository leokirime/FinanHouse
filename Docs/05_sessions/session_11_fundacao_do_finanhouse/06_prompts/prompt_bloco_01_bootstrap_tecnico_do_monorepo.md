# Prompt — Bloco 01: Bootstrap técnico do monorepo

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_01_bootstrap_tecnico_do_monorepo.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Inicializar as aplicações React e Node.js do Finanhouse, configurar os workspaces e deixar front-end e API executáveis localmente, sem acessar o banco existente.

## 3. Escopo

React; Vite; TypeScript; Node.js; TypeScript na API; npm workspaces; scripts de desenvolvimento; scripts de build; lint; typecheck; teste mínimo; endpoint de saúde (`GET /health`); comunicação local básica entre web e API (se não aumentar o escopo desnecessariamente); documentação de execução.

## 4. Fora de Escopo

Conexão com MySQL; instalação de ORM; migrations; seeds; autenticação; dashboard completo; regras financeiras; componentes finais; gráficos; deploy; acesso à Clever Cloud; dados fictícios tratados como dados reais.

## 5. Arquivos Permitidos

- `apps/web/**` (criação da aplicação React + Vite + TypeScript)
- `apps/api/**` (criação da aplicação Node.js + TypeScript)
- `package.json` (raiz, apenas scripts e workspaces)
- `README.md` (raiz, apenas se necessário para documentar execução)
- Não tocar em `database/**`, `Docs/03_contracts/contrato_banco_dados.md`, `.env`, ou qualquer arquivo de credenciais

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

O MySQL da Clever Cloud já existe e não deve ser acessado, criado, sobrescrito, migrado ou ter seeds executados neste bloco. Nenhuma credencial pode entrar no Git, logs, documentação ou saída pública. Nenhum ORM ou driver de banco é instalado.

## 8. Restrições de Performance

Não aplicável — bootstrap mínimo.

## 9. Restrições de Design System

Não aplicável — `Docs/07_design_system/` ainda não foi definido. Usar apenas texto (nome "Finanhouse" e slogan "Casa, evolução e equilíbrio") na tela inicial, sem logo (pendência já registrada em `assets/brand/README.md`).

## 10. Tarefas

1. Inicializar `apps/web` (Vite + React + TypeScript) com tela inicial mínima exibindo nome e slogan.
2. Inicializar `apps/api` (Node.js + TypeScript) com endpoint `GET /health` retornando `{ "status": "ok", "service": "finanhouse-api" }`.
3. Configurar scripts no `package.json` raiz para dev/build/lint/typecheck/test via workspaces.
4. Instalar dependências e validar dev/build/lint/typecheck/test em ambas as aplicações, além de testar `/health` manualmente.

## 11. Critérios de Aceite

- [ ] `apps/web` inicia localmente
- [ ] `apps/api` inicia localmente
- [ ] Front-end usa React, Vite e TypeScript
- [ ] API usa Node.js e TypeScript
- [ ] Endpoint `GET /health` existe e retorna JSON com estado da API
- [ ] Workspaces reconhecidos pelo npm
- [ ] Scripts de execução, build, lint, typecheck e teste funcionam
- [ ] Nenhuma conexão com banco foi realizada
- [ ] Nenhuma credencial foi criada ou exposta

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm install`
- [ ] Build de `apps/web`
- [ ] Compilação de `apps/api`
- [ ] Lint
- [ ] Typecheck
- [ ] Teste mínimo
- [ ] Teste manual de `GET /health`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_01_bootstrap_tecnico_do_monorepo --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(bootstrap_tecnico_do_monorepo): _..._
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
