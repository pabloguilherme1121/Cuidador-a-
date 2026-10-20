# Auditoria do Cuidador(a) — v2.2 (20/10/2026)

## Escala
As notas abaixo são uma estimativa técnica com base no código, nos testes locais e nas limitações de plataforma. Não representam certificação de saúde nem conformidade jurídica.

| Dimensão | Nível | Evidência / risco |
| --- | --- | --- |
| Design e usabilidade mobile | 8/10 | 5 larguras exercitadas em Chromium e interface personalizável, mas sem auditoria assistiva física |
| Funcionalidades de rotina | 8/10 | cadastro CRUD, 2 categorias, filtros, histórico, backup e calendário; sem recorrência avançada |
| PWA e offline | 6/10 | manifesto e SW implementados, artefato auditado; teste HTTP+SW em navegador real no CI pendente |
| Qualidade e testes | 7/10 | 14 testes de lógica, 3 de artefato e smoke DOM em cinco larguras; Firefox/WebKit e Android físico pendentes |
| Privacidade e segurança | 7/10 | armazenamento local, build somente arquivos públicos, validação de importação, CSP e notificações privadas por padrão; sem criptografia local |
| Alarmes com app fechado | 2/10 | sem backend push, alarmes PWA não garantidos; exportação .ics disponível |
| Multiusuário com login | 1/10 | uso isolado por navegador; SQL futuro não ativa autenticação nem sincronização |
| Deploy e operações | 5/10 | build Cloudflare e GitHub Actions preparados; sem push/cloudflare account autorizado nem deploy HTTPS confirmado |

**Classificação geral:** bom beta local para rotinas pessoais não críticas; **não é produto médico pronto para produção com alarmes confiáveis**.

## Correções desta versão
1. Títulos e doses ocultos por padrão nas notificações do sistema; opção para exibir detalhes.
2. Cálculo de antecedência em timestamps locais reais, incluindo eventos próximos à meia-noite e sem alertas atrasados além de 1 minuto.
3. Testes unitários de regressão para privacidade e meia-noite e smoke UI para o controle de privacidade.
4. Service Worker com cache `v4` e estratégia network-first para JS/CSS; utiliza cache offline em caso de falha de rede.
5. Documentação e pacote de publicação revistos, sem material médico sensível ou documentação interna na pasta `dist`.

## Evidência verificável nesta sessão
- `npm run build`: 14 testes de lógica, 3 testes do artefato, análise sintática e geração de `dist` aprovados.
- `python tests/browser-smoke-local.py`: execução Chromium por injeção do DOM/JS, 320/360/390/430/844 px, fluxos principais e controle de privacidade aprovados.
- `python tests/browser-smoke.py`: **não aprovado neste ambiente**, por `ERR_BLOCKED_BY_ADMINISTRATOR` na navegação loopback; manter obrigatório no GitHub Actions.
- GitHub `Pabloguilherme01/Cuidador` existe, está vazio e a conexão deste chat possui apenas `pull` (sem `push`). Cloudflare ainda não possui conexão disponível no chat.

## Portões de produção ainda pendentes
- Conectar GitHub com acesso de escrita ao repositório correto, enviar código e aprovar checks `test` + `browser` em HEAD.
- Conectar Cloudflare Pages Free ao mesmo repo, branch `main`, build `npm ci --ignore-scripts && npm run build`, saída `dist`; verificar HTTPS, headers, cache, manifesto, instalação e offline.
- Verificar em Android físico após HTTPS: retomada, exportação, notificações com permissão e telas de 320/390 px.
- Não habilitar autenticação ou backend multiusuário sem RLS e teste entre duas identidades.
- Não prometer alarmes quando o navegador estiver fechado; usar calendário do sistema para esse caso.
