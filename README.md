# Galeteria RC — Pedidos Online

Loja online responsiva para receber pedidos da Galeteria RC. O projeto separa clientes, operadores e administradores por login e nível de acesso.

## Funcionalidades

- cardápio público com busca e categorias;
- carrinho com quantidade e observações;
- cadastro e login de clientes por e-mail e senha;
- finalização e acompanhamento de pedidos;
- painel operacional para pedidos e cardápio;
- gerenciamento da equipe por administrador;
- registro financeiro de entradas e saídas;
- confirmação administrativa para registrar reembolsos;
- pagamentos registrados na entrega ou retirada, sem pagamento online.

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
5. Copie a chave e confirme a configuração.

A chave funciona somente antes da primeira configuração da loja. Os arquivos `.env.local`, `.dev.vars`, `.sites-runtime/` e o banco local não são enviados ao GitHub.

Depois da configuração, o administrador pode cadastrar os operadores na seção **Equipe**. Clientes usam o cadastro comum da loja.

## Variáveis de ambiente

O comando `npm run setup:local` cria estes valores automaticamente:

```env
BETTER_AUTH_SECRET=segredo-aleatorio
BETTER_AUTH_URL=http://localhost:5173
SETUP_KEY=chave-privada-do-primeiro-administrador
```

Para configurar manualmente, copie `.env.example` para `.env.local` e `.dev.vars`, substituindo todos os valores de exemplo.

Nunca envie as chaves reais ao GitHub.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run setup:local` | Cria as variáveis e a chave do primeiro acesso |
| `npm run dev` | Inicia o desenvolvimento em `localhost:5173` |
| `npm run build` | Compila a aplicação |
| `npm run start` | Executa localmente a versão compilada |
| `npm run db:local` | Aplica a estrutura inicial no banco local |
| `npm run lint` | Verifica o código |
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
