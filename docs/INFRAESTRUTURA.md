# Infraestrutura atual — Cuidador(a) 3.6

Atualizado em 25/10/2026. A arquitetura atual **não é apenas estática**: o PWA mantém dados locais e oferece compartilhamento opcional via **Cloudflare Worker + D1**. O backend não é Supabase e **não usa contas individuais**.

## Dados e fronteiras de segurança

| Componente | Onde fica | Limitação |
| --- | --- | --- |
| Rotinas, histórico de conclusão, preferências pessoais | Navegador local (offline) | Dependem da segurança do aparelho, origem e backup do usuário |
| Sala compartilhada e chat | Cifrados no cliente antes de serem enviados ao Worker/D1 | Links-capacidade de leitura/edição; sem identidade verificada por pessoa |
| Chaves de sala | Dispositivo e fragmento de convite | Perda da chave impede recuperação garantida; não colocá-la em logs |
| API `/api/rooms` | Worker, com binding `CARE_ROOMS` para D1 | Só funciona online; autorizações de consulta/edição e limites aplicam-se à API |
| Antiabuso na criação | Worker + D1 e segredo `ABUSE_SALT` | Pode gerar 429 em redes compartilhadas e não elimina ataques distribuídos |

O Service Worker **não armazena respostas `/api/` em cache**. O chat usa consultas periódicas adaptativas, não conexão em tempo real garantida. O recurso compartilhado não substitui acompanhamento médico nem atendimento de urgência.

## Publicação que está realmente em uso

Fonte: `cloudflare/worker.mjs`, compilada/implantada com a constante `SOURCE_REVISION` fixada em um SHA aprovado. O Worker serve a aplicação e expõe as APIs de Sala/Chat; a publicação do código no GitHub **não atualiza o Worker automaticamente**.

URL de referência indicada pelo projeto: `https://cuidadora-pwa.pabloguui21.workers.dev/`. Confirme no próprio Cloudflare o Worker e o D1 corretos antes de qualquer alteração. Verifique `GET /api/health` para conhecer a revisão servida e execute a integração com dados **sintéticos** depois de cada publicação. Veja [PUBLICACAO.md](PUBLICACAO.md).

## Limites atuais e não funcionalidades

- Sem autenticação por usuário, rastreabilidade individual de quem editou, revogação seletiva por pessoa ou recuperação garantida de chaves.
- Sem alarme confiável com o aplicativo fechado: usar também alarmes nativos para lembretes críticos.
- Capacidade de milhares de usuários **não está certificada**; consultar [OPERACAO_ESCALA_FREE.md](OPERACAO_ESCALA_FREE.md) e aferir cotas reais.
- Instalação, permissões, sons/vibração e desempenho precisam de aceite em Android físico.
- Testes de browser, smoke HTTPS e integração de Sala **não demonstram automaticamente** que a revisão mais recente do Worker foi implantada.

## Integrações futuras — não ativas

A pasta `supabase/migrations` é um plano de evolução, não um backend habilitado. Antes de integrar Supabase Auth/RLS, push remoto ou compartilhamento por identidade, exigir revisão de privacidade, consentimento, segregação de contas, exclusão/retensão, custos e teste de isolamento entre duas contas fictícias. Não substituir a arquitetura atual por mudanças de infraestrutura sem migração e rollback.

O aplicativo não tem certificação para uso clínico. Não registrar dados reais de pacientes em testes, repositório, logs ou capturas públicas.
