# Segurança

- Aplicativo principal **local-first**: nenhum dado é enviado para a API na versão atual.
- Informações de saúde podem ficar visíveis a qualquer pessoa com acesso ao mesmo perfil do navegador. Não use o mesmo perfil para pessoas diferentes.
- Não cole chaves secretas de serviço em `index.html`, em `.env` público ou em `app.js`.
- Backup JSON e exportação de calendário `.ics` não são criptografados. Guarde-os em local protegido.
- A infraestrutura SQL para contas múltiplas está preparada, mas **não integrada nem habilitada em produção**. Antes de ativar sincronização, provisionar Supabase Auth, ativar MFA quando apropriado, testar RLS com dois usuários distintos, validar recuperação/exclusão de dados e segurança do transporte HTTPS.
- CSP restringe scripts a mesma origem. Os dados do usuário passam por escaping antes de exibição. Notificações solicitam permissão explícita.
- Se identificar uma vulnerabilidade, comunique ao proprietário do projeto em privado, não publicando dados reais nos issues.

## Isolamento por origem (hospedagem)
Para dados de medicamentos armazenados em `localStorage`, prefira hospedar num domínio **exclusivo para o Cuidador(a)**, como `<projeto>.pages.dev` no Cloudflare Pages. Evite servir o app como `/Cuidadora/` no mesmo `usuario.github.io` de outras aplicações: caminhos diferentes **não** isolam armazenamento local. Não comite dados de usuários, tokens ou backups.

O build `dist/` tem whitelist fechada e headers de proteção via `_headers` para Cloudflare. Não equivale a uma auditoria de segurança completa nem fornece proteção física do dispositivo.

### Regras adicionais da v2.2

- Bloquear vazamento involuntário de medicamentos no texto de notificações por padrão; preferência de exibição explícita disponível.
- Checar antecedência de lembretes com instantes locais reais e testar a travessia da meia-noite.
- Não confundir teste de DOM injetado com garantia de execução offline em HTTPS; validar Service Worker em CI e aparelho físico.
- Destino planejado para o novo repositório: `pabloguilherme1121/Cuidador`. Não tente enviar código antes da criação e confirmação das permissões. O antigo `Pabloguilherme01/Cuidador` pertence a outra conta e não deve ser alterado.
