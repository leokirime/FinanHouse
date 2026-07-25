# Quality Gate — Security

> Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Garantir que nenhuma mudança introduza vulnerabilidade, exposição de dados sensíveis ou falha de autenticação/autorização.

## 2. Quando Aplicar

- Bloco toca autenticação, autorização, sessões ou tokens.
- Bloco processa ou armazena dados sensíveis (pessoais, financeiros, credenciais).
- Bloco adiciona ou expõe um novo endpoint/rota.
- Bloco adiciona dependência externa nova.
- Bloco altera logging em qualquer parte do sistema.

## 3. Checklist Obrigatório

- [ ] Variáveis sensíveis: nenhum segredo (senha, chave, token) está hardcoded ou commitado — ver `Docs/03_contracts/contrato_variaveis_ambiente.md`.
- [ ] Autenticação: todo endpoint que deveria exigir autenticação, exige.
- [ ] Autorização: toda ação restrita verifica permissão, não apenas identidade.
- [ ] Exposição de dados: respostas de API não retornam campos sensíveis além do necessário.
- [ ] Logs com dados sensíveis: nenhum log contém senha, token completo ou dado pessoal sensível em texto plano.
- [ ] Validação de entrada: toda entrada de usuário é validada/sanitizada antes de uso (proteção contra injeção, XSS, etc.).
- [ ] Dependências: dependências novas foram checadas quanto a vulnerabilidades conhecidas.
- [ ] Risco de vazamento: mensagens de erro não expõem detalhes internos (stack trace, query, caminho de arquivo) a usuários finais.

## 4. Critérios Mínimos de Aprovação

- Nenhum item do checklist com falha conhecida e não tratada.
- Nenhuma pendência de segurança classificada como P1 aberta.

## 5. Evidências Esperadas

- Resultado de teste manual ou automatizado dos endpoints/fluxos afetados.
- Confirmação de revisão de logs gerados durante o teste.

## 6. Riscos Verificados

- Escalonamento de privilégio.
- Exposição de dados de outros usuários (vazamento horizontal).
- Injeção (SQL, comando, XSS).

## 7. Falhas Bloqueantes

- Segredo exposto em código, log ou resposta de API.
- Endpoint sensível acessível sem autenticação/autorização.

## 8. Ações Corretivas

- Revogar/rotacionar qualquer segredo exposto imediatamente.
- Corrigir verificação de autenticação/autorização antes de qualquer outra alteração no bloco.

## 9. Status

- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado
- [ ] Bloqueado

## 10. Responsável pela Validação

_Quem executou esta validação — pessoa humana ou agente de IA, e sob supervisão de quem._

**Responsável:** A definir

## 11. Data da Validação

**Data:** A definir

## 12. Observações

_Contexto adicional relevante para quem ler este gate depois: exceções aceitas, ressalvas, links para evidências externas. Se nenhuma, escreva "Nenhuma observação adicional"._

**Observações:** A definir
