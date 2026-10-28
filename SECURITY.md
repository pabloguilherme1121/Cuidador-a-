# Segurança — Cuidador(a) 3.6

O aplicativo é **local-first**, mas não é inteiramente offline. Rotinas, histórico e preferências podem ficar no navegador; ao usar uma **Sala de Pacientes** ou o chat, o aplicativo envia conteúdo cifrado com AES-GCM para a API Cloudflare Workers e para o banco Cloudflare D1. O serviço também processa metadados técnicos necessários à operação. Criptografia do conteúdo não significa anonimato completo. Veja [Privacidade](PRIVACIDADE.md).

## Dados e permissões

- Informações de saúde guardadas em `localStorage` **não são criptografadas em repouso**. Quem acessar o mesmo perfil do navegador poderá vê-las. Não compartilhe perfis entre pessoas.
- Backups JSON e exportações `.ics` não têm criptografia própria. Armazene-os em local protegido.
- Links de Sala são **credenciais de acesso**. Quem tiver um link de leitura pode visualizar o conteúdo; quem tiver um link de edição pode modificá-lo ou excluí-lo. Não há identidade individual verificada, auditoria por pessoa ou revogação seletiva. Para revogar links, é necessário criar outra sala e excluir a anterior; isso não apaga cópias já exportadas.
- Nunca coloque tokens, chaves de serviço ou dados reais de pacientes no repositório, em arquivos públicos, nos testes ou em relatos de issues. Não inclua conteúdo de pacientes em logs personalizados.
- Lembretes com o aplicativo fechado **não são garantidos**. Para medicamentos críticos, use também alarmes nativos do telefone. O aplicativo não é um prontuário eletrônico nem um sistema clínico validado.

## Infraestrutura e isolamento

A implantação atual usa **Cloudflare Workers + D1**, não Supabase Auth. Salas e chat dependem de conexão. Antes de ampliar a divulgação, revise autorização por endpoint, links vazados, logs da plataforma, retenção, LGPD, limites do plano gratuito e ensaios de carga controlados. Veja [Operação e escala](docs/OPERACAO_ESCALA_FREE.md) e a [issue de aceite P0](https://github.com/pabloguilherme1121/Cuidador-a-/issues/1).

Hospede o aplicativo em uma **origem exclusiva**, como o domínio Workers atual. Caminhos diferentes sob um mesmo domínio não isolam `localStorage`. Uma política CSP e a lista de arquivos permitidos no build reduzem a exposição, mas não substituem auditoria de segurança, proteção física do dispositivo nem testes em Android real.

## Verificação e divulgação responsável

Execute `npm ci --ignore-scripts` e `npm run build` antes de propor alterações. O CI também executa testes de navegador. A publicação do Worker é manual e precisa de validação HTTPS após o deploy; CI verde em uma branch não prova que essa revisão está publicada.

Para relatar uma vulnerabilidade, contate o proprietário do projeto em privado. Não publique tokens, links de Sala, dados de pacientes ou provas de exploração em issues públicas.
