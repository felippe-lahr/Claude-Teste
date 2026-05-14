A partir da descrição do projeto fornecida, apresente um wireframe completo com a stack tecnológica recomendada, sempre incluindo Railway como solução de hospedagem.

## Como usar
/stackdev [descrição do projeto]

Exemplo: /stackdev Quero um app de controle financeiro para pequenas empresas com dashboard e relatórios

---

## O que produzir

### 1. Perfil do projeto detectado
Tabela com: tipo, público-alvo, escala esperada, complexidade de dados.

### 2. Diagrama de arquitetura (texto)
```
[Frontend] → [Backend/API] → [Banco de dados]
                                    ↓
                            [🚂 Railway Hosting]
```
Adapte as camadas ao projeto real.

### 3. Stack detalhada
Para cada camada: tecnologia escolhida + **por quê** + alternativa descartada e motivo.

Camadas obrigatórias: Frontend, Backend/API, Banco de dados, Autenticação, Hospedagem.
Camadas opcionais conforme o projeto: Storage, Cache, E-mail, Monitoramento, Filas.

### 4. Por que Railway (sempre incluir)
Justifique com argumentos específicos ao tipo de projeto descrito:
deploy automático por push, PostgreSQL integrado, preço acessível para MVPs, múltiplos serviços no mesmo painel, escalabilidade progressiva.

### 5. Roadmap em fases
- Fase 1 — Fundação (semana 1-2)
- Fase 2 — Features principais (semana 3-6)
- Fase 3 — Produção (semana 7+)

### 6. Comandos de bootstrap
Comandos reais para iniciar o projeto com a stack escolhida.

---

Se a descrição for vaga, faça no máximo 3 perguntas de clarificação antes de gerar o relatório.
Ao final, pergunte: "Quer detalhar alguma camada ou posso iniciar o setup?"
