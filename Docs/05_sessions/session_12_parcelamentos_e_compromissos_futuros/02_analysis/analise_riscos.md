# Análise de Riscos

> Projeto: FinanHouse · Atualizado em: 2026-08-19

> Riscos identificados aqui que sobrevivem ao fim da sessão devem ser promovidos para `Docs/04_governance/matriz_riscos.md` — não fiquem só aqui, esquecidos.

## 1. Riscos Identificados

| ID | Risco | Probabilidade | Impacto | Área |
|---|---|---|---|---|
| RS-01 | Falha parcial na geração em lote de N parcelas (ex.: parcela 6/10 falha por erro de conexão) deixa o plano num estado inconsistente — algumas parcelas existem, outras não, sem transação cross-repository para reverter | Baixa | Médio | Técnico |
| RS-02 | Arredondamento incorreto faz a soma das parcelas divergir do valor total, quebrando a confiança do usuário no sistema | Baixa (mitigado por teste de invariante, ver análise técnica) | Alto | Produto |
| RS-03 | Repetir o padrão vulnerável de geração de id (`nextId()` + `save()` insere-ou-atualiza, dívida P2 de DT-15) numa tabela nova, sob a pressão de "seguir o padrão existente" | Média (é o caminho de menor resistência ao copiar `category_budgets`) | Médio | Técnico |
| RS-04 | Escopo crescer para incluir edição de parcelamento já criado, recorrência genérica, ou notificações — nenhum desses foi pedido explicitamente | Média | Médio | Prazo |

## 2. Detalhamento

### RS-01 — Falha parcial na geração em lote
- **Descrição:** `CreateInstallmentPlanService` cria o plano e N parcelas em chamadas sequenciais aos repositórios existentes, sem uma transação de banco única cobrindo tudo (limitação já aceita pelo resto da aplicação — nenhum serviço hoje usa transação cross-repository).
- **Gatilho:** falha de conexão/timeout no meio da criação da parcela 6 de 10.
- **Plano de mitigação:** decisão formal **obrigatória** no Bloco 04, com preferência explícita por uma solução atômica caso a arquitetura de persistência permita (ex.: `db.transaction(...)` do Drizzle cobrindo a criação do plano + todas as parcelas numa única transação real, mesmo padrão já usado pelos scripts de smoke-test transacional) — só se optar por uma alternativa não atômica (ex.: compensação em código de aplicação revertendo as parcelas já criadas antes de propagar o erro) caso a atômica se mostre inviável, com justificativa registrada. **Não é aceitável, como solução final, simplesmente deixar o parcelamento gravado pela metade sem nenhuma forma de detecção/correção** — essa opção está descartada, não é uma alternativa válida a escolher no Bloco 04, apenas um estado a ser sempre evitado ou corrigido.
- **Responsável:** a definir no Bloco 04.
- **Status:** **RESOLVIDA em 2026-08-25** (Bloco 04, DT-19) — a solução atômica preferida se mostrou viável: `DrizzleInstallmentTransactionRunner` usa exatamente `db.transaction()` (o mesmo padrão já citado aqui como preferência), cobrindo a criação do plano + todas as parcelas + eventuais competências numa única transação real. Nenhuma compensação em código de aplicação foi necessária. Comprovado por teste com rollback real (`InMemoryInstallmentTransactionRunner`, snapshot/restore) nos 6 pontos de falha previstos (plano, parcela 1, parcela intermediária, última parcela, competência, categoria de outro household).

### RS-02 — Arredondamento incorreto
- **Descrição:** ver `02_analysis/analise_tecnica.md`, `splitMoney`.
- **Gatilho:** implementação da divisão sem cobrir o caso de resto não-zero.
- **Plano de mitigação:** teste de invariante obrigatório (`sumMoney(splitMoney(total, n)) === total`) para uma faixa ampla de `total`/`n`, incluindo casos conhecidos como R$ 1.000/3 e R$ 3.000/10 — exigido no Bloco 02 antes de qualquer outro código depender de `splitMoney`.
- **Responsável:** Bloco 02 (domínio).

### RS-03 — Repetir o padrão vulnerável de geração de id
- **Descrição:** ver `02_analysis/analise_arquitetural.md`, seção 2 — `installment_plans` é a primeira tabela nova desde a lição de DT-15/DT-16.
- **Gatilho:** copiar `DrizzleCategoryBudgetRepository` como template sem ajustar o método de geração de id.
- **Plano de mitigação:** decisão já registrada nesta sessão (`analise_arquitetural.md`) — `InstallmentPlanRepository.create()` usa `ResultSetHeader.insertId` desde o primeiro commit, nunca `nextId()`. Revisão explícita no Bloco 03 antes de considerar o repositório pronto.
- **Responsável:** Bloco 03 (persistência).

### RS-04 — Escopo crescer além do pedido
- **Descrição:** a "direção" descrita pelo proprietário do projeto é deliberadamente restrita (gerar parcelas reais, cada uma independente); recorrência genérica (`recurrence_rules`) é uma extensão futura *distinta*, não parte deste requisito.
- **Gatilho:** confundir "compromissos futuros" no nome da sessão com recorrência automática (assinaturas sem parcela final).
- **Plano de mitigação:** `RF-10` (registrado nesta sessão) e o Bloco 01 fixam o escopo por escrito antes de qualquer código — qualquer pedido de recorrência genérica deve virar uma sessão própria, não ser absorvido aqui.
- **Responsável:** Bloco 01 (este bloco, ao fechar escopo).

## 3. Perguntas Orientadoras

- **Algum destes riscos é estrutural (deveria estar na matriz de riscos do projeto)?** RS-03 é um caso específico de um risco estrutural já registrado em DT-15 (dívida técnica de geração de id em três repositórios existentes) — não duplicado aqui, apenas referenciado.
- **Existe risco que bloquearia toda a sessão?** Não identificado — todos os quatro riscos têm mitigação viável dentro do próprio plano de blocos, sem exigir replanejamento da sessão inteira.

## 4. Decisões Pendentes

RS-01 (estratégia de compensação para falha parcial) — decisão adiada explicitamente para o Bloco 04, não bloqueia o início do Bloco 02.
