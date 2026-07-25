# Contrato de Variáveis de Ambiente

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Nenhum valor real de segredo (chave de API, senha, connection string) deve aparecer neste arquivo — apenas nome, propósito e formato esperado.

## 1. Objetivo

Garantir que qualquer pessoa ou agente consiga configurar o ambiente corretamente sem precisar adivinhar variáveis.

## 2. Responsabilidade

Quem define o valor de cada variável em cada ambiente (desenvolvedor local, CI, infraestrutura de produção) e onde isso é armazenado (`.env`, secret manager, etc.).

_..._

## 3. Variáveis Obrigatórias

| Nome | Propósito | Formato esperado | Exemplo (sem valor real) |
|---|---|---|---|
| _..._ | _..._ | _..._ | _..._ |

## 4. Variáveis Opcionais

| Nome | Propósito | Valor padrão se omitida |
|---|---|---|
| _..._ | _..._ | _..._ |

## 5. Inputs

Onde essas variáveis são lidas pela aplicação (arquivo de config, `process.env` direto, biblioteca de validação de schema).

_..._

## 6. Regras Obrigatórias

- [ ] Nenhum segredo real é commitado no repositório, em nenhum arquivo (incluindo exemplos).
- [ ] Toda variável obrigatória ausente falha a inicialização da aplicação de forma explícita, não silenciosa.
- [ ] `.env.example` (ou equivalente) é mantido atualizado sempre que uma variável é adicionada ou removida.

## 7. Erros Esperados

O que acontece quando uma variável obrigatória está ausente, vazia, ou em formato inválido — a aplicação deve falhar rápido e com mensagem clara.

_..._

## 8. Validações

Como verificar localmente que todas as variáveis necessárias estão configuradas antes de rodar a aplicação.

_..._

## 9. Versionamento do Contrato

Como uma nova variável obrigatória é comunicada a todos os ambientes antes do deploy que passa a exigi-la.

_..._

## 10. Decisões Pendentes

_..._
