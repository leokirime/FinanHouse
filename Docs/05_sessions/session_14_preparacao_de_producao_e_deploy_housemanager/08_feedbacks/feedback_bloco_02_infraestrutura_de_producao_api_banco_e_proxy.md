# Feedback — Bloco 02: Infraestrutura de produção: API, banco e proxy

> Sessão: 14 (preparacao_de_producao_e_deploy_housemanager) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Resumo Executivo

Este bloco validou tecnicamente a arquitetura de custo zero decidida pelo usuário (Vercel Free para o frontend, Render Free Web Service para a API Node/Fastify persistente, banco reaproveitando o serviço Aiven já existente com `finanhouse_dev`/`finanhouse_prod` como bancos lógicos separados), sem provisionar nenhum recurso real.

A validação revelou um bloqueador real e mais grave do que os já corrigidos no Bloco 01: `loadLocalEnv()` sempre tentava ler `apps/api/.env.local` e encerrava o processo (`process.exit(1)`) se o arquivo não existisse, **em qualquer modo de execução, inclusive produção**. Num deploy real no Render, esse arquivo nunca existe — a plataforma injeta as variáveis de ambiente diretamente em `process.env`. Sem esta correção, a API travaria no primeiro segundo de execução no Render, mesmo com todas as demais variáveis (`HTTP_HOST`, `CORS_ALLOWED_ORIGINS`, credenciais de banco) corretamente configuradas — um bloqueador que nem chegaria a expor os problemas já resolvidos no Bloco 01. Corrigido test-first, sem enfraquecer o comportamento de desenvolvimento local (ainda fatal, com mensagem clara, fora de produção).

Uma segunda lacuna real, menor mas igualmente reportável: nenhuma versão do Node estava declarada em lugar nenhum do repositório. `.node-version` foi criado (`24`, coerente com `@types/node`), testado, e passa a orientar qualquer plataforma de deploy (Render incluído) a usar a versão correta do runtime.

Toda a demais validação desta rodada foi confirmatória, não corretiva: a proteção `DATABASE_ENV=production`/`finanhouse_prod` (Sessão 12) já existia e continua intacta; a estrutura de build/start/health da API para o Render foi mapeada por inspeção real de `package.json`/`tsconfig.json`; a estratégia de proxy same-origin via Vercel foi revalidada sem encontrar nenhuma quebra de premissa; nenhuma URL fictícia de Render foi inventada em nenhum arquivo versionado.

Suíte final: API 704 (+5), Web 467 (inalterado), Domain 214 (inalterado), Total 1385 — sem regressão. **Classificações finais: `RENDER_READY_FOR_CONFIGURATION`, `AIVEN_READY_FOR_PRODUCTION_DATABASE`, `VERCEL_READY_FOR_CONFIGURATION`.** Nenhum commit, push ou merge foi realizado; nenhuma infraestrutura real foi tocada.

## 2. Objetivo do Bloco

Validar e preparar tecnicamente o HouseManager para a arquitetura de custo zero decidida pelo usuário (Vercel Free + Render Free Web Service + Aiven já existente), sem provisionar nenhuma infraestrutura real nesta rodada.

## 3. Escopo Implementado

Igual ao planejado, com uma correção real adicional descoberta durante a própria validação (não um desvio de escopo — o objetivo já previa "corrigir, test-first, qualquer lacuna real encontrada"):

- Estrutura da API mapeada para Render Free (root, build, start, health, Node version).
- Correção test-first de `loadLocalEnv()` para tolerar `.env.local` ausente em produção.
- Criação e teste de `.node-version`.
- Confirmação (sem alteração) da proteção `DATABASE_ENV`/`finanhouse_prod`.
- Documentação de Vercel/Render/GitHub/migrations/bootstrap/backup/ordem de deploy.
- Revalidação da estratégia de cookie/CORS/same-origin com a topologia real Vercel+Render.

## 4. Arquivos Criados

- `.node-version` (raiz do repositório).
- `apps/api/src/node-version.test.ts`.
- Este feedback, o bloco e o prompt do Bloco 02.

## 5. Arquivos Alterados

