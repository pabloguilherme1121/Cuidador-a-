# Cuidador(a) 3.3 - linha do tempo editavel e salas sincronizadas

- **Linha do tempo:** alterar ou excluir horarios diretamente no cartao do dia, sem procurar a rotina em outra tela.
- **Alterar:** vale para todos os dias da rotina recorrente, sem ajustar automaticamente prescricoes ou doses.
- **Excluir:** com varios horarios, escolher remover apenas um horario recorrente ou a rotina inteira; exige confirmacao.
- **Historico preservado:** horarios concluidos mantem os dados da conclusao mesmo apos edicao ou exclusao.
- **Salas:** botao de sincronizacao no Hoje, estado de alteracoes pendentes e acesso a resolucao de conflitos.
- **Seguranca:** convites de leitura nao oferecem controles de edicao. Nao ha mesclagem silenciosa de conflitos.
- **PWA:** cache v8 inclui timeline.mjs para uso offline.
- **Validacao:** testes de horarios duplicados/invalidos, remocao parcial/total, historico e mobile 320-844px.

# Cuidador(a) 3.0 — PWA de refeições, medicamentos e lembretes

Aplicativo mobile-first e PWA em português do Brasil, offline após uma primeira visita. **Por padrão os dados ficam no navegador.** A Sala de Pacientes opcional sincroniza apenas rotinas e preferências com criptografia local AES-GCM, sem expor detalhes à Cloudflare D1.

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

O código está em **https://github.com/pabloguilherme1121/Cuidador-a-**. A hospedagem vigente usa Workers Free: https://cuidadora-pwa.pabloguui21.workers.dev/. O serviço Pages ainda não está integrado por Git devido a um problema na autorização da instalação Cloudflare/GitHub. A API de salas utiliza D1 Free e exige um token para consultar salas novas; links de edição utilizam outro token.


## v3.1 — Sala de Pacientes e convites por permissão

- Ao criar sala, dois links separados permitem visualização ou edição das rotinas configuradas em outros aparelhos; não distribua publicamente. O link de edição contém um segredo aleatório separado da chave de leitura.
- Históricos de conclusão e nome pessoal ficam locais.
- Backend Cloudflare Worker (`cloudflare/worker.mjs`) com D1 (`cloudflare/schema.sql`), versionamento otimista, exclusão e autorização por token derivado sem compartilhar chave de descriptografia.
- Sons suave/sinos/pulsos, volume, vibração opcional, confirmação para apagar em lote, 6 abas responsivas.
- Deploy Worker pinado a SHA do GitHub. Não é deploy automático nem Cloudflare Pages. Alterações são publicadas só após build, CI e atualização manual do commit fixado.
- Veja [avaliação técnica v3](docs/AVALIACAO_v3.md).

**Salas legadas:** convites v3.0 de duas partes não distinguiam edição e leitura. Antes de divulgar um link de leitura, quem gerencia a sala deve usar **Revogar links e criar novos**. Os aparelhos antigos exigem novos convites após a migração.


## Versão 3.2 — sincronização econômica e proteção contra conflitos

- A Sala consulta automaticamente **apenas quando a janela está visível e o aparelho está online**; ao voltar ao app ou recuperar a conexão, verifica novamente.
- Leituras condicionais com `If-None-Match` retornam **304 sem corpo** quando a versão remota não mudou (depois de validar a permissão de leitura). Isso reduz tráfego e não coloca dados de saúde em cache.
- Alterações conflitantes **não são reenviadas repetidamente**: a Sala avisa do conflito e mantém os dados locais para backup. A substituição confirmada só acontece após obter e decifrar os dados do servidor; uma falha de rede não apaga a fila local.
- Estado de sincronização e hora da última verificação aparecem na Sala. O modo leitura continua sem permissão de alterar ou excluir.
- Ainda não existe histórico compartilhado de tomadas, alarmes em segundo plano confiáveis ou identidade individual de cuidadores. Guarde links privados e faça backup antes de resolver conflitos.
