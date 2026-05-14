Executa o pipeline completo para enviar o código atual para produção no Railway.

Siga este fluxo obrigatoriamente:

## 1. Verificar estado atual
```bash
git status
git diff --stat
git log --oneline -5
```
Identifique: branch atual, branch de deploy (a que o Railway escuta), arquivos alterados.

## 2. Rodar o build
```bash
npm run build 2>&1 | tail -20
```
Se o build **falhar**: pare imediatamente e informe o erro. Não faça commit.
Se passar: continue.

## 3. Commit
```bash
git add -A
```
Verifique se `.env` está sendo incluído — se estiver, exclua manualmente.
Gere uma mensagem de commit descritiva baseada no que foi desenvolvido nesta sessão.
```bash
git commit -m "$(cat <<'EOF'
<tipo>: <descrição do que foi feito>

https://claude.ai/code/session_017agKN8EMZ331aj9Zy6wQ4K
EOF
)"
```

## 4. Push da branch de feature
```bash
git push -u origin <branch-atual>
```

## 5. Merge na branch de deploy e push para o Railway
```bash
git checkout <branch-deploy>
git pull origin <branch-deploy>
git merge <branch-atual> --no-edit
git push -u origin <branch-deploy>
```
O push dispara o deploy automático no Railway.

## 6. Voltar para a branch de feature
```bash
git checkout <branch-atual>
```

## 7. Relatório final
Mostre: mensagem do commit, branches usadas, confirmação do push, link do Railway.

**Regras:**
- Nunca force push sem permissão explícita
- Se houver conflito no merge, pare e pergunte como resolver
- Se não houver nada para commitar, informe sem criar commit vazio
