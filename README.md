# Cuidador(a) 2.2 — PWA de refeições, medicamentos e lembretes

Aplicativo mobile-first em português do Brasil, instalável e que funciona offline após carregar uma vez. **Dados de cuidados ficam no próprio navegador** nesta versão, sem login e sem backend ativo.

## Recursos
- Refeições e medicamentos com horários e dias da semana configuráveis (nenhum medicamento fictício).
- Hoje: progresso, próximos horários, filtros prontos por tipo e por situação; marcar/desfazer.
- Rotina: criar, editar, arquivar e excluir, além de busca por nome, notas e dose.
- Histórico por data, com registro da hora de conclusão.
- Timer independente com presets de 5 a 60 min, duração de 1 a 180 min, pausa e reinício.
- Personalização de tema automático/claro/escuro, 6 paletas, fonte, densidade, início da semana, antecedência, som e horário silencioso.
- Backup JSON, calendário recorrente ICS, notificação local via Service Worker enquanto o app está ativo, PWA offline.
- Termos e política de privacidade incorporados, exportação de dados e exclusão local.
- Notificações na tela bloqueada ocultam nomes de medicamentos por padrão, com opção explícita de mostrar detalhes.
- Antecedência de lembretes respeita mudanças de dia, inclusive horários próximos à meia-noite.

## Rodar
```bash
python3 -m http.server 8765
# Abra http://localhost:8765 em um navegador
npm ci --ignore-scripts
npm run build
```

O build é estático, sem transpile ou dependências de runtime. JavaScript moderno com módulos ES e CSS nativo. Para ambiente remoto o site deve usar HTTPS.

## Testes
`npm run build` executa check JS + `node:test`. O teste de navegação está em `tests/browser-smoke.py`; exige Python Playwright e Chromium instalado. O teste local em Chromium usa conteúdo injetado porque este ambiente restringe navegação de browser para HTTP local; ele **não substitui** o teste HTTP + Service Worker real em CI ou em domínio HTTPS. Execute também `python tests/browser-smoke-local.py`.

## Segurança e infraestrutura
Consulte `SECURITY.md`, `PRIVACIDADE.md`, `TERMOS.md` e `docs/INFRAESTRUTURA.md`. Existe migration Supabase preparada para contas multiusuário, mas **nenhuma sincronização nem push em segundo plano foi ativada**. A escolha foi preservar dados sensíveis até que login, consentimento e RLS sejam testados em serviço real.

## Deploy gratuito e isolamento de dados
A hospedagem recomendada é **Cloudflare Pages Free** com GitHub, `npm ci --ignore-scripts && npm run build` e saída `dist/`. Isso cria um domínio próprio `*.pages.dev`, isolando o armazenamento local de outras páginas. Veja [`docs/DEPLOY_GRATUITO.md`](docs/DEPLOY_GRATUITO.md). O CI de GitHub valida o site, mas o deploy se faz pelo Cloudflare conectado ao repositório.

## Limites dos lembretes
O navegador pode suspender timers ao fechar a aba ou bloquear notificações. No Android, notificações ativas usam `ServiceWorkerRegistration.showNotification`. Não existe agendador push remoto nesta versão. Para lembretes com app fechado, exporte o calendário e habilite alertas no app de calendário; confirme a importação e sua configuração.

## Versões 2.1–2.2 — preparação de deploy gratuito
- Timer persistido localmente com prazo absoluto, inclusive após recarregar a página; não cria notificações remotas.
- Sincronização local de apagamento e timer entre abas abertas no mesmo navegador.
- Testes de UI reais preparados para CI GitHub Actions: Chromium e offline sob subdiretório `/Cuidadora/` (o ambiente local bloqueou HTTP loopback).
- Cloudflare Pages Free recomendado por isolar a origem do armazenamento local; consulte [DEPLOY_GRATUITO](docs/DEPLOY_GRATUITO.md).
- Envio opcional do repositório Git local com `bash scripts/conectar-github.sh URL_DO_REPOSITORIO` após revisar mudanças e histórico.

## Análise e aceite de produção

Consulte `docs/AUDITORIA_v2.2.md` para o nível do projeto, evidências de testes e requisitos pendentes antes de ativar login, push remoto e uso crítico de medicamentos.

**v2.2:** proteção padrão de dados em notificações, lembretes que atravessam meia-noite e SW v4 com network-first para código.

## Publicação atual (20/10/2026)

- **Site HTTPS online:** https://cuidadora-pwa.pabloguui21.workers.dev/
- **GitHub:** https://github.com/pabloguilherme1121/Cuidador-a-
- **Código publicado:** commit imutável `a407b4adb7013723f4398fb41ff7923e9617b4da`, aprovado no CI GitHub Actions.
- **Hospedagem temporária:** Cloudflare Workers no subdomínio `workers.dev`, usando apenas requisições públicas de arquivos estáticos do GitHub fixadas no commit validado. O Worker não recebe dados de medicamentos, que ficam no armazenamento local do navegador.
- **Git:** ainda **não** há deploy automático: mudanças na `main` não são publicadas até atualizar o commit fixado no Worker. O workflow `smoke-producao.yml` verifica o endereço HTTPS, mas não realiza deploy.
- **Cloudflare Pages:** integração GitHub ficou bloqueada por erro de instalação/autorização da Cloudflare (HTTP 401, código 8000011). Reconectar a integração GitHub em Workers & Pages permite tentar novamente. Não foi criado projeto Pages.
- **Custo:** implantação sem contratação de serviço pago. Workers Free permanece sujeito aos limites de uso do plano.
- **Atenção à migração de domínio:** dados em `localStorage` não migram automaticamente de `workers.dev` para `pages.dev`. Exporte backup JSON no site antigo e importe no novo antes de deixar de usar o antigo.
- **Cuidados:** não usar os avisos do navegador como único método para medicamentos críticos. Alarmes confiáveis com o app fechado ainda dependem do calendário nativo ou de uma infraestrutura adicional que não foi ativada.

A configuração sugerida para uma futura migração ao Cloudflare Pages Free é: GitHub `pabloguilherme1121/Cuidador-a-`, branch `main`, build `npm ci --ignore-scripts && npm run build`, saída `dist`.

