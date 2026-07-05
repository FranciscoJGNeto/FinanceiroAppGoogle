# Histórico de mudanças

Versões referem-se às implantações publicadas no Apps Script (`clasp` → `redeploy`).
O código está versionado no GitHub (privado) e sincronizado com o Apps Script.

## v42 — Plano visual: design tokens (#1)
- **Sistema de design em variáveis:** escala de **espaçamento** (`--sp-1..6`), **tipografia** (`--fs-xs..xl`) e **raios** (`--r-sm/--r/--r-lg`).
- Fontes e raios do app passaram a usar os tokens (substituição **1:1**, sem mudança visual) — deixando o **tema claro (#8)** trivial depois (basta sobrescrever os tokens).

## v41 — Plano visual: skeleton loading + foco/contraste
- **Skeleton loading:** enquanto os dados chegam, os KPIs e a lista mostram um **shimmer** (em vez de "—"), deixando a espera mais suave.
- **Acessibilidade:** **foco visível** (`:focus-visible`) em botões, campos e navegação; **contraste** do texto secundário aumentado. (Respeita `prefers-reduced-motion` — sem shimmer para quem prefere menos animação.)

## v40 — Consolidação + 1ª onda visual (toasts/a11y) + novo plano
- **Consolidação:** suíte de **134 testes** verde, frontend remontável (index+styles+js), links dos .md validados e **remoção de código morto** (funções órfãs do antigo "recolher tudo").
- **Toasts:** feedback flutuante ao salvar/excluir lançamento (some sozinho; erros ficam mais tempo).
- **Acessibilidade:** respeita `prefers-reduced-motion`, toasts com `role="status"`, `aria-label` no botão de instalar.
- **Docs atualizados** (ANALISE para v39 com Telegram/backup agendado; plano visual).
- **Novo plano:** [PLANO_FEATURES_FINANCEIRAS.md](planos/PLANO_FEATURES_FINANCEIRAS.md) — próximas ondas (patrimônio, dívidas, reserva, comparativos, alertas, assinaturas, regras de categoria…) viáveis na arquitetura atual.

## v39 — Bot do Telegram (Onda 7.8) — lançar por mensagem
- **Lançar gasto por mensagem:** mande **"Mercado 85,90 Inter"** ao seu bot e vira lançamento. Painel **Config → 🤖 Bot do Telegram** (token, chat id, ativar/verificar agora).
- **Mantém o app privado** (`MYSELF`): em vez de webhook público, um **gatilho consulta o Telegram a cada minuto** (só requisições de saída via `UrlFetchApp`). Segurança: só aceita mensagens do seu **chat id**.
- Parser tolerante (valor BR/US, conta por nome cadastrado, `+`/palavra-chave = receita). Backend: `parseLancamentoMsg_`, `getConfigTelegram`/`setConfigTelegram`, `verificarTelegram`, `instalar/removerGatilhoTelegram` (config em `PropertiesService`).
- Passo a passo em [GUIA_TELEGRAM.md](GUIA_TELEGRAM.md). Novo scope `UrlFetchApp` (autorizar 1×). Testes: **134 checagens**.

## v38 — Fix do cabeçalho no celular
- Corrigido o **cabeçalho quebrando em duas linhas** no celular quando o botão **"Hoje"** aparecia. Agora os controles ficam em **uma linha só** (sem quebra), com compactação em telas estreitas (≤560px): subtítulo escondido, botões e o rótulo do mês menores; o título encolhe com reticências antes de cortar qualquer controle.

## v37 — Backup agendado (Onda 7.7)
- No painel **Backup**, opção de **backup automático**: um gatilho gera uma cópia **CSV no Drive** periodicamente (às 3h), com frequência **mensal** (dia 1º) ou **semanal** (segunda). Ativar/desativar pelo app.
- Backend: `backupAgendado` + `instalar/remover/statusGatilhoBackup` (usa `ScriptApp` e guarda a frequência em `PropertiesService`).
- Testes: **121 checagens** (instalar/status/remover + troca de frequência + execução do gatilho).
- **README atualizado** (contagem de testes 68→114→121, roadmap da Onda 7, tabela de recursos com relatório anual e 50/30/20).

## v36 — Voltar ao mês atual + docs atualizados
- **Botão "Hoje"** no cabeçalho: ao navegar por outros meses, aparece um botão que **volta ao mês atual** com um toque (fica escondido quando já é o mês corrente).
- **Documentação atualizada** para o estado atual: a transição de "uma página com vários acordeões" para o **app com telas (navegação SPA)**, o tema neumórfico e a divisão do frontend em `index/styles/js` foram refletidos em `ANALISE_PROJETO`, `README` e no plano visual.

## v35 — Importar QIF + CSV por banco (Onda 7.6)
- **QIF:** importação do formato QIF (exportado por vários bancos/apps de finanças) — detecção automática, registros `D`/`T`/`P`/`M`/`^`.
- **CSV por banco:** além de colunas Data/Descrição/Valor, reconhece **colunas separadas de Débito/Crédito** (ou Entrada/Saída) e calcula o valor (crédito entra, débito sai). Mais sinônimos de cabeçalho (date, estabelecimento, detalhe…).
- Reaproveita o fluxo prévia → importar (dedup + auto-categorização). Parsers validados por testes de sandbox.

## v34 — Ajustes do tema (transparência, textura, scroll)
- **Cards translúcidos:** painéis, KPIs e campos agora deixam **ver a textura e o cifrão ao fundo**.
- **Textura de papel mais visível/definida** (grão maior e mais opaco).
- **Corrigido o scroll horizontal no celular:** o cabeçalho usava `margin` negativa sendo filho direto do `body` (ficava mais largo que a tela); agora sem overflow (+ `overflow-x: clip` de segurança, preservando o cabeçalho fixo).

## v33 — Código do frontend dividido em parciais (include)
- O `index.html` (~2.900 linhas) foi **dividido em 3 arquivos** servidos juntos via template do Apps Script: **`index.html`** (só a estrutura/markup), **`styles.html`** (todo o CSS) e **`js.html`** (todo o JS).
- `doGet` passou a usar `HtmlService.createTemplateFromFile('index').evaluate()` + a função `include()`; a página final é idêntica para o usuário (um único HTML), só a organização do código mudou.
- Fecha o item **C1** do [plano de código](planos/PLANO_MELHORIA_CODIGO.md). Testes: **114 checagens** (backend inalterado).

## v32 — Regra 50/30/20 (Onda 7.5)
- Novo painel **⚖️ Regra 50/30/20** (tela Planejar): classifique cada categoria em **Essencial** (alvo 50%), **Desejo** (30%) ou **Poupança** (20%) e veja **3 barras com o real × o alvo** (marcador na meta), além do que está **não classificado**.
- Classificação feita **na hora** por um seletor ao lado de cada categoria do mês.
- Backend: aba `Classificacao` + `getRegra503020`/`getClassificacao`/`setClasseCategoria`.
- Testes: **114 checagens**.

## v31 — Tema preto neumórfico + seletor de mês no cabeçalho
- **Novo visual:** fundo **totalmente preto** com **textura de papel** (ruído SVG inline), superfícies em **relevo neumórfico** e campos/KPIs **debossed** (afundados) em tons escuros, com um **cifrão ($) em relevo** como marca d'água ao fundo. Tudo self-contained (sem imagens externas — compatível com o sandbox do Apps Script).
- **Seletor de mês no cabeçalho:** setas ‹ › para trocar de mês de **qualquer tela**; o rótulo do mês leva ao resumo. (Substitui o botão "recolher tudo" no topo.)
- Tokens de sombra neumórfica (`--nm-out`/`--nm-in`) aplicados a painéis, botões, campos, KPIs e à navegação.

## v30 — Navegação por telas (app SPA)
- O app deixou de ser um **scroll único** de acordeões e virou um **app com telas**: os painéis foram agrupados em 5 telas trocadas por JavaScript, **sem recarregar**.
  - **Celular:** barra de navegação **inferior** (🏠 Início · ➕ Lançar · 📊 Análise · 🎯 Planejar · ⚙️ Config).
  - **Desktop:** a mesma navegação vira **menu lateral** (sidebar).
- Agrupamento: **Início** (resumo) · **Lançar** (novo lançamento + transações) · **Análise** (gráficos, relatório anual, parcelas, fatura, compartilhado) · **Planejar** (orçamentos, metas, lembretes) · **Config** (contas, importar, backup).
- A tela ativa é **lembrada** (localStorage); a barra "Salvar" fixa aparece só na tela **Lançar**.
- Tudo isso continua em **um único HTML servido** (sem múltiplas páginas/recarregamento) — só a organização visual mudou. Base para depois dividir o código em parciais via `include()` (item C1 do plano de código).

## v29 — Fatura de cartão (Onda 7.4)
- Novo painel **💳 Fatura de cartão**: mostra a **fatura prevista de cada cartão** no ciclo que **fecha no mês selecionado** — agrupa os lançamentos com meio **Cartão** na janela (fechamento anterior, fechamento atual], com data de fechamento e **vencimento por ciclo** (não por competência).
- **Contas** ganham **dia de fechamento e vencimento** (opcionais). A aba `Saldos` passa a ter colunas `Fechamento`/`Vencimento` (auto-criadas). Contas-cartão aparecem com um selo (💳 fecha dia X · vence Y).
- Backend: `getFaturaCartao(mesISO)` + `setConta`/`getContas` estendidos.
- Testes: **108 checagens** (janela do ciclo, exclusão de débito e ciclos vizinhos, cálculo do vencimento).

## v28 — Relatório anual (Onda 7.3)
- Novo painel **📅 Relatório anual**: visão do ano inteiro com **seletor de ano** (só anos com dados).
  - KPIs: receitas, despesas, saldo e **média mensal** de despesa.
  - Gráfico **Receitas × Despesas por mês** (barras agrupadas verde/vermelho, 12 meses).
  - **Despesas por categoria** do ano e **maiores gastos** (top 10).
- Backend: `getRelatorioAnual(ano)` (totais por mês/categoria, top gastos, média, lista de anos).
- Testes: **99 checagens** (totais, exclusão de outros anos, categorias, top, média).

## v27 — Metas de economia (Onda 7.2)
- Novo painel **🏆 Metas de economia**: defina quanto quer guardar (economia = **receitas − despesas**).
  - **Meta mensal:** guardar R$ X por mês; progresso = economia do mês atual.
  - **Meta total:** juntar R$ Y até um **prazo** (mês); progresso = economia **acumulada desde a criação** + **meses restantes**.
- Barra de progresso colorida (azul → verde ao bater 100%, vermelho se a economia ficou negativa) e 🏆 ao atingir a meta. Criar/editar/remover.
- Backend: nova aba `Metas` + `getMetas`/`setMeta`/`deleteMeta` (helper `netPorMes_`).
- Testes: **87 checagens** (progresso mensal e total + meses restantes + CRUD).

## v26 — Recorrentes automáticos (Onda 7.1)
- No painel **Transações**, botão **⏰ Gerar automático**: cria um **gatilho mensal** (dia 1º, ~06h) que roda `gerarRecorrentes` no mês atual — sem precisar clicar todo mês. Idempotente (não duplica). Status mostrado abaixo do botão; dá para desativar a qualquer momento.
- Backend: `verificarRecorrentes` + `instalar/remover/statusGatilhoRecorrentes` (usa `ScriptApp` — requer autorização de gatilhos na 1ª vez, como os lembretes).
- Testes: **75 checagens** (cobre instalar/status/remover + verificar).

## v25 — Fix recolher no desktop + planos futuros/alternativos
- **Bug corrigido:** a **Análise** não recolhia no computador — a regra `#bodyAnalise { display:grid }` (seletor de ID) vencia o `display:none` do acordeão por especificidade. Trocado por `.acc:not(.collapsed) #bodyAnalise`.
- Docs: **Onda 7** no [PLANO_FUNCIONALIDADES](planos/PLANO_FUNCIONALIDADES.md) (ideias futuras em ordem) e **planos de arquitetura alternativos** ([PLANOS_ALTERNATIVOS](arquitetura/PLANOS_ALTERNATIVOS.md): front separado, Supabase, local-first).

## v24 — Mobile + backup XML + importação OFX
- **Instalar no celular:** removido o prompt automático que nunca disparava (o app roda num iframe do Apps Script, então `beforeinstallprompt`/manifest não funcionam ali). Novo botão **📱** no topo mostra o passo a passo de **"Adicionar à tela inicial"** por plataforma (iOS Safari / Android Chrome / desktop). Detalhes e limitação em [PLANO_ALTERACOES.md](planos/PLANO_ALTERACOES.md).
- **Recolher/expandir tudo:** botão no cabeçalho que fecha (ou abre) **todos os acordeões de uma vez**; estado salvo por painel. Rótulo alterna conforme o estado.
- **Backup em XML** além de CSV: `exportarBackupXML()` gera `<financeiro><transacao>…</transacao></financeiro>` no Drive (mime `application/xml`, tags derivadas dos cabeçalhos, escaping de `& < >`). Dois botões no painel Backup.
- **Importar OFX:** além de CSV, o painel importa **extrato OFX** (padrão dos apps de banco — Nubank, Itaú, Bradesco, Inter, C6…). Detecção automática do formato; parser tolerante a OFX v1 (SGML) e v2 (XML). Reaproveita a prévia, o dedup e a auto-categorização.
- Testes: **68 checagens** (cobre `exportarBackupXML`).

## v23 — Lembretes de vencimento + mais palavras-chave
- Painel **Lembretes**: cadastrar contas com dia de vencimento, valor e antecedência; ver **próximos vencimentos**.
- **E-mail automático** alguns dias antes (gatilho diário às 8h) — ativar/desativar pelo app; botão **Enviar agora** para testar. 1 e-mail consolidado por mês por lembrete.
- Backend: `getLembretes/setLembrete/deleteLembrete/getLembretesProximos/verificarLembretes` + `instalar/remover/statusGatilhoLembretes` (usa `MailApp` e `ScriptApp` — requer autorização de Gmail/gatilhos na 1ª vez).
- **Auto-categorização** ampliada: muito mais comércios/serviços BR (Rappi, Shopee, Mercado Livre, academias, pedágios, etc.) e novas categorias (Compras, Vestuário).

## v22 — Compartilhamento por lançamento + auto-categorização na importação
- No formulário: marcar **🤝 Compartilhado (Não/Sim)** e o **% que a outra pessoa paga** (rateio próprio de cada lançamento). Colunas novas `Compartilhado`/`Rateio` (auto-criadas).
- **Resumo e acerto de contas** passam a somar o reembolso pelo rateio de cada item (mantendo compatibilidade com o compartilhado por nome de serviço na aba `Servicos`).
- **Importação auto-categoriza** cada lançamento: primeiro pelo seu histórico (descrição já categorizada), depois por palavras-chave de serviços/comércios comuns (Netflix→Assinaturas, Uber→Transporte, etc.).

## v21 — Importar extrato (CSV) + UX da edição de conta
- Novo painel **Importar extrato**: cola/anexa um CSV (Data, Descrição, Valor), pré-visualiza e importa em lote. Negativo = despesa, positivo = receita; **dedup** por data+descrição+valor. Backend: `importarTransacoes(lista)`.
- Parser tolerante: delimitador `,` ou `;`, campos com aspas, valores `1.234,56`/`(50,00)`, datas `dd/mm/aaaa` e `aaaa-mm-dd`.
- **UX:** ao editar uma conta, o botão vira **"Salvar edição de conta"** e aparece **Cancelar**.

## v20 — Correção de contas + saldos por conta
- **Bug corrigido:** o campo de saldo da conta tinha o mesmo `id` (`cSaldo`) do KPI "Saldo Atual" → o saldo digitado era ignorado e **salvava sempre 0**. Input renomeado para `contaSaldo`.
- Novo bloco **Saldos por conta** no Resumo: lista cada conta cadastrada com seu saldo + total (aparece mesmo sem lançamentos).
- Contas com lançamentos continuam aparecendo na rosca da Análise.

## v19 — Backup / exportação (CSV)
- Painel **Backup**: gera um **CSV com todos os lançamentos** no Google Drive e devolve o link.
- CSV com BOM (acentos no Excel) e escaping correto (vírgulas/aspas); datas em `yyyy-MM-dd`.
- Backend: `exportarBackup()` (usa `DriveApp` — requer autorização da permissão de Drive na 1ª vez).

## v18 — Contas dinâmicas
- **Contas gerenciáveis no app** (painel Contas): criar/editar/remover, com saldo — usa a aba `Saldos` como fonte.
- Seletor de conta no formulário **populado dinamicamente** (não mais fixo em Inter/Itaú/Conta Simples).
- **Resumo e rosca por conta agora dinâmicos**: `getResumo` retorna `porConta` (agrupado por qualquer conta), com paleta acessível que escala.
- Backend: `getContas`, `setConta`, `deleteConta`. Testes atualizados (36 checagens).

## v17 — Acerto de contas + suíte de testes
- Painel **Compartilhado**: lista as despesas compartilhadas do mês e mostra **quanto a outra pessoa te reembolsa** (usa o rateio da Config).
- Backend: `getCompartilhados(mesISO)`.
- **Suíte de testes** em `tests/` (Node + mock do Apps Script): 32 checagens cobrindo valores, resumo, CRUD, categorias, orçamentos, parcelas, recorrentes e compartilhado. Rode com `node tests/run.js`.

## v16 — Recorrentes (modo manual) — Onda 3 concluída
- Botão **Gerar recorrentes deste mês**: replica os lançamentos "Recorrente" de meses anteriores no mês atual.
- **Anti-duplicação e idempotente:** não recria itens que já existem no mês (pode clicar várias vezes).
- Usa a ocorrência mais recente de cada recorrente; ajusta o dia ao mês (clamp).
- Backend: `gerarRecorrentes(mesISO)`. (Modo automático por gatilho fica como opção futura.)

## v15 — Projeção de parcelas (Onda 3)
- Painel **Parcelas futuras**: mostra parcelas em aberto (Parcelado com parcela atual < total).
- Total ainda a pagar + gráfico do valor **comprometido nos próximos 6 meses**.
- Backend: `getProjecaoParcelas(mesISO, meses)` (só leitura/cálculo).

## v14 — Sanitização para repositório público
- Removidos dados pessoais dos valores-semente: salário e saldos zerados em `criarEstruturaPlanilha` (só afetam a criação de planilha nova).
- Removido e-mail pessoal e valor de salário de exemplo na documentação.

## v13 — Orçamento intuitivo: sugestões e alerta
- **Sugestões de orçamento** por categoria (média dos últimos 3 meses), com **Aplicar** ou **Rejeitar** (rejeição lembrada por dispositivo).
- **Alerta ao estourar:** ao salvar um gasto que passa do limite da categoria, o app pergunta — **aplicar mesmo assim** ou **rejeitar** o lançamento.
- Backend: `getSugestoesOrcamento(mesISO, meses)`.

## v12 — Orçamento por categoria (Onda 3)
- Nova aba **Orcamentos** (auto-criada).
- Painel **Orçamentos**: definir limite mensal por categoria (máscara de moeda).
- Barra **gasto / limite** colorida (verde < 80%, âmbar ≤ 100%, vermelho > 100%).
- Editar/remover orçamento; usa o gasto real do mês.
- Backend: `getOrcamentos`, `setOrcamento` (upsert), `deleteOrcamento`.

## v11 — Categorias (Onda 2 concluída)
- Coluna **Categoria** (auto-criada); gravada ao adicionar/editar.
- Campo Categoria no formulário com sugestões (datalist).
- Gráfico **Despesas por categoria** (barras horizontais, top 6 + "Outros").
- Pill de categoria nos cards e na tabela; busca considera categoria.
- Backend: `getPorCategoria(mesISO)`.

## v10 — Correção dos gráficos
- Bug: `fill="var(--…)"` não resolve em atributo SVG → barras e número central ficavam invisíveis. Trocado por cores literais.

## v9 — Auto-update + Dashboard (Onda 2)
- Troca de mês atualiza automaticamente (sem botão).
- Painel **Análise** (acordeão) com rosca (despesas por conta) e barras (evolução 6 meses).
- Paleta categórica validada para daltônicos (skill dataviz).
- Backend: `getEvolucao(mesISO, meses)`.

## v8 — Acordeões
- Painéis Resumo, Lançamento e Transações recolhíveis (clique/teclado), com estado lembrado por painel (localStorage).

## v7 — UX do formulário
- Máscara de moeda (digita números → formata R$).
- Toggle Despesa/Receita; parcelas só aparecem quando Tipo = Parcelado.
- Teclados/atributos adequados no mobile.

## v6 — Editar/excluir, receitas e busca (Onda 1)
- `updateTransacao` / `deleteTransacao` por ID; botões editar/excluir na lista.
- Lançamento de **receitas** (não só despesas); separação despesa/receita no resumo.
- Busca/filtro client-side; KPI de Receitas; barra de progresso do % do salário.

## v5 — Fundação
- Mapeamento de colunas por **cabeçalho** (não por índice fixo).
- Coluna **ID** (UUID) + **CriadoEm**; `migrarEstrutura()` para planilhas existentes.
- Validação server-side; leitura de Config por **chave** (não célula fixa).

## v4 — Correções de bugs
- Valor decimal corrompido (`50,50` virava `505`).
- Off-by-one de fuso na data; `setHeaders` inválido no manifest.
- Reembolso perdendo centavos; falso positivo de compartilhado com descrição vazia.
- `LockService` no append; escape de HTML consistente.

## Antes (estado inicial)
- App original em Apps Script + Google Sheets: lançar despesas, resumo por conta, compartilhados/reembolso, previsão de saldo.
- Reorganização em `src/` + `docs/`, vínculo `clasp`, Git e GitHub.
