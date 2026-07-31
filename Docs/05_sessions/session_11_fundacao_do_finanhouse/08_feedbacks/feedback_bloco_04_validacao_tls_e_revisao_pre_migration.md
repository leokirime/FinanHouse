# Feedback — Bloco 04: Validação TLS e revisão pré-migration

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

O Bloco 03 foi mesclado à `main` (merge `a73b610`) e enviado ao remoto. Este bloco testou a conexão real com o MySQL da Clever Cloud quanto a TLS: com a configuração atual (`DATABASE_SSL=false`), a sessão **não usa TLS**. Um teste suplementar (sem alterar `.env.local`) confirmou que o servidor **suporta TLS 1.3** com cifra forte quando solicitado com `rejectUnauthorized: false`, mas a validação estrita de certificado (`rejectUnauthorized: true`, o padrão do Node) falha com `HANDSHAKE_SSL_ERROR`. **A causa raiz dessa falha ainda não foi confirmada** — pode envolver cadeia de CA, hostname do certificado, SNI, endpoint usado (proxy vs. host direto), ou outra particularidade do provedor; nenhuma hipótese isolada foi testada. A migration inicial foi revisada novamente e confirmada estruturalmente correta e compatível com MySQL 8.4.2. Um plano de aplicação e rollback foi documentado (não executado). Nenhuma tabela foi criada, nenhum dado inserido, nenhuma migration aplicada. Decisão de segurança registrada: `rejectUnauthorized: false` não será aceito como configuração final de produção — não há mais opção de "aceite de risco residual" para essa configuração. TLS com validação estrita registrado como pendência P2, bloqueando a aplicação da migration até resposta oficial da Clever Cloud (solicitação preparada em `database/current-schema/clever-cloud-tls-support-request.md`, envio manual pelo proprietário). Após revisão adicional do proprietário, os arquivos deste bloco foram movidos para a branch dedicada `feat/session-11-bloco-04-validacao-tls` (não deveriam ter sido criados enquanto a branch ativa era `main`).

## 2. Objetivo do Bloco

Confirmar que a conexão externa com o MySQL da Clever Cloud utiliza transporte seguro, realizar a revisão final da migration inicial e produzir evidências para uma futura decisão de aplicação, sem alterar o banco.

## 3. Escopo Implementado

- Merge da branch `feat/session-11-bloco-03-modelagem-dominio` na `main` (`a73b610`), com validações completas antes e depois, e push.
- Script de diagnóstico `database/inspection/test-tls.ts`: conexão única, somente leitura, sanitizada, reporta conectividade/versão/TLS ativo/protocolo/cifra sem expor credenciais.
- Execução do diagnóstico com a configuração atual (`DATABASE_SSL=false`): TLS **não ativo**.
- Teste suplementar (via `node --input-type=module -e`, não persistido em nenhum arquivo do projeto) solicitando TLS explicitamente: confirmado que o servidor aceita TLS 1.3, mas falha a validação padrão de certificado.
- Documentação sanitizada em `database/current-schema/tls-inspection.md` com os três cenários testados e as alternativas compatíveis com `mysql2` (CA oficial vs. `rejectUnauthorized: false`).
- Revisão estrutural da migration (`database/migrations/0000_initial_financial_domain.sql`): 6 `CREATE TABLE`, 11 `ALTER TABLE` (FKs), 7 `CREATE INDEX`, sem charset/collation hardcoded, sem sintaxe depreciada — compatível com MySQL 8.4.2.
- Plano de aplicação e rollback documentado em `database/proposed-schema/plano-aplicacao-rollback.md` — nenhum comando executado.

## 4. Arquivos Criados

- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_04_validacao_tls_e_revisao_pre_migration.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_04_validacao_tls_e_revisao_pre_migration.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md` (este arquivo)
- `database/inspection/test-tls.ts`
- `database/current-schema/tls-inspection.md`
- `database/proposed-schema/plano-aplicacao-rollback.md`

## 5. Arquivos Alterados

- `package.json` (raiz) — script `test:tls`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` — Bloco 04 registrado (a atualizar na seção 9)

## 6. Arquivos Removidos

_Nenhum arquivo removido neste bloco._

## 7. Comandos Executados

