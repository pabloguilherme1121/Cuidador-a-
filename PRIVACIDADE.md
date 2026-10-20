# Privacidade e tratamento de dados — Cuidador(a)

Atualizado em 20 de outubro de 2026 (v3.5). Documento informativo sujeito a revisão jurídica antes de operação pública comercial ou profissional.

**Operador e contato:** o operador do serviço ainda precisa publicar nome/razão social e um canal de contato válido. Não utilizar este texto como declaração de conformidade com a LGPD sem revisão apropriada.

## Dados no aparelho
O PWA guarda no armazenamento local do navegador: identificação de perfil opcional, refeições, nomes de medicamentos, doses, horários, observações, preferências, histórico de conclusão, timer e dados de conexão com salas. Os dados locais **não são criptografados em repouso**. Qualquer pessoa com acesso ao perfil do navegador pode visualizá-los. Apagar dados do navegador ou trocar de domínio pode eliminar o histórico. Backups JSON e arquivos ICS gerados pelo usuário **não** têm criptografia própria; guarde-os com cuidado.

## Salas opcionais e chat
Ao criar ou ingressar numa Sala de Pacientes, o aplicativo envia à Cloudflare Workers e ao banco Cloudflare D1 os identificadores técnicos e **uma cópia cifrada AES-GCM** das rotinas e preferências escolhidas. Mensagens e apelidos do chat também são cifrados antes de sair do aparelho. Histórico de conclusão e nome de perfil pessoal ficam locais. O servidor recebe horário de atualização, identificadores técnicos e pode tratar metadados de conexão necessários à operação; a criptografia do conteúdo não equivale a anonimato total.

A chave de leitura e, para editores, a credencial de edição ficam no fragmento do link (`#sala=...`) ou no armazenamento local. Quem recebe um link consegue conhecer dados cifrados com essa chave; se o link for de edição, pode modificar ou excluir. Não há identidade individual, auditoria por pessoa ou revogação seletiva. Revogar links cria nova sala e exclui a antiga, sem eliminar cópias previamente salvas por terceiros.

A sincronização e o chat requerem internet e podem funcionar com atrasos. A conversa conserva até 200 mensagens por sala no servidor; salas e dados não têm prazo automático de expiração definido nesta versão. Links de acesso devem ser compartilhados apenas com pessoas de confiança. A exclusão de uma sala remove seu conteúdo e chat do D1; não remove backups ou cópias locais de outras pessoas.

## Notificações, infraestrutura e terceiros
Notificações dependem da autorização do navegador; nomes e doses ficam ocultos da tela bloqueada por padrão. Não há lembrete confiável com o app fechado. O domínio público é servido pela Cloudflare Workers, e os arquivos estáticos são obtidos de um commit do repositório público GitHub. **Nenhum dado pessoal da sala é incluído no repositório GitHub**, nas páginas ou no cache do Service Worker. Não há publicidade ou rastreamento de analytics implementado no aplicativo.

## Direitos, segurança e limitações
Pode-se exportar, corrigir e apagar rotinas locais no próprio dispositivo, sair da sala, ou excluí-la se possuir credencial de edição. Ainda faltam identidade individual, canal de atendimento LGPD, retenção definida, controles contra abuso mais robustos e revisão de bases legais para dados sensíveis de saúde. **Este app não é um prontuário eletrônico nem um sistema clínico validado.** Não substitui prescrição, avaliação profissional nem alarmes nativos para medicamentos críticos.
