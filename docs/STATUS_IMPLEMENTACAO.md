# Status de implementação — 01/10/2026

Fonte de ordem: PLANO_DE_IMPLEMENTACAO.md no diretório superior ao repositório.

## Etapa 1 — Confirmar as regras e preparar o projeto

Situação de engenharia: concluída.

- Stack, banco, autenticação e separação de ambientes definidos.
- Configuração inicial registra todas as regras comerciais obrigatórias.
- O modo de demonstração não aceita pedidos.
- Produtos fictícios deixaram de ser usados como catálogo ou seed.
- Migrações são incrementais e podem adotar bancos locais antigos.
- Execução, variáveis, e-mail, migrações e verificação estão documentados.
- TypeScript, ESLint, build e migrations locais passam.

Gate operacional ainda externo ao código:

- O responsável pela Galeteria RC deve preencher e conferir os dados comerciais reais.
- O administrador deve cadastrar o cardápio e os preços reais.
- O administrador deve manter os pedidos pausados até concluir essa conferência.

## Etapa 2 — Implementar autenticação e permissões

Situação: implementação iniciada e fluxo técnico principal concluído.

- Cadastro, login, logout e recuperação de senha disponíveis.
- Redefinir a senha revoga as sessões anteriores.
- Primeiro administrador continua protegido por chave privada e uso único.
- Convites de operador expiram em 72 horas, são vinculados ao e-mail e podem ser revogados.
- A desativação de um operador afeta imediatamente uma sessão já aberta.
- APIs validam cliente, operador, administrador e propriedade do pedido no servidor.
- A suíte automatizada executou 64 verificações de autenticação, autorização, cardápio, pedido e financeiro.

Pendências antes de declarar a Etapa 2 pronta em produção:

- Configurar e validar o remetente transacional real no ambiente publicado.
- Executar teste manual responsivo dos links recebidos por e-mail.
- Confirmar política operacional para troca do administrador principal.

## Etapa 3 — Construir cardápio e carrinho

Situação: concluída.

- Categorias possuem ordem e situação ativa/oculta.
- Produtos possuem categoria, foto por URL HTTPS ou arquivo local, preço base, porção e disponibilidade.
- Grupos de adicionais possuem mínimo, máximo, ordem e situação.
- Opções possuem preço adicional, ordem e situação.
- O cliente escolhe combinações antes de adicionar ao carrinho.
- Combinações diferentes do mesmo produto permanecem como linhas separadas.
- Carrinho, quantidades, observações e opções sobrevivem à recarga e ao login.
- Produtos, categorias ou opções desativados tornam o carrinho desatualizado e exigem revisão.
- O servidor recalcula preço base e adicionais e rejeita opção obrigatória ausente, opção inválida ou preço adulterado.
- Operadores podem pausar produtos; somente administradores alteram categorias, produtos e adicionais.

Gate operacional pendente:

- Cadastrar o cardápio e as fotos reais da Galeteria RC.
- Revisar nomes, preços, limites e disponibilidade com o responsável.
- Executar conferência visual manual em celular e computador com o cardápio real.

## Etapa 4 — Implementar finalização e registro de pedidos

Situação: concluída.

- O checkout exige cliente autenticado e preserva o carrinho durante a entrada na conta.
- Contato, retirada ou entrega, região, endereço, forma de pagamento externo e observações são revisados antes do envio.
- O servidor valida funcionamento, pausa da loja, modalidade, área atendida, endereço, pagamento, disponibilidade, adicionais, preços e taxa.
- Pedido, cópia dos itens e adicionais, valores, contato, dados de atendimento e histórico inicial são gravados em lote atômico.
- A chave de idempotência é vinculada ao conteúdo da tentativa; reenvios simultâneos retornam o mesmo pedido e a chave não pode ser reutilizada com conteúdo diferente.
- O checkout consulta automaticamente o resultado da tentativa quando a resposta do envio falha, antes de orientar um novo envio.
- Listagem, confirmação e acompanhamento são restritos ao cliente proprietário; dados internos de idempotência não são expostos pelas APIs de consulta.
- O pedido criado chega à fila operacional com os mesmos itens, adicionais, observações, dados de contato e valores.
- A suíte automatizada executou 74 verificações, incluindo retirada, entrega, loja pausada, área inválida, preço adulterado, transação, duplicação, recuperação e isolamento entre clientes.
- TypeScript, ESLint, build e migração local passam.

