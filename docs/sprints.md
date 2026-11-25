# Plano de sprints

25/11/2026 · [Documento técnico](documento-tecnico.md)

Cada sprint entrega um fluxo testável em celular. A ordem abaixo segue as dependências do produto. Abra um PR por tarefa, mantenha os registros de validação em `docs/` e avance com unitários, integração e lint verdes no PR, junto dos demais checks automáticos aplicáveis. Registre separadamente o preview e a aceitação em aparelhos reais. Se um teste de campo revelar um bloqueio, resolva-o antes de iniciar tarefas que dependem dele.

| Sprint | Sequência e dependências | Aceitação |
| --- | --- | --- |
| **0 — Fundação e riscos** | Inicializar Next.js, tokens, PWA e pipeline. Subir Supabase local. Ligar Vercel e Supabase de teste, configurar Google OAuth e validar o fluxo no PWA instalado. Avaliar a fonte PT com amostra e licença. | Instalar em iPhone e Android, entrar com Google, ver nome/foto, fechar, reabrir e verificar renovação e shell offline. Registrar alternativa de login se o teste falhar e decisão da fonte PT com licença. |
| **1 — Design system e acesso** | Após validar o caminho de autenticação, montar catálogo e componentes acessíveis. Criar perfis, grupos, membros, convites e `join_group` com RLS e limite de tentativas. Integrar sessão persistente, renovação e entrada na estante vazia. | Conta nova entra pelo convite, código errado tem feedback e sofre bloqueio por tentativas. Testar isolamento, expiração, rede indisponível e renovação concorrente. |
| **2 — Estante e livros** | Depois da autorização por papel, criar metadados e bucket privado. Implementar upload do organizador com hash e deduplicação, livro atual e ordenação. Baixar por URL assinada, validar o hash e armazenar no IndexedDB. | Organizador publica no celular, membro baixa em outro aparelho e acessa em modo avião. Verificar upload negado ao membro, arquivo alterado e reenvio idêntico. |
| **3 — Leitor** | Com EPUB íntegro e local, integrar foliate-js no cliente, paginação/CFI, barras e índice. Persistir progresso e preferências imediatamente e sincronizar por conta. Aplicar tema antes da primeira pintura. Confirmar o modelo de respostas antes da sprint 5. | Ler em iPhone e Android, checar seleção e paginação, restaurar posição e preferências após fechar à força ou trocar de aparelho. Conferir privacidade, contraste do tema personalizado e fonte de 12 a 36 px. |
| **4 — Grifos e sincronização** | Sobre CFI validado, criar RLS e armazenamento local de grifos. Estender fila com transporte, cursor, reenvio e exclusão. Implementar seleção em quatro cores, nota, lista por capítulo e status offline. | Dois usuários recebem grifos e exclusões, inclusive após modo avião e reenvio sem duplicar. Validar edição por autor e ancoragem após mudar a fonte. |
| **5 — Comentários em fio** | Reusar transporte e fila da sprint 4. Criar comentários com RLS, fio, avatars, ícone e contagens. | A grifa, B responde e A replica. Ambos veem o fio, inclusive após reconectar. Testar exclusão por autor e E2E com dois contextos. |
| **6 — Dicionário** | Usar a fonte e a licença aprovadas na sprint 0. Gerar prefixos PT/EN, detectar idioma do EPUB e tratar lemas e hífens. Integrar consulta, cache, atribuição e estado offline. | Medir cobertura da amostra de 100 palavras por idioma, com alvo proposto de 90%. Consultar em dois livros e verificar prefixo em cache e indisponível em modo avião. |
| **7 — Robustez e lançamento** | Validar atualização offline do PWA, diagnóstico, desempenho e acessibilidade. Escolher plano Supabase, testar restauração de backup e rodar beta antes de liberar o convite. | Completar roteiro no iPhone e Android, incluindo leitura, grifos e comentários em modo avião. Restaurar backup num banco novo e registrar o resultado do beta. |

## Sprint 0 em execução

1. **Fundação do repositório.** Salvar especificação e instruções, criar esqueleto Next.js, tokens iniciais, fontes locais, manifest, service worker e CI. Validar instalação, temas e shell offline em automação.
2. **Ambiente de preview e acesso.** Configurar preview na Vercel, projeto Supabase e credenciais Google OAuth. Documentar callbacks, renovação e teste no PWA instalado.
3. **Dicionário PT.** Inspecionar amostra real, qualidade das definições, tamanho e atribuição. Registrar a decisão antes do pipeline editorial.

O roteiro de validação, as evidências esperadas e as pendências desta sprint estão em [aceitação da sprint 0](sprint-0-aceitacao.md).

## Sprint 1 em execução

O catálogo de desenvolvimento em `/dev/design` começa com `Button`, `Text`
e `Heading`, além de `TextField` e `TextArea` com estados de erro e desabilitado. A validação manual dos componentes inclui foco por teclado,
toque em 320 px, texto ampliado e os painéis Dia e Noite. O fluxo com
convite depende da validação do Google OAuth instalado na sprint 0.
