# Plano de Melhoria Visual — Financeiro

> **Status (onde entrou no [CHANGELOG.md](../CHANGELOG.md)):**
> ✅ **#2** cores despesa/receita + barra do % salário → **v6** · ✅ **#5** máscara de moeda → **v7** ·
> ✅ acordeões → **v8** (recolher/expandir tudo → **v24**; correção do recolher no desktop → **v25**) ·
> ✅ **#6** gráficos/dashboard + paleta acessível → **v9** (correção das cores SVG → **v10**) ·
> ✅ **#10** teclados/mobile (enterkeyhint) → **v7** ·
> ✅ **#7** navegação por telas (app SPA com barra inferior/sidebar) → **v30** ·
> ✅ **tema escuro neumórfico** (fundo preto + textura de papel + cifrão em relevo, superfícies translúcidas, tokens `--nm-*`) → **v31**/**v34** ·
> ✅ troca de mês no cabeçalho + botão **"Hoje"** → **v31**/**v36** ·
> ✅ **#4** (parte) **toasts** de feedback flutuante → **v40** ·
> ✅ **#9** (parte) a11y — `prefers-reduced-motion`, `role=status` nos toasts, `aria-label` em botão de ícone → **v40**.
> ⏳ Pendentes — **#1** tokens de design (espaçamento/tipografia) · **#3** ícones SVG no lugar de emojis · **#4** **skeleton loading** · **#8** tema claro · **#9** a11y completa (foco, contraste).

> **Obs.:** o "Mockup textual" abaixo é histórico (layout antigo de acordeão único com contas
> fixas); a UI atual é o app com telas + tema neumórfico descrito no CHANGELOG.

Objetivo: elevar o app de "funcional" para "agradável e legível", mantendo a identidade escura atual e sem exigir build (compatível com Apps Script).

Prioridade: 🟢 Alto impacto/baixo esforço · 🟡 Médio · 🔵 Estratégico (mais trabalho)

---

## 1. 🟢 Sistema de design consistente (design tokens)
Hoje há valores mágicos espalhados no CSS. Consolidar em tokens facilita manutenção e coerência.

- **Escala de espaçamento:** `--sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-6: 24px;` e usar só esses.
- **Escala tipográfica:** definir `--fs-xs/sm/md/lg/xl` em vez de `12/13/14/16/18px` avulsos.
- **Raios e sombras:** já existe `--r` e `--shadow`; adicionar `--r-sm` e `--r-lg`.
- **Cores semânticas:** separar "cor de marca" de "cor de significado" (receita = verde, despesa = vermelho, alerta = ambr).

## 2. 🟢 Cores com significado financeiro
- Valores de **despesa** em vermelho suave, **entradas/salário/saldo positivo** em verde.
- `Previsão Final` e `Saldo Atual`: verde se ≥ 0, vermelho se < 0.
- `% do salário`: barra de progresso colorida (verde < 70%, âmbar 70–100%, vermelho > 100%) — dá leitura instantânea.

## 3. 🟢 Reduzir dependência de emojis como ícones
Emojis renderizam diferente em cada SO e prejudicam acessibilidade. Migrar para um set de ícones SVG inline (ex.: Lucide/Feather, copiáveis como SVG). Manter 1–2 emojis no máximo por seção como enfeite, não como informação.

## 4. 🟡 Feedback e estados
- **Toasts** (notificação flutuante) no lugar das mensagens inline `.msg` para "Salvo!", "Erro", etc. — menos deslocamento de layout.
- **Skeleton loading** nos KPIs e na lista enquanto o `google.script.run` responde (hoje mostra "—").
- **Estado vazio** já existe na lista; padronizar um componente de "empty state" reutilizável (ícone + texto + ação).
- **Estado de erro** com botão "Tentar novamente".

## 5. 🟡 Máscara e UX de valores
- Campo de valor com máscara pt-BR ao digitar (ex.: `1.234,56`) — hoje é `type=number` cru. (Ver interação com o parser do backend no plano de código.)
- Formatar valores grandes de forma compacta nos KPIs quando necessário (ex.: `R$ 1,2 mil`) com o valor completo no `title`.

## 6. 🟡 Visualização de dados (gráficos)
Finança pede gráficos. Sem build, usar **SVG inline** ou uma lib leve via CDN (ex.: Chart.js). Sugestões:
- **Rosca (donut):** gastos por conta (Inter/Itaú/Conta Simples) ou por categoria.
- **Barras:** evolução do total gasto nos últimos 6 meses.
- **Linha/área:** saldo/previsão ao longo do tempo.
- **Barra de progresso:** % do salário consumido.
> Diretriz de cores/legibilidade de gráficos: seguir um único sistema de cores acessível (mesma paleta em light/dark), rótulos legíveis e contraste adequado.

## 7. 🟡 Hierarquia da tela de resumo
- Destacar 2–3 KPIs "heróis" (Total Ajustado, Saldo, Previsão) maiores no topo; os demais menores abaixo.
- Agrupar visualmente: "Gastos" | "Compartilhado/Reembolso" | "Situação (saldo/previsão)".

## 8. 🔵 Tema claro + preferência do sistema
- Adicionar tema claro e alternância manual (persistir em `localStorage`).
- Respeitar `@media (prefers-color-scheme)` no primeiro carregamento.
- Garantir contraste AA nos dois temas.

## 9. 🟢 Acessibilidade (a11y)
- `aria-label` em botões que só têm emoji.
- Estados de `:focus-visible` claros (hoje o foco depende de cor de borda).
- Contraste de texto secundário (`--muted` em `.72` pode falhar AA em alguns fundos).
- `prefers-reduced-motion` para desativar animações.
- Associar `<label for>` a todos os campos (a maioria já tem).

## 10. 🟡 Polimento mobile
- Barra de ação fixa: sombra/gradiente para separar do conteúdo ao rolar (já parcial).
- `input` numérico com `enterkeyhint` e teclado adequado.
- Evitar "pulos" de layout quando o teclado abre.

---

## Sequência sugerida
1. Tokens (#1) + cores semânticas (#2) + progresso do % salário — base rápida e visível.
2. Toasts/skeleton (#4) + máscara de valor (#5).
3. Ícones SVG (#3) + a11y (#9).
4. Gráficos (#6) + hierarquia (#7).
5. Tema claro (#8) — por último, pois exige revisar todos os tokens.

## Mockup textual do resumo repaginado
```
┌──────────────────────────────────────────────┐
│  Julho / 2026                         🔄       │
│                                                │
│   TOTAL AJUSTADO        SALDO ATUAL            │
│   R$ 1.842,10  ▼        R$ 1.288,84  ▲         │
│   [██████████░░] 65% do salário (verde)        │
│                                                │
│   Previsão fim do mês:  R$ 2.276,51 ▲          │
│  ┌───────── gastos por conta ─────────┐        │
│  │        ◕  Inter 58%                 │        │
│  │        ◑  Itaú 30%                  │        │
│  │        ◔  Conta Simples 12%         │        │
│  └────────────────────────────────────┘        │
└──────────────────────────────────────────────┘
```