Gates de lançamento ainda pendentes antes de receber pedidos reais, sem bloquear a conclusão da Etapa 4:

- Aprovar os dados comerciais e o cardápio real no primeiro acesso.
- Configurar e testar o provedor de e-mail de produção.
- Revisar cardápio, carrinho e checkout em celular e computador com produtos e adicionais reais.

## Etapa 5 — Construir a operação e o acompanhamento

Situação: concluída.

- A fila operacional mostra pedidos recentes, horário, identificador, modalidade, valor, status, itens, adicionais, observações e dados necessários ao atendimento.
- A equipe pode filtrar pedidos em andamento, concluídos, cancelados ou por status específico.
- Cada pedido possui uma rota operacional de detalhes em `/operacao/pedidos/:id`, com resumo completo, ações permitidas e histórico.
- As transições seguem a máquina de estados definida no servidor; entrega exige saída para entrega e retirada conclui diretamente após ficar pronta.
- Cancelamentos exigem motivo, e pedidos concluídos ou cancelados não aceitam novas transições comuns.
- Cada mudança registra data, horário e responsável; o cliente visualiza a origem como Cliente ou Equipe sem receber identificadores internos da equipe.
- Fila, detalhes operacionais e acompanhamento do cliente consultam atualizações automaticamente a cada dez segundos.
- Atualizações usam controle de revisão; tentativas simultâneas não se sobrescrevem e a interface recarrega os dados após conflito.
- A suíte automatizada executou 89 verificações, incluindo fluxos completos de entrega e retirada, transições inválidas, cancelamento sem motivo, estados terminais, histórico, responsável e concorrência.
- TypeScript, ESLint e build passam.

## Etapa 6 — Registrar recebimentos externos

Situação: concluída.

- O recebimento é um registro próprio, separado do lançamento financeiro e vinculado de forma única ao pedido.
- Operador e administrador podem confirmar o valor integral e a forma de pagamento informada no pedido; pedidos cancelados não podem ser recebidos.
- A confirmação é idempotente e segura contra reenvios ou tentativas simultâneas.
- O pedido passa a indicar o recebimento e ganha um evento de histórico com data, horário e responsável.
- Somente o administrador visualiza a fila de recebimentos aguardando lançamento no caixa.
- A confirmação do recebimento não altera o saldo automaticamente, preservando a conferência administrativa.

## Etapa 7 — Consolidar o controle financeiro

Situação: concluída.

- Categorias financeiras ativas são mantidas no banco e validadas pelo servidor.
- Somente o administrador consulta ou altera o caixa.
- Receitas originadas de pedidos online exigem o recebimento conferido e criam vínculo único entre pedido, recebimento e lançamento.
- Valores são processados em centavos inteiros; datas futuras e categorias inválidas são rejeitadas.
- A chave de idempotência é vinculada ao conteúdo do lançamento e não pode ser reaproveitada com dados diferentes.
- Correções e estornos preservam o histórico; estornos exigem motivo e confirmação de que a devolução externa já foi realizada.
- O painel mantém resumo, filtros, detalhes e saldo calculado apenas a partir do livro-caixa.
- O cenário automatizado de R$ 100 existentes + R$ 200 de entrada - R$ 50 de saída resulta em R$ 250.
- A suíte automatizada executou 103 verificações; TypeScript, ESLint, build e migrações locais passam.

## Etapa 8 — Validar e colocar em produção

Situação: em andamento, com prontidão técnica concluída.

- A aplicação possui endpoint público de saúde em `/api/health` e logs estruturados sem corpo de requisição ou segredos.
- O manual de produção cobre pré-lançamento, pós-publicação, backup, restauração, pausa de emergência e diagnóstico.
- Backups locais ficam fora do Git.
- A versão completa passou por TypeScript, ESLint, build, migrações e 103 verificações isoladas de fluxo.

Gates operacionais restantes:

- Configurar e validar o provedor real de e-mail transacional.
- Cadastrar e aprovar os dados comerciais, regiões, horários, cardápio, adicionais, fotos e preços reais.
- Executar a conferência responsiva manual em celular e computador.
- Testar um pedido real controlado e conferir recebimento, caixa, logs, backup e restauração.

## Próxima ordem

Etapa 8 — concluir os gates operacionais com os dados e credenciais reais da Galeteria RC antes de liberar pedidos ao público.
