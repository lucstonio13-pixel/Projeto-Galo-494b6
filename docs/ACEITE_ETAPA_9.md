# Etapa 9 — Cenários de aceite

Data: 01/10/2026, America/Fortaleza.

Escopo confirmado pelo responsável: item 9 do plano original. Dados comerciais reais e e-mail de produção foram adiados para atualização futura. A conclusão técnica da Etapa 8 não equivale à autorização de lançamento comercial.

## Evidências executadas

- `npm run test:flows`: 103 verificações aprovadas em banco isolado, usando e-mail capturado por um servidor local de teste.
- `npm run test:recovery`: backup e restauração local aprovados; comparação integral das 20 tabelas, integridade SQLite e chaves estrangeiras válidas. Fechar e reabrir o banco preservou os dados.
- Artefatos locais: `backups/aceite-local-kXqgc3/resultado.json`, `backup.sqlite` e `restaurado.sqlite`, ignorados pelo Git. São dados de teste, não backup de produção.
- Produção inspecionada sem alterações: banco disponível para consulta, administrador ativo, configurações de demonstração e ausência de provedor transacional. Pedidos antigos preservados.

“API aprovada” significa o comportamento verificado pela suíte; não substitui o percurso no navegador. “Parcial” indica que parte do cenário exige teste adicional. “Pendente” não deve ser marcado como aprovado por inspeção de código.

## Matriz do item 9 do plano

| Cenário | Resultado atual | Próxima conferência |
| --- | --- | --- |
| Visitante consulta cardápio e monta carrinho | Parcial: catálogo público aprovado | Montagem no navegador |
| Login preserva carrinho | Pendente | Navegar, recarregar e entrar com itens |
| Cliente finaliza e consulta confirmação/histórico | API aprovada | Percurso visual completo |
| Isolamento de pedidos e endereços entre clientes | Parcial: pedidos aprovados | Dados da conta/endereço |
| Cliente não acessa funções da equipe | API aprovada | Rotas de páginas no navegador |
| Operador atende sem alterar permissões/configurações | Parcial: atendimento e permissões aprovados | Chamada direta de configuração |
| Revogação de operador com sessão aberta | API aprovada | Conferir mensagem da interface |
| Indisponibilidade, adicionais e preço alterado | API aprovada | Revisão do carrinho desatualizado |
| Loja fechada/pausada bloqueia novos e atende existentes | Parcial: pausa bloqueia criação | Horário fechado e atendimento durante pausa |
| Entrega fora da região | API aprovada | Mensagem no checkout |
| Retirada sem endereço/taxa | API aprovada | Percurso visual |
| Reenvio e resposta incerta não duplicam pedidos | API aprovada | Simular perda de conexão no navegador |
| Transições concorrentes | API aprovada | Conferir conflito na interface |
| Acompanhamento das atualizações | Parcial: consulta de histórico aprovada | Atualização automática no navegador |
| Cancelamento com motivo/responsável/pagamento | API aprovada | Conferência pela equipe |
| Estados terminais bloqueiam transições | API aprovada | Conferir botões |
| Alteração do preço não altera pedido antigo | Parcial: cópia dos itens aprovada | Alterar preço depois da criação e comparar |
| Celular, teclado e computador | Pendente | Foco, rótulos, contraste e telas pequenas |
| Pedidos após reinício da aplicação | Parcial: banco reaberto/restaurado | Reiniciar servidor e consultar pedido autenticado |
| Financeiro restrito ao administrador | API aprovada | Acesso direto às páginas |
| Campos obrigatórios e responsável financeiro | Parcial: confirmação e responsável aprovados | Matriz de valores/campos inválidos |
| Reenvio de movimentação não duplica | API aprovada | Clique repetido no formulário |
| Recebimento não lança entrada automaticamente | API aprovada | Conferência da operação e administrador |
| Mesmo recebimento, chaves distintas e simultâneas | Parcial: chaves distintas sequenciais aprovadas | Duas entradas simultâneas |
| Status não altera saldo automaticamente | Parcial: recebimento/cancelamento aprovados | Comparar saldo em cada transição |
| Ausência de cobrança/transferência online | Pendente de aceite visual | Revisar todos os percursos de pagamento |
| Cancelamento não reembolsa automaticamente | API aprovada | Conferência operacional |
| Reembolso exige confirmação/motivo/vínculo/limite | Parcial: confirmação e limite individual aprovados | Limite acumulado e concorrência |
| Cliente/operador não confirmam financeiro/reembolsos | Parcial: acesso financeiro recusado | Reembolso direto pelos dois perfis |
| Correção preserva original e impede inversão repetida | Parcial: inversão e saldo aprovados | Falta de motivo/confirmação e concorrência |
| R$100 + R$200 - R$50 = R$250 | API aprovada | Conferir apresentação dos cartões |
| Período/fuso/subtotal dos demais filtros | Parcial: período e saldo aprovados | Virada de dia e filtros da interface |
| Financeiro/histórico após reinício | Parcial: restauração/reabertura aprovadas | Reiniciar servidor e consultar como administrador |

## Validações adicionais executadas

A suíte agora possui 142 verificações aprovadas. Foram acrescentados: configuração recusada ao operador, campos financeiros inválidos, alteração de preço preservando pedido antigo, entradas concorrentes para o mesmo recebimento, reembolsos concorrentes respeitando limite acumulado, correções com motivo/consentimento e inversão concorrente, atendimento durante pausa e saldo preservado nas transições. Esses testes complementam os resultados parciais da matriz acima.

O navegador local confirmou o período personalizado de 01/02/2025 a 28/02/2025 (saldo anterior R$100, entradas R$200, saídas R$50, saldo final R$250), a abertura dos detalhes por link do financeiro e a aba de estoque. A versão local foi reiniciada e os dados anteriores continuaram acessíveis. Em 390px, a página de estoque não transbordou horizontalmente; tabelas mantêm rolagem própria. Isso não substitui a conferência completa com cardápio real e equipe.

O estoque foi testado para precisão decimal, permissão, reenvio, saldo insuficiente, disputa das últimas unidades, baixa única, indisponibilidade com saldo zero e reposição no cancelamento. Usuários e operação reutilizam o banco persistente existente.

## Validação operacional futura (pendente)

1. Aprovar contato, endereço, horários, regiões, taxas, pagamentos, política e cardápio real.
2. Configurar o e-mail transacional e testar recuperação e convite em caixas controladas.
3. Executar os percursos em celular e computador, incluindo teclado, sem liberar atendimento público antes do aceite.
4. Fazer pedido controlado com a equipe, concluir ou cancelar e conferir recebimento/caixa.
5. Validar backup de produção em ambiente de recuperação e registrar treinamento da equipe.

Registrar para cada pendência a data, o responsável, a evidência e o resultado. Não usar pedidos antigos ou o teste local como comprovação automática de um pedido real na versão atual.
