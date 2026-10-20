# Política de privacidade — Cuidador(a)

Última atualização: 20/10/2026.

**Responsável pelo aplicativo**: proprietário do projeto Cuidador(a). O endereço de contato público deve ser configurado pelo responsável antes do lançamento a terceiros.

## Dados tratados
O usuário pode fornecer voluntariamente nome, refeições, medicamentos, doses transcritas de prescrição, observações, horários e registro de conclusão. Esses dados podem revelar informações de saúde e merecem proteção reforçada.

## Onde ficam os dados
Na versão offline-first entregue, os dados são salvos no localStorage do navegador e não são transmitidos para servidores da aplicação. Não há publicidade, analytics ou login nesta versão. Avisos locais dependem de consentimento de notificação e das capacidades do navegador. A infraestrutura de banco para contas está apenas preparada e não é utilizada pelo aplicativo.

## Controle e exclusão
O usuário pode editar e excluir horários, apagar todos os dados em Ajustes e exportar backups JSON. Limpar os dados do navegador também apaga os registros. Arquivos exportados ficam sob o controle do usuário e não são excluídos automaticamente.

## Riscos e limitações
Qualquer pessoa com acesso ao perfil do navegador pode visualizar dados. O backup JSON e o calendário ICS não possuem criptografia própria. O navegador pode remover o armazenamento por políticas de dispositivo ou falta de espaço.

## Compartilhamento e retenção
A aplicação não envia dados a terceiros; não há retenção central nesta versão. Backup e importação, quando iniciados pelo usuário, são processados localmente.

## Base legal e contato
Antes de oferecer sincronização hospedada a terceiros, o operador deverá publicar identificação, canal de contato, bases legais aplicáveis (incluindo dados sensíveis sob a LGPD), política de retenção, acesso/correção/exclusão e encarregado quando necessário. Este texto descreve a implementação efetiva atual, não substitui avaliação jurídica.

**Hospedagem escolhida:** para reduzir o risco de outras aplicações com acesso ao mesmo `localStorage`, recomenda-se um domínio exclusivo `<projeto>.pages.dev` no Cloudflare Pages. A hospedagem entrega apenas arquivos estáticos; registros médicos da rotina não são enviados ao Cloudflare pelo código atual. O provedor de hospedagem pode registrar informações técnicas de acesso (por exemplo, IP), conforme suas políticas.

### Avisos e notificações da tela bloqueada

Por padrão, os avisos do sistema exibem apenas um lembrete genérico e o horário, **sem o nome nem a dose do medicamento**, para diminuir a divulgação acidental para terceiros próximos do aparelho. Você pode desativar essa proteção em Ajustes, se quiser. A mensagem exibida dentro do aplicativo contém os detalhes porque já está na tela do aplicativo. Os dados não são criptografados em repouso no armazenamento do navegador; proteja a tela e a conta do dispositivo.


## Sala de Pacientes (v3, opcional)

Ao optar pela Sala, você envia à Cloudflare somente dados criptografados sobre horários, medicamentos e preferências. O segredo de acesso não é enviado ao servidor e fica na parte fragmento (`#`) do link e no armazenamento deste dispositivo. Qualquer pessoa com o link poderá decifrar e editar essas rotinas. Não envie o link em locais públicos. O servidor mantém os dados cifrados até você excluir a sala ou o serviço ser encerrado. Excluir a sala não apaga cópias ou backups já feitos por terceiros. O nome do perfil, histórico de conclusão e avisos disparados não são compartilhados. Esse recurso não substitui prontuário médico nem controle de acesso por usuário.
