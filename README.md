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

## Repositório GitHub de destino

O destino planejado é **`pabloguilherme1121/Cuidador`** (conta conectada). O repositório ainda precisa ser criado manualmente em https://github.com/new porque o conector GitHub atual não expõe a ação de criação. Depois de criado, envie esta branch `main` com `git push -u origin main` e configure Cloudflare Pages Free apontando para o repositório. Não use `Pabloguilherme01/Cuidador`, da outra conta.
