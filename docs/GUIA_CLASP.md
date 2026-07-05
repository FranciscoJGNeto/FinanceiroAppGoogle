# Guia — Enviar as correções para o Google Apps Script com `clasp`

`clasp` é a CLI oficial do Google para sincronizar projetos Apps Script locais com a nuvem.
Node e npm já estão instalados nesta máquina (Node v24, npm 11).

> **ID do projeto:** `1uQRTmDmcLXq5Bk-tq98u7ZpBQJYCh2mknHR-r9b4SgKIvlEj8j4kFqR1`

---

## Passo 0 — Habilitar a API do Apps Script (uma vez só)

Sem isso o `clasp` não consegue acessar seu projeto.

1. Acesse: https://script.google.com/home/usersettings
2. Ligue a opção **"Google Apps Script API"** (deixe **On/Ativado**).

---

## Passo 1 — Instalar o clasp

No PowerShell:

```powershell
npm install -g @google/clasp
clasp --version
```

Se `clasp --version` não for reconhecido depois de instalar, **feche e reabra o PowerShell** (para recarregar o PATH).

---

## Passo 2 — Fazer login

```powershell
clasp login
```

Isso abre o navegador. Faça login com **a conta Google dona do projeto** e autorize.

---

## Passo 3 — Clonar o projeto numa pasta separada

Fazemos isso numa pasta nova para **não sobrescrever** seus arquivos já corrigidos e para trazer o `appsscript.json` (manifesto de configuração) e o `.clasp.json` (vínculo com a nuvem).

```powershell
cd "C:\Users\fjgne\Downloads\Projetos"
mkdir FinanceiroApp_clasp
cd FinanceiroApp_clasp
clasp clone "1uQRTmDmcLXq5Bk-tq98u7ZpBQJYCh2mknHR-r9b4SgKIvlEj8j4kFqR1"
```

Depois do clone você verá algo como:
- `appsscript.json`
- `.clasp.json`
- o arquivo de script da nuvem (ex.: `Codigo.js` ou `codigo.js`)
- `index.html`

> Observação: o `clasp` baixa arquivos de script `.gs` com a extensão **`.js`** localmente — isso é normal; no `push` ele volta como `.gs` na nuvem.

---

## Passo 4 — Copiar suas correções para dentro da pasta clonada

Copie o conteúdo corrigido por cima dos arquivos clonados.

```powershell
# Ajuste o nome do arquivo de script de destino conforme o que apareceu no clone.
# Se o clone criou "codigo.js":
Copy-Item "..\FinanceiroAppGoogle\Codigo.js" ".\codigo.js" -Force

# Se o clone criou "Codigo.js" (nome padrão em português):
# Copy-Item "..\FinanceiroAppGoogle\Codigo.js" ".\Codigo.js" -Force

# HTML (mesmo nome nos dois lados):
Copy-Item "..\FinanceiroAppGoogle\index.html" ".\index.html" -Force
```

> Se os nomes de arquivo do script não baterem entre local e nuvem, o `clasp` criaria um arquivo novo em vez de atualizar o existente. Por isso copie **para o arquivo que o clone criou** (mesmo nome).

---

## Passo 5 — Conferir o que será enviado e fazer o push

```powershell
clasp status      # mostra os arquivos que serão enviados
clasp push        # envia para a nuvem
```

Se pedir confirmação por causa de diferença de manifesto, use:

```powershell
clasp push --force
```

---

## Passo 6 — Publicar a nova versão do Web App

O `push` atualiza o **código**, mas o link `/exec` público continua servindo a **implantação (deployment) antiga** até você publicar uma nova versão.

**Opção A — pela CLI:**
```powershell
clasp deploy --description "Correcoes: valor, fuso, manifest, reembolso"
```

**Opção B — pelo editor (recomendado para manter a MESMA URL):**
1. Abra o projeto no editor do Apps Script.
2. **Implantar → Gerenciar implantações**.
3. Na implantação existente, clique no lápis (Editar) → **Versão: Nova versão** → **Implantar**.
   Isso mantém a **mesma URL** e publica o código novo.

---

## Fluxo de trabalho no futuro (depois de configurado)

Uma vez que a pasta `FinanceiroApp_clasp` está vinculada, o ciclo vira:

```powershell
cd "C:\Users\fjgne\Downloads\Projetos\FinanceiroApp_clasp"
# ...edita os arquivos...
clasp push
clasp deploy --description "o que mudou"
```

---

## Alternativa simples (sem clasp)

Se preferir não usar CLI: abra o editor do Apps Script, e **copie e cole** manualmente:
- o conteúdo de [Codigo.js](../src/Codigo.js) no arquivo de script; e
- o conteúdo de [index.html](../src/index.html) no arquivo HTML.

Depois **Implantar → Gerenciar implantações → Nova versão**. Mesmo resultado, sem instalar nada.
