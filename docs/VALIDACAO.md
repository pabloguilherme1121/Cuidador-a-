# Evidências de validação — 20/10/2026

## Aprovado nesta versão
- Node.js 22: `npm run build` concluiu o check sintático de `app.js`, `core.mjs` e `sw.js` e todos os 7 testes unitários.
- Chromium do sistema, usando Playwright com DOM e módulos injetados na página (ambiente restringiu navegação HTTP de teste): verificação nos tamanhos 320, 360, 390, 430 e 844 px, sem erros JS e sem overflow horizontal.
- Jornada de primeira utilização, navegação das 5 abas, timer, cores, tema escuro, termos, cadastro de refeição e medicamento com múltiplos horários, conclusão, histórico, pesquisa, confirmação de limpeza e filtros.
- Repositório local Git preparado com workflow de Pages, RLS SQL e documentação de privacidade.

## Pendente e bloqueante para proclamar produção multiusuário
- Não foi criado um repositório remoto GitHub: conector ligado não oferece ação `create repository` e a conta local não possui `gh` autenticado.
- Não foi criada nem provisionada instância Supabase: requer escolha explícita da organização e validação de custo. A migration não foi aplicada.
- Fluxos de login remoto, sincronização consentida, isolamento de contas com dois usuários e push enviado por servidor ainda não implementados.
- WebKit e Firefox não puderam ser executados no ambiente local (binários Playwright indisponíveis e sem rede para download).
- Testes de Service Worker instalado e offline em domínio HTTPS e teste Android físico não foram feitos.
- O app atual não promete alarmes com a aplicação fechada; a alternativa é o calendário `.ics`.

**Decisão de release**: o build offline-first está pronto para envio e revisão. Um anúncio de produção multiusuário e alarmes remotos permanece bloqueado.
