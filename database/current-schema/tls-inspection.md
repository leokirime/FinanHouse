# Inspeção de TLS/SSL — MySQL Clever Cloud

> Gerado no Bloco 04 (`bloco_04_validacao_tls_e_revisao_pre_migration`) · Atualizado em 2026-07-25 após revisão do proprietário · Nenhuma credencial, host, porta, usuário, senha ou nome real do banco é registrado aqui.

## 1. Fatos observados (comprovados pelos testes)

| Cenário testado | Resultado | Detalhe sanitizado |
|---|---|---|
| Configuração atual (`DATABASE_SSL=false` em `apps/api/.env.local`) | Conecta, **sem TLS** | `Ssl_cipher` vazio na sessão |
| TLS solicitado, sem validação de certificado (`ssl: { rejectUnauthorized: false }`) | Conecta **com TLS** | `TLSv1.3`, cifra `TLS_AES_256_GCM_SHA384` |
| TLS solicitado, com validação padrão de certificado (`ssl: {}`, `rejectUnauthorized` implícito `true`) | **Falha** | `HANDSHAKE_SSL_ERROR` |

Esses três resultados são fatos observados diretamente — nada além deles foi comprovado pelos testes executados.

## 2. O que os fatos comprovam

- O MySQL da Clever Cloud **suporta TLS 1.3** com cifra forte quando o cliente solicita TLS explicitamente.
- A configuração atual do projeto (`DATABASE_SSL=false`) **não solicita TLS**, então a conexão usada nos Blocos 02 e 03 (inspeção de metadados, geração de migration) trafegou sem criptografia. Nenhum dado sensível foi lido nessas sessões (apenas metadados estruturais), mas isso não deve se repetir com dados reais.
- A conexão com validação estrita de certificado (`rejectUnauthorized: true`, o padrão do Node.js) **falhou com `HANDSHAKE_SSL_ERROR`**.

## 3. O que os fatos NÃO comprovam (hipótese, não conclusão)

A causa raiz do `HANDSHAKE_SSL_ERROR` **ainda não foi confirmada**. A formulação anterior deste documento ("CA da Clever Cloud fora da cadeia de confiança padrão do Node.js") era uma conclusão forte demais para o que os testes efetivamente mostraram. A causa pode envolver, isoladamente ou em combinação:

- a cadeia de certificação (CA) usada pelo servidor não ser publicamente confiável;
- divergência entre o hostname usado na conexão e o hostname presente no certificado;
- ausência ou configuração incorreta de SNI (Server Name Indication) na negociação TLS;
- o endpoint específico utilizado (proxy vs. host direto) ter características de certificado diferentes;
- alguma outra particularidade da configuração TLS do provedor.

Nenhuma dessas hipóteses foi testada isoladamente neste bloco — distinguir entre elas exige informação que só a Clever Cloud pode fornecer (ver `clever-cloud-tls-support-request.md`).

## 4. Decisão de segurança (registrada, obrigatória)

- `rejectUnauthorized: false` **não será aceito como configuração final de produção** — criptografa o transporte, mas não valida a identidade do servidor (não protege contra um intermediário ativo se passando pelo banco).
- A migration **não será aplicada** por uma conexão sem TLS.
- A migration **não será aplicada** por uma conexão TLS sem validação do servidor.
- A configuração final deverá validar corretamente o certificado (`rejectUnauthorized: true`, com ou sem CA customizada conforme a resposta oficial da Clever Cloud).
- Qualquer exceção a esta regra exigiria decisão formal e explícita do proprietário — e não é recomendada.

## 5. Alternativas técnicas (nenhuma aplicada)

1. **CA oficial da Clever Cloud**, se fornecida pelo suporte: `ssl: { ca: <CA_OFICIAL>, rejectUnauthorized: true }` — validação completa, opção preferida.
2. **`rejectUnauthorized: false`** — tecnicamente funcional, mas **rejeitada como configuração de produção** pela decisão de segurança acima. Mantida documentada apenas como referência histórica do teste, não como opção viável.

Nenhuma alternativa foi aplicada à configuração do projeto neste bloco — `apps/api/.env.local` e `apps/api/drizzle.config.ts` não foram alterados.

## 6. Configuração futura (proposta, não aprovada)

Depois da resposta oficial da Clever Cloud, a configuração final poderá usar variáveis de ambiente adicionais. **Nenhuma delas está aprovada ou implementada ainda** — nenhum valor real foi adicionado a `.env.example` ou `.env.local`, nenhum certificado foi criado ou versionado.

Variável já existente:
```
DATABASE_SSL=true
```

Variáveis que poderão ser necessárias, a depender da resposta do suporte (ainda não adicionadas a nenhum arquivo do projeto):
```
DATABASE_SSL_CA_PATH=
DATABASE_SSL_SERVERNAME=
```

Regras enquanto a resposta não chega:
- Não adicionar valores reais a essas variáveis.
- Não criar certificado fictício ou de teste para simular a CA.
- Não versionar arquivos locais de certificado no repositório.
- Não armazenar conteúdo de certificado diretamente em `.env` sem necessidade comprovada (se `DATABASE_SSL_CA_PATH` for adotado, ele aponta para um arquivo local fora do controle de versão, não para o conteúdo do certificado inline).

Depois da resposta do suporte, a decisão será entre: CA fornecida em arquivo; CA fornecida por variável protegida; hostname alternativo (proxy vs. direct host); `servername`/SNI explícito; ou configuração oficial diferente das listadas aqui.

## 7. Próximo passo

Solicitação **preparada** para o suporte oficial da Clever Cloud (texto sanitizado em `database/current-schema/clever-cloud-tls-support-request.md`) — **envio manual pendente**, a ser feito pelo proprietário via Ticket Center.

## 8. Pendência

Registrada como **P2** no feedback do Bloco 04: validação TLS estrita (`rejectUnauthorized: true`) ainda não concluída com sucesso; causa do `HANDSHAKE_SSL_ERROR` não confirmada; resposta oficial da Clever Cloud pendente; aplicação da migration permanece bloqueada até resolução.
