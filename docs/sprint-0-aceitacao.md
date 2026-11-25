# Aceitação da sprint 0

| Verificação | Evidência |
| --- | --- |
| Shell abre pela primeira vez | Build de produção e navegação em navegadores desktop e mobile simulados. |
| Shell permanece disponível offline | Abrir uma vez sob controle do service worker, desligar a rede, recarregar e conferir a tela e as fontes. |
| Instalação em iOS e Android | Abrir o preview HTTPS, adicionar à tela inicial e relançar pelo ícone. Registrar aparelho, versão e resultado. |
| Google OAuth no iOS instalado | Entrar com conta de teste e conferir nome e foto. Fechar e reabrir, testar renovação, abrir offline e reconectar. Registrar se o callback retorna à janela instalada ou se é necessária alternativa. |
| Supabase e Vercel | Registrar URLs de preview e callback, com time-box e inatividade desativados. Guardar credenciais nas plataformas. |
| Dicionário PT | Registrar amostra real, licença e atribuição da fonte escolhida, limites de qualidade e próximos passos. |

O PR de fundação cobre testes automatizados do shell. Preview, OAuth, execução em aparelho real e decisão editorial continuam pendentes.
