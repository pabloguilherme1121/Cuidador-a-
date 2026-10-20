# Deploy grátis recomendado — Cuidador(a) 2.2

## Por que Cloudflare Pages Free em vez de GitHub Pages?

**Privacidade por origem.** Sites de projeto do GitHub Pages compartilham por padrão `usuario.github.io` e variam por caminho (`/repo/`). O `localStorage` é isolado por **origem** (protocolo + domínio + porta), e não por pasta. Portanto um segundo site no mesmo `usuario.github.io` poderia ler dados locais do Cuidador(a), se o JavaScript executado nele fosse comprometido ou malicioso.

O Cloudflare Pages gera um subdomínio próprio `<projeto>.pages.dev`, que cria uma origem separada das outras páginas GitHub do usuário, sem custo de domínio. Por isso é a escolha preferida para armazenar dados de rotina e nomes de medicamentos **somente no dispositivo**. O código também define CSP, `X-Frame-Options`, `Referrer-Policy` e permissões mínimas em `deploy/_headers` e `noindex`/robots para reduzir exposição. Essas medidas não substituem a segurança do dispositivo nem uma auditoria de produção.

| Opção | Custo nesta etapa | Avaliação |
| --- | --- | --- |
| Cloudflare Pages Free | R$ 0 | Recomendado: GitHub conectado, HTTPS, domínio `*.pages.dev` próprio, previews, 500 builds/mês no plano Free |
| GitHub Pages (público) | R$ 0 | Fácil, mas a origem `usuario.github.io` pode ser compartilhada com outras páginas. Evite para este app com dados sensíveis locais sem domínio exclusivo |
| Vercel Hobby | R$ 0 dentro do plano e suas condições | Possível, mas sem benefício específico frente ao Cloudflare nesta versão |

## Integração GitHub -> Cloudflare Pages (sem serviços pagos)

1. Crie um repositório vazio chamado **Cuidador** na conta GitHub conectada **pabloguilherme1121**: https://github.com/new . Selecione esse proprietário explicitamente. A integração ChatGPT confirmou acesso de escrita aos repositórios próprios, mas não disponibiliza uma ação de criação de repositório. Não inicialize README, licença ou .gitignore no site.
2. Depois da criação do repositório na conta certa, envie o código da pasta Git local. Se o remoto estiver vazio, `bash scripts/conectar-github.sh https://github.com/pabloguilherme1121/Cuidador.git` conecta `origin` e tenta `git push -u origin main` **sem force**. Se o remoto tiver histórico, analise as diferenças antes de mesclar.
3. Crie uma conta Cloudflare Free ou entre nela. Abra https://dash.cloudflare.com/ -> Workers & Pages -> Create -> Pages -> **Import an existing Git repository / Connect to Git** e autorize o GitHub e o repositório correto (precisa ser autorizado pelo usuário).
4. Escolha a branch **`main`** como produção e defina **Build command:** `npm ci --ignore-scripts && npm run build`. **Build output directory:** `dist`. **Root directory:** `/` (raiz). Nenhuma variável de ambiente, função, banco, cobrança ou domínio próprio é necessário.
5. A integração Cloudflare fará deploy a cada push para a branch de produção. PRs podem ter previews separadas.
6. Antes de permitir pushes diretos na `main`, configure proteção de branch/reviews com os checks `test` e `browser` do workflow `.github/workflows/ci.yml`; assim o código chega à produção somente após passar os testes em PR. A integração Git do Cloudflare, por si, **não aguarda** checks de GitHub em pushes diretos para `main`.
7. Confirme no dashboard Cloudflare o estado **Success**, a URL HTTPS `*.pages.dev`, a resposta HTTP e o carregamento do manifest, dos ícones, do Service Worker e da página offline. Depois valide no Android real: instalar, atualizar, fechar/reabrir, concluir, editar, exportar/importar backup, timer e permissões.
8. Não insira medicamentos reais nas contas de demonstração de CI ou em capturas públicas; os testes usam dados fictícios. Não envie backups JSON reais para o GitHub.

A URL exata só existe após criação e deploy no Cloudflare. Não afirme publicação bem-sucedida sem verificação do status público.

## Pacote de publicação: lista fechada

`scripts/build-site.mjs` gera `dist/` apenas com:
- `index.html`, `app.js`, `core.mjs`, `styles.css`, `sw.js`, `manifest.webmanifest`
- `assets/*` (ícones)
- `_headers` (CSP e cabeçalhos de segurança) e `robots.txt`

**Nunca** publicar: `README.md`, `SECURITY.md`, `PRIVACIDADE.md`, `TERMOS.md`, `docs/`, `tests/`, `supabase/`, `.git/`, `.env`, logs ou backups pessoais. O teste `tests/published.test.mjs` garante a lista de saída.

## Limitações desta versão gratuita

- Várias pessoas podem usar o PWA em aparelhos separados, mas cada aparelho guarda seus dados localmente e **não** existe login ou sincronização entre usuários.
- Notificações do navegador e o timer são verificados enquanto a aplicação estiver executando; fechar/suspender o app pode atrasar ou impedir o alerta. A contagem do timer recupera o tempo decorrido ao voltar.
- Para alarmes com app fechado, exporte o `.ics` e valide os alertas no calendário do celular.
- Banco de dados multiusuário e Web Push server-side ainda não estão implementados; não precisam ser ativados para publicar esta versão.

## Documentação de referência

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

**Ambiente de build:** `.node-version` fixa Node.js 22.16.0, compatível com o ambiente de build Cloudflare Pages v3 de 2026. O teste local usa a mesma versão principal.