```
git switch main
git pull --ff-only origin main
git merge --no-ff feat/session-11-bloco-03-modelagem-dominio -m "merge: integrar modelagem inicial do domínio financeiro"
npm install
npm run build / lint / typecheck / test  (antes e depois do merge)
npx drizzle-kit check  (antes e depois do merge)
npx ddae-engine validate / audit  (antes e depois do merge)
git push origin main
npx ddae-engine block create "Validação TLS e revisão pré-migration" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_04_validacao_tls_e_revisao_pre_migration --session session_11_fundacao_do_finanhouse
git check-ignore -v apps/api/.env.local
npm run test:tls   (tsx database/inspection/test-tls.ts — configuração atual, DATABASE_SSL=false)
node --input-type=module -e "..."   (teste suplementar, TLS solicitado com rejectUnauthorized:false, depois com validação padrão)
npx ddae-engine feedback create --block bloco_04_validacao_tls_e_revisao_pre_migration --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- Manual: `npm run test:tls` com a configuração atual do projeto — conectividade bem-sucedida, `TLS ativo: não`, `Ssl_cipher` vazio. Nenhum valor de credencial exibido.
- Manual: teste suplementar solicitando TLS com `rejectUnauthorized: false` — conexão bem-sucedida com `TLSv1.3` / `TLS_AES_256_GCM_SHA384`.
- Manual: teste suplementar solicitando TLS com validação padrão de certificado (`ssl: {}`) — falhou com `HANDSHAKE_SSL_ERROR` (categoria sanitizada, sem detalhes do certificado ou do host).
- Manual: leitura completa da migration (`0000_initial_financial_domain.sql`) contra a checklist de compatibilidade/segurança da seção 7 do bloco original — todos os itens conferidos.
- Automatizado: suíte completa (`npm run test`) revalidada antes e depois do merge — sem alterações de código de aplicação neste bloco, apenas ferramentas de diagnóstico fora do build da API/web.

## 9. Validações Executadas

- Antes do merge (branch `feat/session-11-bloco-03-modelagem-dominio`): `npm run build`/`lint`/`typecheck`/`test` — OK; `npx drizzle-kit check` — "Everything's fine"; `ddae validate` — 0 erros; `ddae audit` — 0 erros, 8 warnings (7 gates + P2 do Bloco 03).
- Depois do merge (branch `main`): mesmas validações repetidas — mesmos resultados.
- Depois do Bloco 04 (ver seção 17 do relatório final apresentado ao usuário).

## 10. Decisões Técnicas

- **Teste de TLS via conexão suplementar não persistida** — para responder "o servidor suporta TLS?" sem alterar `apps/api/.env.local` (fora do escopo permitido tocar), o teste com `ssl: { rejectUnauthorized: false }`/`ssl: {}` foi feito via um script Node efêmero (`node --input-type=module -e`), nunca salvo no repositório, apenas para observação. O script permanente (`test-tls.ts`) reflete fielmente a configuração real do projeto (`DATABASE_SSL`), não um cenário hipotético; agora oferece modos explícitos `current`/`strict`/`custom-ca`/`insecure-diagnostic` (ver seção 3 do bloco).
- **`rejectUnauthorized: false` formalmente rejeitado como configuração de produção** — decisão de segurança do proprietário, registrada em `database/current-schema/tls-inspection.md` (seção 4). Não é mais tratado como "alternativa aceitável com risco residual" — é bloqueador até uma conexão com `rejectUnauthorized: true` funcionar (com ou sem CA customizada, a depender da resposta oficial da Clever Cloud).
- **Causa do `HANDSHAKE_SSL_ERROR` registrada como hipótese em aberto, não como conclusão** — corrigida a formulação anterior ("CA fora da cadeia de confiança") por não ter sido comprovada isoladamente pelos testes. Solicitação de suporte oficial preparada para obter a resposta definitiva.
- **Rollback documentado como referência, não como script executável automaticamente** — segue o mesmo princípio de "nunca migration/rollback sem autorização explícita" já aplicado à aplicação da migration.
- **Correção de branch** — os arquivos deste bloco foram criados com a branch ativa em `main`; movidos para `feat/session-11-bloco-04-validacao-tls` via `git switch -c` antes de qualquer commit, preservando todas as alterações.

## 11. Problemas Encontrados

- Validação estrita de certificado TLS falhou (`HANDSHAKE_SSL_ERROR`) — a causa raiz não foi confirmada (ver hipóteses na seção 3 de `tls-inspection.md`: CA, hostname, SNI, endpoint). Documentado como hipótese em aberto, não "corrigido" às pressas com `rejectUnauthorized: false` sem registrar o trade-off — e essa configuração foi formalmente rejeitada como opção de produção (ver Decisões Técnicas).
- Documentos do Bloco 04 foram inicialmente criados com a branch ativa em `main` (correção de processo, não de código) — movidos para `feat/session-11-bloco-04-validacao-tls` antes do commit, sem perda de nenhuma alteração.

## 12. Correções Aplicadas Durante o Bloco

_Nenhuma correção de código foi necessária — este bloco é primariamente de diagnóstico e documentação._

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

- `financial_entries.responsible_member_id` sem FK composta protegendo consistência com household — pendência registrada no Bloco 03, não resolvida aqui (fora de escopo). Única pendência P2 deste bloco ainda aberta — ver histórico abaixo para o item já encerrado.

### P3 — Melhoria Recomendada

- Considerar automatizar a obtenção/atualização de uma eventual CA fornecida pela Clever Cloud (se disponível via API/painel) em vez de processo manual, quando a integração com Vercel for implementada — condicionado à resposta oficial do suporte. **Nota (2026-07-31):** a Clever Cloud deixou de ser a infraestrutura ativa (DT-07); este item ficou sem objeto e não será retomado.

### P4 — Opcional

_Nenhuma pendência opcional identificada._

## Histórico de Pendências Encerradas

_Seção adicionada em 2026-07-31 durante a reconciliação documental pós-Bloco 12. O item abaixo estava registrado como pendência P2 aberta no momento em que este feedback foi originalmente escrito (2026-07-25); nenhum resultado é reescrito como se já fosse conhecido naquela data — apenas o encerramento é registrado agora, com a data real em que ocorreu._

- **Validação TLS estrita (`rejectUnauthorized: true`) não concluída com sucesso contra a Clever Cloud; causa do `HANDSHAKE_SSL_ERROR` nunca confirmada; resposta oficial da Clever Cloud nunca chegou** — esta era a "fonte única" da pendência de TLS/aplicação de migration citada também no feedback do Bloco 03. Em vez de aguardar indefinidamente uma resposta da Clever Cloud, o proprietário decidiu trocar de provedor: **Aiven for MySQL** substituiu a Clever Cloud na arquitetura ativa (Bloco 11, DT-07). TLS foi validado com sucesso contra o Aiven em **2026-07-30** (`db:check` real, `rejectUnauthorized: true`, verificação de hostname padrão). A migration inicial foi aplicada em **2026-07-31** (Bloco 12, DT-08), destravada por essa validação. Ambos os itens estão encerrados.

## 14. Riscos Restantes

- Enquanto a validação TLS estrita não funcionar, não há configuração de produção aprovada disponível — `DATABASE_SSL=false` (sem criptografia) e `rejectUnauthorized: false` (sem validação de identidade do servidor) estão ambos descartados para produção pela decisão de segurança registrada.
- O plano de rollback documentado assume banco vazio; se dados reais existirem no momento de uma eventual necessidade de rollback futuro, o plano precisará ser refeito — este documento não cobre esse cenário.
- A causa do `HANDSHAKE_SSL_ERROR` permanecer desconhecida pode adiar indefinidamente a aplicação da migration se o suporte da Clever Cloud demorar a responder — sem prazo definido neste bloco.

## 15. Evidências

```
$ npm run test:tls
Status das variáveis de ambiente (valores nunca são exibidos):
  DATABASE_HOST: configurado
  DATABASE_PORT: configurado
  DATABASE_NAME: configurado
  DATABASE_USER: configurado
  DATABASE_PASSWORD: configurado
  DATABASE_SSL: configurado

