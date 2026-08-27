# Regras da DDAE Engine

> Projeto: HouseManager · Atualizado em: 2026-07-25

## 1. Regras Obrigatórias

1. Nenhuma implementação começa sem um bloco correspondente em `Docs/05_sessions/<sessao>/05_blocks/`.
2. Nenhuma feature é implementada sem requisito correspondente em `Docs/01_product/requisitos_funcionais.md`. Se não existe, pare e atualize o requisito primeiro (ou peça para o usuário fazê-lo).
3. Toda decisão técnica cara de reverter é registrada em `Docs/04_governance/registro_decisoes.md` antes (ou no mesmo momento) de ser implementada.
4. Nenhuma decisão arquitetural registrada em `Docs/02_architecture/decisoes_tecnicas.md` é contradita silenciosamente — se uma decisão precisa mudar, registre uma nova decisão que supersede a anterior.
5. Todo bloco termina com feedback (`ddae-engine feedback create`) preenchido — não apenas gerado.
6. Nenhum commit é feito sem confirmação explícita do usuário, mesmo quando um commit semântico é sugerido no feedback ou no prompt.
7. Pendências encontradas durante a execução são registradas com prioridade P1/P2/P3/P4 (ver `Docs/00_ddae_engine/metodologia.md`, seção 12) — nunca descritas apenas em prosa livre sem classificação.
8. Nomes de arquivos e pastas gerados pela DDAE Engine usam `snake_case`, sem acentos e sem espaços. Use `ddae-engine validate` para checar isso automaticamente.
9. Arquivos e estrutura existentes não são sobrescritos sem `--force` explícito.
10. Contratos técnicos (`Docs/03_contracts/`) e o design system (`Docs/07_design_system/`) são respeitados por padrão; alterá-los é uma decisão registrada, não um efeito colateral de uma tarefa não relacionada.
11. Quality gates (`Docs/06_quality_gates/`) relevantes para o tipo de mudança são verificados antes de considerar um bloco fechado.
12. Escopo não se expande silenciosamente: se uma tarefa parece exigir mais do que o bloco descreve, isso é reportado antes de ser implementado, não decidido unilateralmente.

## 2. Boas Práticas

- Mantenha blocos pequenos o suficiente para serem revisados em uma sessão — se um bloco está difícil de descrever em um parágrafo de objetivo, considere dividi-lo.
- Prefira registrar uma pendência P3/P4 a deixar uma melhoria sem registro nenhum; isso preserva o histórico de intenção mesmo quando a melhoria não é feita agora.
- Atualize a documentação no mesmo bloco em que o comportamento que ela descreve muda — não em um bloco futuro "de organização".
- Use `ddae-engine audit` periodicamente, não apenas ao fechar uma sessão, para flagrar blocos sem prompt/feedback correspondente o mais cedo possível.
- Escreva critérios de aceite verificáveis (algo que se possa marcar como feito/não feito), não aspiracionais.

## 3. Anti-padrões

- **Implementar primeiro, documentar depois "se der tempo".** Na DDAE Engine a ordem é inversa: o documento existe antes da implementação justamente para definir o que vai ser construído.
- **Commit automático "porque o usuário provavelmente aprovaria".** Aprovação é por escopo de pedido, não permanente — sempre confirme.
- **Pendências sem prioridade.** "Tem uma coisa para melhorar aqui" não é uma pendência rastreável; classifique como P1–P4.
- **Sessões ou blocos "fantasmas".** Um bloco sem prompt ou sem feedback correspondente (detectável via `ddae-engine audit`) indica trabalho que começou mas não foi encerrado corretamente.
- **Decisão técnica implícita no diff.** Se a mudança de código depende de uma decisão (ex.: trocar de biblioteca de autenticação), a decisão deve existir em `Docs/04_governance/registro_decisoes.md` — não apenas no commit message.
- **Sobrescrever sem `--force`.** Se um comando da DDAE Engine reporta "already exists", isso é um sinal para revisar o conteúdo existente antes de decidir sobrescrever, não para adicionar `--force` por reflexo.
