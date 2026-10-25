# Publicação controlada — Cuidador(a) 3.6

Atualizado em 25/10/2026. **Implantação atual: Cloudflare Workers + D1**, com Worker servindo a interface e a API. A documentação antiga de Pages se refere apenas a uma possível arquitetura estática futura e **não representa o deploy atual**.

## Critérios antes de publicar

1. Identificar a conta Cloudflare **que realmente administra** o endereço `cuidadora-pwa.pabloguui21.workers.dev`. Não implantar em outra conta ou projeto com nome parecido.
2. Confirmar no dashboard o Worker, o binding D1 `CARE_ROOMS`, o segredo `ABUSE_SALT` e as migrações existentes; não copiar segredos para GitHub nem recriar tabelas de produção às cegas.
3. Fixar a revisão de fonte do Worker (`SOURCE_REVISION`) no **SHA de `main` aprovado**. Executar `npm ci --ignore-scripts && npm run build`, além dos testes de navegador e de controle de acesso. Não relaxar os checks.
4. Implantar **explicitamente** no Worker da conta correta, preservando bindings, segredo, URLs e banco existentes. O push para GitHub sozinho **não publica** o Worker.
5. Confirmar que `GET /api/health` responde revisão exatamente igual ao SHA implantado; o smoke de página, isoladamente, **não prova revisão do backend**. Validar URL HTTPS e arquivos da PWA.
6. Executar a suíte `tests/room-live.mjs` apenas com sala e mensagens sintéticas de curta duração e apagar a sala no bloco de limpeza. Validar leitura autorizada, recusa de operações sem permissão, conflitos, chat cifrado e não cache de API.
7. Verificar em aparelho Android físico instalação, atualização, timer/retomada, conectividade, som/vibração, navegação 320/390px e perda/recuperação de rede. O CI não substitui essa etapa.
8. Registrar SHA, ID da implantação, data, resultados HTTP e roteiro de rollback. Se houver regressão, restaurar Worker da versão aprovada sem apagar D1 nem dados locais.

## Situação de acesso e segurança

O projeto tem testes automatizados de código e HTTPS, mas **não existe deploy automático por GitHub Actions**. Não afirmar que uma correção de segurança está ativa no site até verificação da revisão do Worker publicado. Se a conta Cloudflare correta não estiver conectada, deixar a release bloqueada e solicitar conexão do proprietário, em vez de publicar em outra conta.

As rotinas locais continuam disponíveis quando o backend falha; não prometer sincronização, alertas em segundo plano ou escala ilimitada. Em qualquer validação, não inserir dados verdadeiros de pacientes, tokens de convite ou chaves no terminal, nos issues públicos ou nos logs.

## Evolução opcional

Se futuramente os arquivos estáticos forem migrados para Cloudflare Pages ou Workers Static Assets, planejar a separação da API e a migração de origem/localStorage antes de alterar domínios. Consulte [DEPLOY_GRATUITO.md](DEPLOY_GRATUITO.md) apenas para referências de **hospedagem estática**, não como receita de deploy da arquitetura Worker+D1 já existente.

## Atestação separada do backend realmente publicado

Após a implantação manual do Worker na conta Cloudflare correta, copie o SHA completo da versão efetivamente implantada e acione **Actions → Conferir revisão publicada do Worker (somente leitura) → Run workflow**, informando esse SHA no campo `expected_sha`. O workflow é **manual**, não executa em pushes nem tenta implantar código.

A mesma verificação pode ser feita com Node 22 a partir do repositório:

```bash
node scripts/verify-worker-release.mjs <SHA_COMPLETO_APROVADO>
```

O verificador faz **uma consulta GET** ao endpoint público `/api/health`, sem tokens, sem consulta ao D1 e sem enviar dados de pacientes. Ele exige HTTP 200, resposta JSON com `status=ok`, `service=cuidadora` e **SHA exato de 40 caracteres**. Qualquer diferença, erro HTTP, payload inesperado ou indisponibilidade causa saída com código diferente de zero.

**Importante:** esse teste comprova apenas a revisão declarada pelo Worker no endpoint de saúde. Não substitui a validação da lógica implantada, dos bindings D1, dos controles 403/200/304, da criptografia, do chat, do uso offline nem do Android físico. Caso a versão não coincida, **não** marque o deploy como concluído; revise a conta Worker correta, o SHA fixado e a implantação antes de fazer qualquer teste com salas sintéticas.