Configuração local DATABASE_SSL: false (TLS não solicitado pelo cliente)

Conectividade: sucesso
Versão do MySQL: 8.4.2-2
Banco configurado corresponde ao banco ativo: sim

TLS ativo nesta sessão: não
Protocolo: não identificado
Cifra: não identificada

AVISO: TLS não está ativo nesta sessão. Nenhuma correção automática será aplicada.

$ (teste suplementar — ssl: { rejectUnauthorized: false })
Conexão com TLS solicitado (rejectUnauthorized:false): sucesso
Ssl_cipher: TLS_AES_256_GCM_SHA384
Ssl_version: TLSv1.3

$ (teste suplementar — ssl: {} / validação padrão)
Conexão com TLS + validação padrão de certificado: falhou
Categoria do erro (sanitizado): HANDSHAKE_SSL_ERROR

$ npx drizzle-kit check
Everything's fine 🐶🔥
```

## 16. Resultado Final

- [ ] Bloco concluído conforme escopo
- [x] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Resposta oficial da Clever Cloud sobre a configuração TLS suportada para conexão externa, seguida da validação de uma conexão com `rejectUnauthorized: true` funcionando — somente então caberá o pedido de autorização específica para aplicar a migration inicial via `drizzle-kit migrate`. `rejectUnauthorized: false` não é mais uma alternativa em consideração.

## 18. Commit Semântico Sugerido

```
feat(validacao_tls_e_revisao_pre_migration): diagnosticar TLS da conexão MySQL e revisar migration antes da aplicação
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
