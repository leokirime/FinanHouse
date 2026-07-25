# apps/api/src/infrastructure

Implementações concretas das portas definidas em `apps/api/src/application/ports/`.

- `repositories/memory/` — repositórios **em memória**, exclusivos para desenvolvimento e testes. Determinísticos, resetáveis (`reset()`), sem banco de dados, sem arquivos, sem credenciais.

Repositórios reais (`Drizzle*Repository`, usando `apps/api/src/db/schema/`) ainda não existem — ficam bloqueados até a resolução de TLS (ver `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md`) e a aplicação da migration inicial.
