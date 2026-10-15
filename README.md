# Galeteria RC — Pedidos Online

Loja online responsiva para receber pedidos da Galeteria RC. O projeto separa clientes, operadores e administradores por login e nível de acesso.

## Funcionalidades

- cardápio público com busca, categorias ordenadas, fotos e disponibilidade;
- produtos com grupos de adicionais obrigatórios ou opcionais;
- carrinho persistente com combinações, quantidades, observações e preços;
- cadastro e login de clientes por e-mail e senha;
- finalização e acompanhamento de pedidos;
- painel operacional para pedidos e cardápio;
- convites de equipe com validade, aceitação e revogação;
- recuperação de senha por e-mail com revogação das sessões anteriores;
- registro financeiro de entradas e saídas;
- confirmação administrativa para registrar reembolsos;
- pagamentos registrados na entrega ou retirada, sem pagamento online;
- gate de prontidão comercial antes de liberar pedidos reais;
- taxas de entrega configuráveis por bairro ou região atendida;
- modo de demonstração restrito a pedidos de teste da equipe;
- aviso de privacidade, termos de uso e versão legal registrada no pedido.

## Requisitos

- [Git](https://git-scm.com/downloads);
- [Node.js](https://nodejs.org/) 22.13 ou superior;
- npm, instalado junto com o Node.js.

## Instalação em outro computador

Abra o terminal e clone o repositório:

```bash
git clone git@github.com:lucstonio13-pixel/Projeto-Galo.git
cd Projeto-Galo
```

Instale exatamente as dependências registradas:

```bash
npm ci
```

Crie as variáveis e a chave privada do ambiente local:

```bash
npm run setup:local
```

Gere a aplicação e prepare a configuração local do banco:

```bash
npm run build
npm run db:local
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## Primeiro administrador

Depois da instalação:

1. Abra [http://localhost:5173/configurar](http://localhost:5173/configurar).
2. Clique em **Criar conta de administrador**.
3. Cadastre o responsável pelo estabelecimento.
4. Abra o arquivo privado `.sites-runtime/PRIMEIRO_ACESSO.md`.
5. Copie a chave, informe as regras comerciais confirmadas e conclua a configuração.

A configuração inicial exige nome da loja, contato, retirada/entrega, endereço, regiões e respectivas taxas, horários, dias, prazo, formas de pagamento e política de cancelamento. Nenhum cardápio fictício é criado. Depois, cadastre os produtos reais em **Área da equipe → Cardápio**, confira tudo e só então habilite **Receber pedidos**.

Em **Área da equipe → Configurações**, o administrador pode adicionar, renomear ou remover cada bairro/região e informar uma taxa diferente para cada área. A lista de São Luís exibida como sugestão de preenchimento não habilita bairros automaticamente e não define valores: cobertura e taxas precisam ser confirmadas pela empresa.

O painel de configurações mostra uma lista de prontidão comercial. Pedidos reais só podem ser ativados quando os dados estiverem confirmados, houver produto disponível em categoria ativa e um provedor transacional estiver configurado. Em demonstração, clientes podem consultar o cardápio, mas somente administradores e operadores enviam pedidos de teste.

A chave funciona somente antes da primeira configuração da loja. Os arquivos `.env.local`, `.dev.vars`, `.sites-runtime/` e o banco local não são enviados ao GitHub.

Depois da configuração, o administrador convida operadores pela seção **Equipe**. O convite expira em 72 horas, pertence ao e-mail informado e pode ser revogado. Clientes usam o cadastro comum da loja.

## Variáveis de ambiente

O comando `npm run setup:local` cria estes valores automaticamente:

```env
BETTER_AUTH_SECRET=segredo-aleatorio
BETTER_AUTH_URL=http://localhost:5173
SETUP_KEY=chave-privada-do-primeiro-administrador
```

Em produção, configure também o envio de e-mails:

```env
RESEND_API_KEY=chave-do-provedor
AUTH_EMAIL_FROM=Galeteria RC <acesso@seudominio.com>
```

Como alternativa de integração interna, `EMAIL_WEBHOOK_URL` recebe um JSON com a mensagem transacional. Sem Resend ou webhook, o ambiente de produção recusa recuperação de senha e convites em vez de fingir um envio.

Somente no desenvolvimento local, `ALLOW_CONSOLE_EMAIL=true` permite imprimir os links no terminal para teste. Nunca habilite essa opção em produção.

Para configurar manualmente, copie `.env.example` para `.env.local` e `.dev.vars`, substituindo todos os valores de exemplo.

Nunca envie as chaves reais ao GitHub.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run setup:local` | Cria as variáveis e a chave do primeiro acesso |
| `npm run dev` | Inicia o desenvolvimento em `localhost:5173` |
| `npm run build` | Compila a aplicação |
| `npm run start` | Executa localmente a versão compilada |
| `npm run db:local` | Aplica somente as migrations pendentes no banco local |
| `npm run db:migrate:remote` | Aplica migrations pendentes no D1 remoto |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run lint` | Verifica o código com ESLint |
| `npm run test:flows` | Cria banco isolado e valida os fluxos reais de API |
| `npm run test:recovery` | Após os fluxos, verifica reabertura, backup e restauração do banco isolado |
| `npm run verify` | Executa tipos, lint, build, migrations locais, fluxos e recuperação |
| `npm run db:generate` | Gera uma nova migração após mudanças no banco |

## Estrutura principal

- `app/`: páginas, telas e APIs;
- `components/`: componentes da interface;
- `db/`: esquema e acesso ao banco;
- `drizzle/`: migrações;
- `lib/`: autenticação, regras e funções compartilhadas;
- `public/`: imagens e arquivos públicos;
- `scripts/`: instalação, execução e configuração local.

## Publicação

O projeto está preparado para Sites com Cloudflare D1. As variáveis de produção são configuradas diretamente na hospedagem e não fazem parte do repositório.

Antes da publicação, aplique `npm run db:migrate:remote`, configure os segredos no ambiente da hospedagem e execute `npm run verify`. O banco de testes de fluxo é isolado em `.sites-runtime/verify-state` e não altera o banco local usado no desenvolvimento.

A migração `0008_commercial_readiness.sql` registra a versão dos termos aceita pelos novos pedidos. Aplique-a antes de publicar esta versão.

O procedimento de lançamento, conferência, backup, restauração, pausa de emergência e suporte está em [docs/OPERACAO_PRODUCAO.md](docs/OPERACAO_PRODUCAO.md). Depois da publicação, `/api/health` confirma a disponibilidade da aplicação e do banco sem expor dados comerciais.

A conferência do item 9 do plano está em [docs/ACEITE_ETAPA_9.md](docs/ACEITE_ETAPA_9.md). O teste de recuperação foi validado no Node 24, usa sua API SQLite e preserva os artefatos em `backups/`; não acessa nem restaura o banco de produção.

## Estoque pequeno

Em **Área da equipe → Estoque**, o administrador cadastra produtos, ingredientes e embalagens com saldo inicial e mínimo. Administradores e operadores registram entradas e saídas confirmadas com motivo. Produtos vinculados ao cardápio usam unidades inteiras: o pedido reserva a quantidade, e um cancelamento repõe a reserva. Ingredientes e embalagens têm movimentação manual; não existe consumo por receita nesta versão. Itens sem vínculo com o cardápio não bloqueiam pedidos.

O estoque, seus movimentos, usuários, pedidos e histórico ficam no D1 existente. A migração `0005_inventory.sql` não cadastra saldos fictícios nem altera pedidos antigos. Antes de vincular um produto, informe seu saldo físico disponível para novos pedidos, descontando os pedidos antigos já comprometidos. Movimentações de estoque não geram lançamentos financeiros.
