# Implantação na Netlify — Galeteria RC

Este roteiro prepara a publicação comercial na Netlify sem colocar a loja em operação antes da conferência dos dados reais.

## Arquitetura preparada

- A aplicação Vinext é compilada para o preset Netlify por meio do Nitro.
- `netlify.toml` define o comando de build e a pasta de publicação.
- O adaptador em `db/netlify-d1.ts` mantém a interface de banco usada pela aplicação sobre o PostgreSQL do Netlify Database.
- `netlify/database/migrations/0001_baseline/migration.sql` cria a estrutura inicial no PostgreSQL.
- O ambiente Cloudflare D1 permanece disponível para desenvolvimento local e transição.

O sistema registra apenas o nome da forma de pagamento informada ou confirmada. Ele não recebe nem armazena número de cartão, senha bancária ou chave Pix do cliente.

## 1. Criar o site

1. Envie este repositório ao GitHub.
2. Na Netlify, importe o repositório como um novo site.
3. Mantenha as configurações do `netlify.toml`: comando `npm run build:netlify` e diretório `dist`.
4. Em **Data & Storage**, habilite o **Netlify Database** para o site. A conexão é disponibilizada ao build e às Functions pela variável gerenciada `NETLIFY_DB_URL`.
5. Confira no log que a migração `0001_baseline` foi aplicada com sucesso.

## 2. Configurar variáveis

Cadastre no ambiente de produção:

```env
BETTER_AUTH_SECRET=segredo-aleatorio-com-no-minimo-32-caracteres
BETTER_AUTH_URL=https://nome-temporario-do-site.netlify.app
SETUP_KEY=chave-privada-do-primeiro-administrador
RESEND_API_KEY=chave-real-do-resend
AUTH_EMAIL_FROM=Galeteria RC <acesso@galeteriarc.com.br>
```

- Não habilite `ALLOW_CONSOLE_EMAIL` em produção.
- `NETLIFY_DB_URL` deve ser administrada pela integração do banco, e não copiada para o repositório.
- Confirme no painel da Netlify o plano e os créditos aplicáveis ao banco e às Functions antes da abertura comercial.

## 3. Primeira conferência no endereço temporário

1. Publique no endereço temporário `*.netlify.app`.
2. Abra `/api/health` e confirme aplicação e banco disponíveis.
3. Acesse `/configurar`, crie o primeiro administrador e conclua a configuração.
4. Preencha o endereço real, prazo estimado, política de cancelamento e cada bairro com sua taxa.
5. Confira retirada, entrega, horários e as formas de pagamento.
6. Cadastre cardápio, adicionais, fotos, preços e saldos reais.
7. Valide convite e recuperação de senha com o e-mail transacional real.
8. Mantenha a loja em demonstração até concluir um pedido controlado em celular e computador.

## 4. Ligar o domínio

Depois da compra de `galeteriarc.com.br`:

1. Adicione o domínio em **Domain management** no site da Netlify.
2. Aplique no registrador os registros DNS informados pela Netlify.
3. Aguarde a validação do domínio e a emissão do HTTPS.
4. Troque `BETTER_AUTH_URL` para `https://galeteriarc.com.br` e publique novamente.
5. Valide o domínio de envio no provedor de e-mail e confirme `AUTH_EMAIL_FROM`.
6. Teste login, convite, recuperação, checkout, painel, recebimento e financeiro no domínio final.

## 5. Critérios para abrir a loja

- `/api/health` saudável no domínio final;
- HTTPS ativo e redirecionamento para o domínio principal;
- endereço, contato, horários, bairros, taxas, prazo e cancelamento confirmados;
- cardápio, estoque e preços revisados;
- e-mail transacional funcionando;
- pedido real controlado concluído, recebido e conferido no caixa;
- política de backup e restauração testada;
- modo de demonstração desativado e **Receber pedidos** habilitado somente após todos os itens acima.

## Migração de dados existentes

O PostgreSQL começa vazio, com a estrutura definida pela migração baseline. Bancos locais, bancos de teste e dados antigos do Cloudflare D1 não são importados automaticamente. Antes de migrar dados reais, gere uma exportação, faça a conversão controlada para PostgreSQL e confira contagens, relacionamentos, valores financeiros e histórico em um ambiente de homologação.
