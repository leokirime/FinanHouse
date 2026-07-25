# Solicitação de Suporte — TLS Validado para Conexão Externa (Clever Cloud MySQL)

> Gerado no Bloco 04 (`bloco_04_validacao_tls_e_revisao_pre_migration`) · 2026-07-25 · Texto sanitizado, sem host, usuário, senha, nome de banco ou string de conexão.

## Como usar

Este é um **texto para o proprietário enviar manualmente** pelo Ticket Center da Clever Cloud. Nenhum agente de IA deve enviá-lo automaticamente, nem preencher identificadores privados nele. Copie o conteúdo abaixo (ou adapte) para o formulário de suporte.

## Assunto

Configuração TLS validada para conexão externa Node.js com MySQL

## Mensagem

```text
Olá,

Estou desenvolvendo uma aplicação Node.js que será hospedada externamente à Clever Cloud, inicialmente com previsão de deploy na Vercel, e utilizará um add-on MySQL da Clever Cloud.

A conexão utiliza mysql2 e as credenciais padrão fornecidas pelo add-on.

Resultados do diagnóstico:

- conexão sem TLS: bem-sucedida;
- conexão solicitando TLS com validação do certificado desabilitada: bem-sucedida;
- protocolo negociado: TLSv1.3;
- conexão com validação padrão do certificado habilitada: falha com HANDSHAKE_SSL_ERROR.

Nenhuma credencial ou hostname está sendo enviado nesta mensagem.

Preciso confirmar a configuração oficialmente suportada para uma aplicação externa:

1. Qual CA ou cadeia de certificados deve ser utilizada para validar o certificado do MySQL?
2. Existe um arquivo CA oficial para download?
3. Qual hostname deve ser utilizado para que a validação do certificado funcione?
4. O hostname padrão do add-on, o proxy ou o direct host deve ser utilizado?
5. Existe exigência específica de SNI?
6. A conexão TLS externa com verificação completa é suportada no plano atual?
7. Qual configuração é recomendada para Node.js/mysql2 com rejectUnauthorized:true?
8. A geração de direct hostname e port altera a cadeia ou o hostname do certificado?

Posso fornecer o identificador do add-on pelo Ticket Center, se necessário. Não enviarei senha ou string de conexão.

Obrigado.
```

## Regras seguidas na elaboração deste texto

- Não inclui host, usuário, nome do banco, senha ou URL de conexão.
- Não inclui identificadores privados do add-on (o proprietário pode fornecê-los separadamente, diretamente no canal oficial de suporte, se solicitado).
- Envio é manual, feito pelo proprietário — nenhum agente de IA envia este texto automaticamente.

## Status

Documento preparado. **Não enviado ainda** — depende de ação manual do proprietário.
