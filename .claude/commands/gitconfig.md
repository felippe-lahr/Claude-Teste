Configura o pipeline completo: repositório GitHub + Railway auto-deploy. Após a configuração, cada git push dispara um novo deploy automaticamente.

## Como usar
/gitconfig [nome do projeto]

---

## Fluxo de execução

### 1. Verificar pré-requisitos
```bash
gh --version    # GitHub CLI
railway --version  # Railway CLI
```
Se faltar algum, mostrar os comandos de instalação antes de continuar.

### 2. Coletar informações
Pergunte em uma única mensagem:
- Nome do repositório (sem espaços, lowercase)
- Descrição curta
- Visibilidade: public ou private
- O projeto já tem código ou começa do zero?

### 3. Autenticar os CLIs
```bash
gh auth status
railway whoami
```
Se não autenticado, orientar o login em cada um.

### 4. Preparar o projeto local
- Criar `.gitignore` se não existir (incluir obrigatoriamente: `node_modules/`, `.env`, `.next/`)
- Criar `railway.json` se não existir
- Garantir script `start` com `${PORT:-3000}` no package.json

### 5. Git + GitHub
```bash
git init
git branch -M main
git add .
git commit -m "chore: initial project setup"
gh repo create <nome> --description "<desc>" --<public|private> --source=. --remote=origin --push
```

### 6. Railway
```bash
railway init
```
Depois, guiar o usuário pelo painel Railway para conectar o repositório GitHub:
Settings → Source → Connect Repo → selecionar repo → branch: main → Auto Deploy: ON

### 7. Variáveis de ambiente
Listar as variáveis necessárias para o projeto e orientar onde adicioná-las no Railway (Variables).

### 8. Validar o pipeline
Fazer um commit de teste, push, e confirmar que o Railway iniciou o build.

### 9. Relatório final
Tabela com: repo GitHub, branch de deploy, auto-deploy status, próximos passos.
