# Operação e lançamento em produção

Este documento é o roteiro operacional da Galeteria RC. A aplicação não cobra clientes, não gera Pix, não processa cartão e não movimenta dinheiro. Pagamentos e devoluções acontecem fora do sistema e só depois são registrados pela equipe.

## Antes de publicar

1. Confirmar nome, contato, endereço, modalidades, regiões, taxa, horário, prazo, formas de pagamento e política de cancelamento com o responsável.
2. Cadastrar o cardápio real, incluindo fotos, preços, disponibilidade e limites dos adicionais.
3. Criar as contas da equipe e desativar acessos que não serão usados.
4. Configurar `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SETUP_KEY` e um provedor transacional por `RESEND_API_KEY` + `AUTH_EMAIL_FROM` ou `EMAIL_WEBHOOK_URL`.
5. Manter **Receber pedidos** desativado até concluir o pedido controlado.
6. Executar `npm run verify` e aplicar `npm run db:migrate:remote` no ambiente correto.
7. Conferir no painel de configurações que todos os itens de **Prontidão comercial** estão aprovados.
8. Abrir `/privacidade` e `/termos` em celular e computador e confirmar que o canal de atendimento real está visível na loja.

No modo de demonstração, clientes somente consultam o cardápio. Pedidos de teste ficam disponíveis apenas para administradores e operadores e entram identificados na cozinha.

Nunca copie `.env.local`, `.dev.vars`, `.sites-runtime/`, bancos locais ou arquivos em `backups/` para o repositório.

## Validação depois da publicação

1. Abrir `/api/health` e confirmar `status: ok` e `database: true`.
2. Testar cadastro, login, recuperação de senha e convite de operador usando endereços controlados.
3. Conferir cardápio, carrinho e checkout em celular e computador, inclusive por teclado.
4. Confirmar que o checkout exige ciência do aviso de privacidade e aceite dos termos.
5. Fazer um pedido de retirada e um de entrega, quando ambas as modalidades estiverem habilitadas.
6. Na operação, aceitar, iniciar o preparo, marcar como pronto e concluir o pedido. Para entrega, conferir também **Saiu para entrega**.
7. Informar um recebimento externo e confirmar que o saldo financeiro não muda automaticamente.
8. Como administrador, registrar manualmente a entrada vinculada ao recebimento e conferir lista, filtros e saldo.
9. Testar um cancelamento controlado. Se houver devolução, realizá-la fora do sistema antes de registrar a saída de reembolso.
10. Reiniciar a aplicação e confirmar que pedidos, recebimentos, histórico e financeiro continuam disponíveis.

## Backup e restauração

Antes de migrations e mudanças de produção, exporte o banco D1 para um arquivo SQL em uma pasta local ignorada pelo Git:

```bash
mkdir -p backups
npx wrangler d1 export DB --remote --config dist/server/wrangler.json --output backups/galeteria-AAAA-MM-DD.sql
```

Guarde a cópia em local protegido, registre a data e nunca a envie ao Git, pois ela contém dados pessoais e financeiros.

Para restaurar, primeiro pause os pedidos. Use um banco de recuperação ou ambiente de teste para validar o arquivo antes de qualquer alteração no banco principal:

```bash
npx wrangler d1 execute DB --remote --config dist/server/wrangler.json --file backups/galeteria-AAAA-MM-DD.sql
```

A restauração do banco principal é uma ação de manutenção. Confirme o banco, o arquivo, o backup atual e a janela de indisponibilidade antes de executar.

## Pausa de emergência

1. Acessar **Área da equipe → Configurações** como administrador.
2. Desmarcar **Receber pedidos** e salvar.
3. Confirmar no cardápio que novos pedidos estão bloqueados.
4. Continuar atendendo os pedidos já existentes na fila.

Se a área administrativa estiver indisponível, interromper temporariamente a publicação pelo painel de hospedagem e acionar o responsável técnico.

## Diagnóstico e suporte

- Verificar `/api/health`.
- Consultar os logs do Worker procurando o método e a rota da falha; os logs não devem registrar corpo da requisição nem segredos.
- Anotar horário no fuso `America/Fortaleza`, perfil afetado, identificador curto do pedido e ação executada.
- Não enviar senhas, chaves, cookies, arquivos de ambiente ou exportações completas do banco por mensagens de suporte.
- Antes de corrigir registros financeiros, conferir se a ação representa apenas correção interna ou uma devolução de dinheiro já realizada fora do sistema.
