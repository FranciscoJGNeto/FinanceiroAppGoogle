# Plano de alterações — lote "mobile + backup + importação"

Solicitado em 2026-07-03. Executado em ordem; cada item marcado ao concluir.

> **Onde entrou no [CHANGELOG.md](../CHANGELOG.md):** todo este lote foi entregue na **v24**
> (instalar no celular, recolher/expandir tudo, backup XML, importar OFX). A correção do
> "recolher" da Análise no desktop saiu na **v25**.

## Contexto / limitação importante (app "instalável" no celular)

O app roda **dentro de um iframe sandbox** servido pelo Google Apps Script
(`script.google.com` no topo, seu `index.html` num iframe `googleusercontent.com`).
Por causa disso, um **PWA instalável de verdade é impossível** pela URL `/exec`:

- o evento `beforeinstallprompt` **não dispara** dentro do iframe → o antigo botão
  "Instalar App" nunca aparecia (parecia quebrado);
- o `<link rel="manifest">` do iframe é **ignorado** pelo navegador (ele só lê o
  manifest do documento do topo);
- **service worker não pode** ser registrado no sandbox (sem offline real).

**O que dá para fazer (e foi feito):** transformar o botão de instalar num guia
**"Adicionar à tela inicial"** que detecta a plataforma (Android/iOS/desktop) e
mostra os passos reais. Isso cria um **ícone na tela inicial** — o caminho que de
fato funciona no Apps Script. (Migrar para um PWA 100% instalável exigiria sair do
Apps Script; ver [PLANO_MIGRACAO_PGLITE.md](../arquitetura/PLANO_MIGRACAO_PGLITE.md).)

## Itens (em ordem)

1. **[x] Instalação no celular** — remover o prompt automático que nunca dispara e
   colocar um botão **📱** no topo com instruções por plataforma (iOS Safari /
   Android Chrome / desktop). Deixar claro que é "adicionar à tela inicial".

2. **[x] Recolher/expandir tudo** — botão no cabeçalho que fecha (ou abre) **todos
   os acordeões de uma vez**, com o estado salvo por painel (localStorage). O rótulo
   alterna entre "Recolher" e "Expandir" conforme o estado atual.

3. **[x] Backup em XML (além de CSV)** — manter o CSV e adicionar **exportar em XML**
   (formato mais estruturado). Dois botões no painel Backup. Backend:
   `exportarBackupXML()` gera `<financeiro><transacao>…</transacao></financeiro>`
   no Drive (mime `application/xml`, tags derivadas dos cabeçalhos).

4. **[x] Importar formatos de banco (OFX)** — além do CSV, aceitar **OFX**
   (`.ofx` / "extrato OFX"), o padrão de mercado exportado pelos apps dos bancos
   (Nubank, Itaú, Bradesco, Inter, C6, etc.). Detecção automática do formato;
   parser tolerante a OFX v1 (SGML) e v2 (XML). Usa o mesmo fluxo prévia → importar
   (com dedup e auto-categorização já existentes).

5. **[x] Docs** — atualizar CHANGELOG (v24) e README com backup XML, importação OFX,
   recolher-tudo e a nota sobre instalação.

## Ideias fora deste lote (futuro)

- Importar **QIF** e **CSV padronizados por banco** (mapa de colunas por banco).
- Backup **agendado** (gatilho) enviado por e-mail/Drive.
- Recorrentes automáticos, metas de economia, relatório anual.