- `apps/api/src/http/server.ts` — `loadLocalEnv(runtimeMode)` agora recebe o modo de execução; ausência do arquivo só é fatal fora de produção. `resolveRuntimeMode()` movido para antes de `loadLocalEnv()`.
- `apps/api/src/http/server.test.ts` — +2 testes (development: ausência continua fatal; production: ausência não é fatal, escuta normalmente com env vars da "plataforma").

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npm install (worktree novo)
npm run build:domain
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test (por workspace)
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
npx vitest run <arquivos individuais, durante o desenvolvimento test-first>
sha256sum (verificação de integridade do scaffold do Bloco 02 copiado entre worktrees)
```

## 8. Testes Realizados

- **`server.test.ts`** (+2, test-first — o segundo confirmado falhando antes da correção): "development: .env.local ausente continua fatal, com mensagem clara"; "production: .env.local ausente NÃO é fatal — a plataforma já injetou as variáveis diretamente em process.env" (falhou contra o código original com `process.exit(1)` inesperado, passou após a correção).
- **`node-version.test.ts`** (novo, test-first — os 3 confirmados falhando antes da criação do arquivo): arquivo existe; é um número de major válido (sem `v`/sufixo); é coerente com a major declarada em `@types/node` de `apps/api/package.json`.
- Toda a suíte pré-existente (699 testes da API, 467 Web, 214 Domain) revalidada sem alteração de expectativa — nenhum teste anterior tocado além dos 2 novos em `server.test.ts`.

## 9. Validações Executadas

- `npm run build` — OK.
- `npm run verify:runtime` — OK.
- `npm run lint` — OK.
- `npm run typecheck` — OK.
- `npm run typecheck:api-scripts` — OK.
- `npm run test` — OK: **API 704/704** (699 + 5 novos), **Web 467/467**, **Domain 214/214**. Nenhuma suíte encolheu.
- `npx drizzle-kit check` — "Everything's fine" — nenhuma migration tocada.
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — Status OK, 0 errors, 0 pendências P1/P2, 9 warnings nesta execução (8 estruturais já conhecidos + "Bloco 02 sem feedback correspondente", que desaparece assim que este arquivo for detectado).

Revisão de segurança: nenhuma credencial real tocada; `.node-version` contém só um número; nenhum valor sensível em nenhum arquivo novo/alterado. Nenhum acesso ao Aiven; nenhum Render/Vercel/GitHub conectado; nenhuma migration; nenhum dado real.

## 10. Decisões Técnicas

- **Corrigir `loadLocalEnv` em vez de apenas documentar o problema:** a instrução desta rodada previa corrigir, test-first, qualquer lacuna real encontrada durante a validação — este é exatamente esse caso, não uma expansão de escopo para uma feature nova. Sem a correção, as classificações `RENDER_READY_FOR_CONFIGURATION` seriam falsas (o código continuaria travando no Render independentemente de qualquer configuração externa correta).
- **Fatal preservado fora de produção:** um `.env.local` ausente em desenvolvimento local continua sendo, na esmagadora maioria dos casos, um esquecimento real do desenvolvedor — a mensagem clara existente tem valor e foi mantida integralmente, não removida.
- **`.node-version` em vez de `engines.node` no `package.json`:** formato mais amplamente reconhecido entre plataformas (Render, nvm, Vercel), sem introduzir a fricção adicional que `engines.node` pode causar em instalações não estritamente compatíveis.
- **Não inventar a URL do Render:** documentar o formato exato do rewrite (seção 22 do bloco) em vez de escrever um placeholder em `vercel.json` — evita uma configuração versionada que pareceria pronta para produção sem estar, e evita confundir uma futura leitura do arquivo.
- **`DATABASE_CA_CERT_BASE64` recomendado para Render, sem alterar código:** o mecanismo já existe desde antes desta sessão exatamente para esse cenário (plataforma sem sistema de arquivos persistente confiável) — apenas documentado como a escolha correta, não implementado de novo.

Nenhuma decisão acima introduz dependência nova; nenhuma foi registrada em `Docs/04_governance/registro_decisoes.md` por não alterar contrato de domínio.

## 11. Problemas Encontrados

- **Real e corrigido:** `loadLocalEnv()` fatal incondicional — bloquearia qualquer deploy real no Render independentemente de qualquer outra configuração.
- **Real e corrigido:** ausência de `.node-version`/qualquer declaração de versão do Node no repositório.
- Nenhum outro problema encontrado na validação de Render/Aiven/Vercel/migrations/bootstrap — todos os demais itens já estavam corretos (confirmados por inspeção, não por suposição).

## 12. Correções Aplicadas Durante o Bloco

- `loadLocalEnv()`/`server.ts` — ver seção 9.
- `.node-version` criado.
- Nenhuma correção de código além dessas duas — nenhuma iteração adicional foi necessária, cada teste passou na primeira execução após a implementação correspondente.

## 13. Pendências

### P1 — Crítica

_Nenhuma._

### P2 — Importante

_Nenhuma._

### P3 — Melhoria Recomendada

_Nenhuma nova identificada nesta rodada._

### P4 — Opcional / Ação Manual (próxima rodada, infraestrutura real)

_Criar `finanhouse_prod` no serviço Aiven já existente — não provisionado nesta rodada._

_Confirmar backup/retenção do plano Aiven atual no painel do provedor — não documentado no repositório, não presumido._

_Criar o Render Web Service, configurar as env vars reais (`HTTP_HOST=0.0.0.0`, `CORS_ALLOWED_ORIGINS` com a origem real da Vercel, credenciais do Aiven) — não criado nesta rodada._

_Aplicar as 5 migrations existentes em `finanhouse_prod` — não aplicado nesta rodada._

_Obter a URL pública real do Render e adicionar o rewrite `/api/*` em `apps/web/vercel.json` (formato documentado na seção 22 do bloco) — não configurado, por depender de uma URL que só existe após o provisionamento real._

_Conectar GitHub → Render e GitHub → Vercel — não conectado nesta rodada._

_Bootstrap controlado (`db:bootstrap:household` + `db:configure:initial-passwords`) — não executado, depende do banco `finanhouse_prod` existir._

_Cold start/hibernação do Render Free — aceito conscientemente pelo usuário, registrado como característica conhecida do plano gratuito, nunca tratado como bloqueador._

## 14. Riscos Restantes

Nenhum risco técnico novo além dos já conscientemente aceitos pelo usuário (cold start do Render Free; mesmo serviço Aiven para dev/prod, mitigado pela proteção de nome de banco já existente). O achado desta rodada (`.env.local`) representava o maior risco real remanescente para o próximo deploy — resolvido.

## 15. Evidências

Contagem de testes por arquivo (novos/alterados nesta rodada):
- `server.test.ts`: 11 no arquivo (9 do Bloco 01 + 2 novos)
- `node-version.test.ts`: 3 (novo)

Totais por workspace:
- API: 704/704 passando (699 + 5 novos).
- Web: 467/467 passando (inalterado).
- Domain: 214/214 passando (inalterado).
- Total do monorepo: **1385** (1380 + 5).

`npx drizzle-kit check`: `Everything's fine 🐶🔥`.
`npx ddae-engine validate`: `Status: OK / Warnings: 0 / Errors: 0`.
`npx ddae-engine audit`: `Status: OK / Errors: 0 / Pendências P1/P2: Nenhuma pendência P1/P2 encontrada.` (9 warnings nesta execução — 8 estruturais + "Bloco 02 sem feedback", ver seção 9).

**`RENDER_READY_FOR_CONFIGURATION`** · **`AIVEN_READY_FOR_PRODUCTION_DATABASE`** · **`VERCEL_READY_FOR_CONFIGURATION`**.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

Tecnicamente concluído. Nenhuma pendência P1/P2/P3 — só P4/ações de infraestrutura real, todas explicitamente fora do escopo desta rodada por decisão do usuário. **Aguardando nova aprovação humana explícita antes de qualquer commit/push/merge.**

## 17. Próximo Bloco Recomendado

A execução operacional real do deploy (seção 24 do bloco): criar `finanhouse_prod`, criar o Render Web Service, aplicar migrations, obter a URL real, configurar o proxy da Vercel, conectar GitHub às duas plataformas, bootstrap controlado, smoke funcional real.

## 18. Commit Semântico Sugerido

```
fix(http): tolerar ausencia de .env.local em producao e declarar versao do node
```

_Aguardando aprovação explícita do usuário antes de `git add`/`commit`/`push`/`merge` — nenhuma ação de versionamento foi executada nesta rodada._
