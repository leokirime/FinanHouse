# database/migrations

Mudanças **incrementais futuras** sobre o banco MySQL do Finanhouse, que já existe na Clever Cloud.

Regras:
- Nenhuma migration inicial deve presumir banco vazio.
- Nenhuma migration deve ser criada ou aplicada antes do inventário completo do banco existente (`database/inspection/` → `database/current-schema/`).
- Após o inventário, decide-se se o schema existente é reaproveitado integralmente, adaptado por migrations incrementais, ou substituído por migração controlada.

Status: vazio. Nenhuma migration foi criada ou aplicada nesta sessão.
