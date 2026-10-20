# Infraestrutura multiusuário (fase de integração, não ativa)

## Situação atual
O Cuidador(a) entregue é um PWA sem backend de dados: funciona para **um perfil por armazenamento de navegador**. Isso evita transmissão automática de informações sensíveis. Ainda não há conta, login remoto, sincronização ou push quando fechado.

## Arquitetura para produção multiusuário
- Hospedagem estática HTTPS com cache controlado, PWA e implantação por GitHub Actions (workflow já presente).
- Supabase Auth para login por usuário (magic link ou passkey se disponível), com limitação de taxa e URLs de callback estritas.
- Postgres com as tabelas `care_profiles`, `care_schedules` e `care_occurrences`, todas protegidas por RLS. Migration no diretório `supabase/migrations`.
- API direta por token autenticado e chaves **publishable** no cliente. Nunca usar `service_role` no browser. `auth.uid()` vincula dados ao proprietário de cada linha.
- Para múltiplos dependentes sob um cuidador, desenhar modelo de autorização consentido e auditável; **não** compartilhar senhas ou assumir acesso entre contas.
- Para alertas com o PWA fechado: servidor agendador, subscrições Web Push por dispositivo, VAPID em segredo, revogação e controle de fuso horário. Implementar fila/idempotência, monitoramento de falhas, política de retries e testes em Android/iOS. Ainda não implementado. ICS é a alternativa entregue.

## Checklist para ativar
1. Confirmar a organização Supabase e custo; provisionar projeto.
2. Executar migration e testar RLS lendo e escrevendo com **duas contas de teste distintas**.
3. Implementar um fluxo de consentimento explícito para sincronização e migração dos registros locais, com opção de exportação/rollback.
4. Definir retentiva, deleção integral de conta e backup criptografado; revisar a LGPD antes de armazenar dados sensíveis.
5. Configurar domínio HTTPS, proteção e monitoração sem logar medicamentos/doses, limites de requests, alertas e recuperação.
6. Testar notificações em aparelho real e infraestrutura de push, sem prometer pontualidade absoluta.

Não habilite banco ou recursos hospedados apenas com o SQL: faltam fluxos de autenticação, APIs e as verificações acima.
