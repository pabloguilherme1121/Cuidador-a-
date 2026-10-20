# Publicação segura e gratuita (v2.1)

**Provedor recomendado: Cloudflare Pages Free** com subdomínio exclusivo `*.pages.dev` e integração GitHub.

Veja [DEPLOY_GRATUITO.md](DEPLOY_GRATUITO.md) para configuração exata (`npm ci --ignore-scripts && npm run build` → `dist`).

O GitHub Actions executa qualidade e Chromium E2E, **mas não publica** diretamente em GitHub Pages devido ao risco de outras páginas sob a mesma origem `usuario.github.io` poderem acessar `localStorage`.

Confirme a URL do repositório antes de conectar `origin` ou subir arquivos. Teste offline e instalação em Android físico após publicação em HTTPS. Sem acesso à conta Cloudflare e sem confirmação de CI remoto, o deploy não pode ser dado como concluído.
