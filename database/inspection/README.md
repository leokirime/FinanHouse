# database/inspection

Scripts futuros de inspeção **somente leitura** do MySQL existente na Clever Cloud: testar conectividade, identificar a versão do MySQL, listar schemas/tabelas/colunas/tipos, identificar chaves/índices/relacionamentos, e verificar (sem expor conteúdo sensível) se existem registros.

Regras:
- Nenhuma credencial deve ser armazenada aqui.
- Nenhum script destrutivo (`DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT`, `CREATE TABLE`) é permitido nesta pasta.
- O resultado da inspeção alimenta `database/current-schema/`.

Status: vazio — nenhuma inspeção foi executada ainda; nenhuma conexão com o banco real foi feita nesta sessão.
