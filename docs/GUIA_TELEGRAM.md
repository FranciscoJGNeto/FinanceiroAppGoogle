# Guia — Bot do Telegram (lançar por mensagem)

Lance gastos mandando uma mensagem ao seu bot, ex.: **"Mercado 85,90 Inter"**.
O app **continua privado** (`MYSELF`): em vez de webhook público, um gatilho consulta o
Telegram a cada minuto (só requisições de saída).

## Passo a passo

1. **Crie o bot** no Telegram: fale com o **[@BotFather](https://t.me/BotFather)** → `/newbot`
   → escolha um nome e um @usuário. Ele devolve um **token** no formato `123456:ABC-DEF...`.
2. No app, abra **Config → 🤖 Bot do Telegram**, cole o **token** e **Salvar configuração**.
3. **Autorize o novo acesso** (1ª vez): o bot usa `UrlFetchApp` (requisições externas).
   Se pedir autorização, aceite. Se travar, rode `verificarTelegram` uma vez pelo editor do
   Apps Script para conceder a permissão.
4. **Descubra seu chat id:** no Telegram, mande **`/id`** para o bot e clique em **🔄 Verificar
   agora** no app. O bot responde com o seu chat id — cole no campo **"Seu chat id"** e salve.
   (Por segurança, o bot só registra lançamentos vindos desse chat.)
5. Clique em **⏰ Ativar automático**. Pronto — mande mensagens ao bot.

## Como escrever a mensagem

```
Mercado 85,90 Inter      → despesa "Mercado", R$ 85,90, conta Inter
Uber 25                  → despesa "Uber", R$ 25 (sem conta)
+Salário 3000 Inter      → receita "Salário", R$ 3000, conta Inter
Farmácia 42.50           → aceita ponto ou vírgula no valor
```

- O **valor** é o primeiro número da mensagem.
- A **conta** é reconhecida se bater com uma conta cadastrada (aba Contas); senão fica vazia.
- Começa com **`+`** ou contém "salário/receita/entrada" → vira **receita**; senão, **despesa**.
- Palavras restantes viram a **descrição**. O lançamento entra com a **data de hoje**.

## Observações

- **Latência:** ~1 minuto (o gatilho checa a cada minuto). Use **"Verificar agora"** para
  processar na hora.
- **Privacidade:** o token fica em `PropertiesService` (não aparece no app depois de salvo,
  só os últimos 4 dígitos). O app **não** fica público.
- **Desativar:** botão **🚫 Desativar automático** remove o gatilho (o bot para de lançar).
