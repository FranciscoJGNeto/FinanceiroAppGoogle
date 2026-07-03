// Constantes das abas da planilha
const SHEET_TRANS = 'Transacoes';
const SHEET_SERV = 'Servicos';
const SHEET_CONF = 'Config';
const SHEET_SALD = 'Saldos';
const SHEET_ORC = 'Orcamentos';

// Colunas canônicas da aba Transacoes (ordem usada ao criar/completar o cabeçalho).
const TRANS_COLS = ['ID', 'Data', 'Conta', 'Meio', 'Descrição', 'Tipo', 'Natureza', 'Categoria',
  'ParcelaAtual', 'ParcelaTotal', 'Valor', 'Observação', 'CriadoEm'];

// ===================== Helpers genéricos =====================

// Normaliza texto para comparação: minúsculo, sem acento, só alfanumérico.
// Ex.: "Parcela Atual" -> "parcelaatual", "Descrição" -> "descricao".
function norm_(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parseia "YYYY-MM-DD" como data LOCAL (evita o off-by-one do parse UTC de new Date).
function parseLocalDate_(v) {
  if (!v) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(v);
}

// Arredonda para 2 casas decimais (evita perder centavos).
function round2_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Converte valor para número. Aceita number, "50.5" (type=number) ou "1.234,56" (pt-BR).
function toNumBR_(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).trim();
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return parseFloat(normalized) || 0;
}

// Converte um valor para Number com fallback (para leitura de config).
function numFrom_(v, def) {
  if (v === '' || v == null) return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
}

// Ano*100 + mês, a partir de uma data (ou null se inválida).
function toYM_(v) {
  const dt = v instanceof Date ? v : new Date(v);
  if (isNaN(dt)) return null;
  return dt.getFullYear() * 100 + (dt.getMonth() + 1);
}

// Monta o mapa { campo: índiceDaColuna } a partir da linha de cabeçalho normalizada.
// Assim o código não depende mais da POSIÇÃO fixa das colunas.
function colMapTrans_(normHeader) {
  const cand = {
    id: ['id'],
    data: ['data'],
    conta: ['conta'],
    meio: ['meio'],
    descricao: ['descricao'],
    tipo: ['tipo'],
    natureza: ['natureza'],
    categoria: ['categoria'],
    parcelaAtual: ['parcelaatual'],
    parcelaTotal: ['parcelatotal'],
    valor: ['valor'],
    obs: ['observacao', 'obs'],
    criadoEm: ['criadoem']
  };
  const map = {};
  Object.keys(cand).forEach(campo => {
    for (const c of cand[campo]) {
      const i = normHeader.indexOf(c);
      if (i !== -1) { map[campo] = i; break; }
    }
  });
  return map;
}

// Garante que a aba Transacoes tenha o cabeçalho completo (adiciona colunas faltantes
// no fim, sem mexer nas existentes). Devolve o mapa { campo: índice }.
function ensureColunasTrans_(sh) {
  const lastCol = sh.getLastColumn();
  let header = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  let norm = header.map(norm_);
  let changed = false;
  TRANS_COLS.forEach(nome => {
    if (norm.indexOf(norm_(nome)) === -1) {
      header.push(nome);
      norm.push(norm_(nome));
      changed = true;
    }
  });
  if (changed) {
    const rng = sh.getRange(1, 1, 1, header.length);
    rng.setValues([header]);
    rng.setFontWeight('bold');
  }
  return colMapTrans_(norm);
}

// Lê a aba Config como mapa por CHAVE (coluna A), não por célula fixa.
// Reconhece "Salário líquido" -> salario e "% reembolso padrão"/"rateio" -> rateio.
function getConfigMap_(shC) {
  const out = {};
  if (!shC || shC.getLastRow() < 1) return out;
  const vals = shC.getDataRange().getValues();
  vals.forEach(r => {
    const label = norm_(r[0]);
    if (!label) return;
    out[label] = r[1];
    if (label.indexOf('salario') !== -1) out.salario = r[1];
    else if (label.indexOf('reembolso') !== -1 || label.indexOf('rateio') !== -1) out.rateio = r[1];
  });
  return out;
}

// ===================== Web app =====================

// Função principal que serve o HTML e o manifest
function doGet(e) {
  // Se for pedido do manifest PWA
  if (e.parameter.asset === 'manifest') {
    const manifest = {
      "name": "Controle Financeiro",
      "short_name": "Financeiro",
      "description": "Controle financeiro pessoal do Francisco",
      "start_url": "./",
      "display": "standalone",
      "orientation": "portrait",
      "theme_color": "#0b1220",
      "background_color": "#0b1220",
      "categories": ["finance", "productivity"],
      "lang": "pt-BR",
      "dir": "ltr",
      "icons": [
        {
          "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iNDAiIGZpbGw9IiM0ZjhjZmYiLz4KPHBhdGggZD0iTTQ4IDcyaDI0djQ4SDQ4Vjcyem0zNiAwaDI0djQ4SDg0Vjcyem0zNiAwaDI0djQ4aC0yNFY3MnoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=",
          "sizes": "192x192",
          "type": "image/svg+xml",
          "purpose": "any"
        },
        {
          "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTA0IiBmaWxsPSIjNGY4Y2ZmIi8+CjxwYXRoIGQ9Ik0xMjggMTkyaDY0djEyOGgtNjRWMTkyem05NiAwaDY0djEyOGgtNjRWMTkyem05NiAwaDY0djEyOGgtNjRWMTkyeiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==",
          "sizes": "512x512",
          "type": "image/svg+xml",
          "purpose": "any maskable"
        }
      ]
    };

    // Obs.: ContentService.TextOutput não suporta setHeaders no Apps Script.
    return ContentService
      .createTextOutput(JSON.stringify(manifest))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // HTML normal (app)
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Financeiro - Francisco')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// ===================== Transações =====================

// Valida e normaliza os campos de uma transação (usado por add e update).
function validarTransacao_(t) {
  const descricao = String((t && t.descricao) || '').trim();
  if (!descricao) throw new Error('Informe a descrição.');

  const valor = toNumBR_(t && t.valor);
  if (!(valor > 0)) throw new Error('Informe um valor maior que zero.');

  const tipo = String((t && t.tipo) || 'Único').trim() || 'Único';

  let pAtual = '';
  let pTotal = '';
  if (tipo === 'Parcelado') {
    pAtual = t.parcelaAtual ? Math.trunc(Number(t.parcelaAtual)) : '';
    pTotal = t.parcelaTotal ? Math.trunc(Number(t.parcelaTotal)) : '';
    if (pAtual && pTotal && pAtual > pTotal) {
      throw new Error('Parcela atual não pode ser maior que o total de parcelas.');
    }
  }

  const natureza = norm_(t && t.natureza) === 'receita' ? 'Receita' : 'Despesa';
  return { descricao, valor, tipo, pAtual, pTotal, natureza };
}

// Localiza a linha (1-based) de uma transação pelo ID; -1 se não achar.
function acharLinhaPorId_(sh, idCol0, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, idCol0 + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

// Adiciona nova transação (validação server-side, ID único, Natureza e CriadoEm).
function addTransacao(t) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const v = validarTransacao_(t);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const map = ensureColunasTrans_(sh);          // garante colunas e devolve índices
    const nCols = Math.max(sh.getLastColumn(), TRANS_COLS.length);
    const row = new Array(nCols).fill('');
    const set = (campo, val) => { if (map[campo] != null) row[map[campo]] = val; };

    set('id', Utilities.getUuid());
    set('data', parseLocalDate_(t && t.data));
    set('conta', String((t && t.conta) || 'Inter'));
    set('meio', String((t && t.meio) || 'Conta'));
    set('descricao', v.descricao);
    set('tipo', v.tipo);
    set('natureza', v.natureza);
    set('categoria', String((t && t.categoria) || '').trim());
    set('parcelaAtual', v.pAtual);
    set('parcelaTotal', v.pTotal);
    set('valor', v.valor);
    set('obs', String((t && t.obs) || ''));
    set('criadoEm', new Date());

    sh.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Transação salva com sucesso' };
}

// Atualiza uma transação existente (pelo ID). Mantém ID e CriadoEm.
function updateTransacao(id, t) {
  if (!id) throw new Error('ID da transação ausente.');
  const v = validarTransacao_(t);

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const map = ensureColunasTrans_(sh);
    if (map.id == null) throw new Error('Coluna ID não encontrada. Rode migrarEstrutura().');
    const rowNum = acharLinhaPorId_(sh, map.id, id);
    if (rowNum === -1) throw new Error('Transação não encontrada.');

    const nCols = sh.getLastColumn();
    const row = sh.getRange(rowNum, 1, 1, nCols).getValues()[0];
    const set = (campo, val) => { if (map[campo] != null) row[map[campo]] = val; };

    set('data', parseLocalDate_(t && t.data));
    set('conta', String((t && t.conta) || 'Inter'));
    set('meio', String((t && t.meio) || 'Conta'));
    set('descricao', v.descricao);
    set('tipo', v.tipo);
    set('natureza', v.natureza);
    set('categoria', String((t && t.categoria) || '').trim());
    set('parcelaAtual', v.pAtual);
    set('parcelaTotal', v.pTotal);
    set('valor', v.valor);
    set('obs', String((t && t.obs) || ''));
    // ID e CriadoEm são preservados (não são alterados)

    sh.getRange(rowNum, 1, 1, nCols).setValues([row]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Transação atualizada com sucesso' };
}

// Exclui uma transação (pelo ID).
function deleteTransacao(id) {
  if (!id) throw new Error('ID da transação ausente.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const vals = sh.getDataRange().getValues();
    if (vals.length < 2) throw new Error('Transação não encontrada.');
    const map = colMapTrans_(vals[0].map(norm_));
    if (map.id == null) throw new Error('Coluna ID não encontrada. Rode migrarEstrutura().');
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][map.id]) === String(id)) {
        sh.deleteRow(i + 1);
        return { ok: true, message: 'Transação excluída com sucesso' };
      }
    }
    throw new Error('Transação não encontrada.');
  } finally {
    lock.releaseLock();
  }
}

// Lista as transações de um mês (usa mapeamento por cabeçalho; inclui o ID).
function listTransacoes(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return []; // Só tem cabeçalho ou está vazia

  const map = colMapTrans_(vals[0].map(norm_));
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');

  const d = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = d.getFullYear() * 100 + (d.getMonth() + 1);

  return vals.slice(1)
    .filter(r => toYM_(col(r, 'data')) === ymTarget)
    .map(r => {
      const dv = col(r, 'data');
      const dt = dv instanceof Date ? dv : new Date(dv);
      const tz = Session.getScriptTimeZone();
      const pa = col(r, 'parcelaAtual');
      const pt = col(r, 'parcelaTotal');
      const natureza = norm_(col(r, 'natureza')) === 'receita' ? 'Receita' : 'Despesa';
      return {
        id: String(col(r, 'id') || ''),
        data: Utilities.formatDate(dt, tz, 'dd/MM/yyyy'),
        dataISO: Utilities.formatDate(dt, tz, 'yyyy-MM-dd'), // para preencher input date na edição
        conta: String(col(r, 'conta') || ''),
        meio: String(col(r, 'meio') || ''),
        descricao: String(col(r, 'descricao') || ''),
        tipo: String(col(r, 'tipo') || ''),
        natureza: natureza,
        categoria: String(col(r, 'categoria') || ''),
        parcela: (pa && pt) ? `${pa}/${pt}` : '',
        parcelaAtual: pa || '',
        parcelaTotal: pt || '',
        valor: Number(col(r, 'valor')) || 0,
        obs: String(col(r, 'obs') || '')
      };
    });
}

// ===================== Resumo =====================

// Gera o resumo mensal (mapeamento por cabeçalho + config por chave).
function getResumo(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const shT = ss.getSheetByName(SHEET_TRANS);  // Transações
  const shS = ss.getSheetByName(SHEET_SERV);   // Serviços
  const shC = ss.getSheetByName(SHEET_CONF);   // Configurações
  const shD = ss.getSheetByName(SHEET_SALD);   // Saldos

  if (!shT) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = shT.getDataRange().getValues();
  const map = vals.length ? colMapTrans_(vals[0].map(norm_)) : {};
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');

  const d = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = d.getFullYear() * 100 + (d.getMonth() + 1);

  // Linhas do mês alvo
  const rows = vals.length > 1 ? vals.slice(1).filter(r => toYM_(col(r, 'data')) === ymTarget) : [];

  // Soma condicional sobre as linhas já filtradas do mês
  const sumRows = (pred) => rows.reduce((acc, r) => acc + (pred(r) ? (Number(col(r, 'valor')) || 0) : 0), 0);
  const contaLc = (r) => String(col(r, 'conta')).toLowerCase();
  const isReceita = (r) => norm_(col(r, 'natureza')) === 'receita';
  const isDespesa = (r) => !isReceita(r); // vazio/qualquer coisa = despesa (compatível com dados antigos)

  // Totais por conta consideram apenas DESPESAS
  const totalInter = sumRows(r => isDespesa(r) && contaLc(r).includes('inter'));
  const totalItau = sumRows(r => isDespesa(r) && (contaLc(r).includes('itaú') || contaLc(r).includes('itau')));
  const totalContaSimples = sumRows(r => isDespesa(r) && contaLc(r).includes('conta simples'));

  // Receitas lançadas no mês (entradas extras além do salário fixo da Config)
  const totalReceitas = sumRows(isReceita);

  // Serviços compartilhados (aba Servicos: A=Nome, B=Compartilhado)
  let compartilhados = [];
  if (shS && shS.getLastRow() > 1) {
    const sv = shS.getDataRange().getValues();
    compartilhados = sv.slice(1)
      .filter(r => r[0] && (r[1] === true || String(r[1]).toLowerCase() === 'true'))
      .map(r => String(r[0]).trim().toLowerCase());
  }

  const totalCompart = rows.reduce((acc, r) => {
    if (isReceita(r)) return acc; // só despesas podem ser compartilhadas
    const desc = String(col(r, 'descricao') || '').trim().toLowerCase();
    if (!desc) return acc; // ignora descrições vazias (evita falso positivo)
    if (compartilhados.some(comp => comp && desc.includes(comp))) {
      return acc + (Number(col(r, 'valor')) || 0);
    }
    return acc;
  }, 0);

  // Configurações por chave (com fallback para B3/B5 por compatibilidade)
  const cfg = getConfigMap_(shC);
  let salario = numFrom_(cfg.salario, null);
  if (salario == null && shC && shC.getLastRow() >= 3) {
    try { salario = Number(shC.getRange('B3').getValue()); } catch (e) { console.warn('Config salário: ' + e); }
  }
  salario = numFrom_(salario, 0);

  let rateio = numFrom_(cfg.rateio, null);
  if (rateio == null && shC && shC.getLastRow() >= 5) {
    try { rateio = Number(shC.getRange('B5').getValue()); } catch (e) { console.warn('Config rateio: ' + e); }
  }
  rateio = numFrom_(rateio, 0.5);

  // Saldo atual (soma da coluna B da aba Saldos)
  let saldoAtual = 0;
  if (shD && shD.getLastRow() > 1) {
    try {
      const saldos = shD.getRange(2, 2, Math.max(shD.getLastRow() - 1, 0), 1).getValues();
      saldoAtual = saldos.flat().reduce((a, v) => a + (Number(v) || 0), 0);
    } catch (e) {
      console.warn('Erro ao ler saldos: ' + e);
    }
  }

  // Resumo final
  const totalGeral = round2_(totalInter + totalItau + totalContaSimples);
  const reembolso = round2_(totalCompart * rateio);
  const totalAjustado = round2_(totalGeral - reembolso);
  const pctSalario = salario > 0 ? totalAjustado / salario : 0;
  // Previsão inclui salário fixo (Config) + receitas extras lançadas no mês
  const prevFinal = round2_(saldoAtual + salario + totalReceitas - totalAjustado);

  return {
    mes: Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), Session.getScriptTimeZone(), 'MM/yyyy'),
    totalInter: round2_(totalInter),
    totalItau: round2_(totalItau),
    totalContaSimples: round2_(totalContaSimples),
    totalGeral,
    totalReceitas: round2_(totalReceitas),
    totalCompart: round2_(totalCompart),
    reembolso,
    totalAjustado,
    salario,
    pctSalario,
    saldoAtual: round2_(saldoAtual),
    prevFinal
  };
}

// Retorna o total de DESPESAS por mês nos últimos N meses (para o gráfico de evolução).
function getEvolucao(mesISO, meses) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const n = meses && meses > 0 ? meses : 6;
  const vals = sh.getDataRange().getValues();
  const map = vals.length ? colMapTrans_(vals[0].map(norm_)) : {};
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const base = mesISO ? parseLocalDate_(mesISO) : new Date();
  const tz = Session.getScriptTimeZone();

  // Monta os últimos n meses terminando no mês base
  const out = [];
  const idx = {};
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const ym = d.getFullYear() * 100 + (d.getMonth() + 1);
    idx[ym] = out.length;
    out.push({ label: Utilities.formatDate(d, tz, 'MMM/yy'), total: 0 });
  }

  for (let r = 1; r < vals.length; r++) {
    const ym = toYM_(col(vals[r], 'data'));
    if (ym == null || !(ym in idx)) continue;
    if (norm_(col(vals[r], 'natureza')) === 'receita') continue; // só despesas
    out[idx[ym]].total += Number(col(vals[r], 'valor')) || 0;
  }
  out.forEach(m => { m.total = round2_(m.total); });
  return out;
}

// Retorna as DESPESAS do mês agrupadas por categoria (desc), para o gráfico.
function getPorCategoria(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const map = colMapTrans_(vals[0].map(norm_));
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const d = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = d.getFullYear() * 100 + (d.getMonth() + 1);

  const acc = {};
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (toYM_(col(r, 'data')) !== ymTarget) continue;
    if (norm_(col(r, 'natureza')) === 'receita') continue; // só despesas
    const cat = String(col(r, 'categoria') || '').trim() || 'Sem categoria';
    acc[cat] = (acc[cat] || 0) + (Number(col(r, 'valor')) || 0);
  }
  return Object.keys(acc)
    .map(k => ({ categoria: k, total: round2_(acc[k]) }))
    .sort((a, b) => b.total - a.total);
}

// Projeta as parcelas em aberto do mês selecionado para os próximos meses.
// Para cada transação "Parcelado" com parcelaAtual < parcelaTotal, considera que
// faltam (total - atual) parcelas de mesmo valor, uma por mês seguinte.
function getProjecaoParcelas(mesISO, meses) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');
  const n = meses && meses > 0 ? meses : 6;

  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return { itens: [], meses: [], totalRestante: 0 };
  const map = colMapTrans_(vals[0].map(norm_));
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const base = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = base.getFullYear() * 100 + (base.getMonth() + 1);
  const tz = Session.getScriptTimeZone();

  // Próximos n meses (a partir do mês seguinte)
  const mesesArr = [];
  const idx = {};
  for (let o = 1; o <= n; o++) {
    const d = new Date(base.getFullYear(), base.getMonth() + o, 1);
    idx[d.getFullYear() * 12 + d.getMonth()] = mesesArr.length;
    mesesArr.push({ label: Utilities.formatDate(d, tz, 'MMM/yy'), total: 0 });
  }

  const itens = [];
  let totalRestante = 0;
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (norm_(col(r, 'tipo')) !== 'parcelado') continue;
    if (toYM_(col(r, 'data')) !== ymTarget) continue;
    const pa = Number(col(r, 'parcelaAtual')) || 0;
    const pt = Number(col(r, 'parcelaTotal')) || 0;
    const v = Number(col(r, 'valor')) || 0;
    if (!(pt > pa) || !(v > 0)) continue;

    const restante = pt - pa;
    totalRestante += restante * v;
    itens.push({
      descricao: String(col(r, 'descricao') || ''),
      parcela: `${pa}/${pt}`,
      valor: round2_(v),
      restante: restante,
      totalRestante: round2_(restante * v)
    });

    const dv = col(r, 'data');
    const dd = dv instanceof Date ? dv : new Date(dv);
    const bIdx = dd.getFullYear() * 12 + dd.getMonth();
    for (let o = 1; o <= restante; o++) {
      const mi = idx[bIdx + o];
      if (mi != null) mesesArr[mi].total += v;
    }
  }
  mesesArr.forEach(m => { m.total = round2_(m.total); });
  itens.sort((a, b) => b.totalRestante - a.totalRestante);
  return { itens: itens, meses: mesesArr, totalRestante: round2_(totalRestante) };
}

// Gera, no mês alvo, os lançamentos recorrentes (tipo "Recorrente") a partir da
// ocorrência mais recente de cada um em meses anteriores. Não duplica: pula
// itens cuja descrição já exista no mês alvo. Retorna quantos criou/pulou.
function gerarRecorrentes(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const target = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = target.getFullYear() * 100 + (target.getMonth() + 1);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const map = ensureColunasTrans_(sh);
    const vals = sh.getDataRange().getValues();
    const col = (r, f) => (map[f] != null ? r[map[f]] : '');

    // Descrições já presentes no mês alvo (evita duplicar)
    const existentes = {};
    for (let i = 1; i < vals.length; i++) {
      if (toYM_(col(vals[i], 'data')) === ymTarget) {
        const k = norm_(col(vals[i], 'descricao'));
        if (k) existentes[k] = true;
      }
    }

    // Templates: recorrentes de meses ANTERIORES, o mais recente por descrição
    const templates = {};
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (norm_(col(r, 'tipo')) !== 'recorrente') continue;
      const ym = toYM_(col(r, 'data'));
      if (ym == null || ym >= ymTarget) continue;
      const k = norm_(col(r, 'descricao'));
      if (!k) continue;
      const dv = col(r, 'data');
      const dt = dv instanceof Date ? dv : new Date(dv);
      if (!templates[k] || dt > templates[k]._dt) templates[k] = { _dt: dt, row: r };
    }

    const nCols = sh.getLastColumn();
    const ultimoDia = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    let criadas = 0;
    let ignoradas = 0;

    Object.keys(templates).forEach(k => {
      if (existentes[k]) { ignoradas++; return; }
      const src = templates[k];
      const dia = Math.min(src._dt.getDate(), ultimoDia);
      const novaData = new Date(target.getFullYear(), target.getMonth(), dia);
      const g = (f) => (map[f] != null ? src.row[map[f]] : '');
      const row = new Array(nCols).fill('');
      const setc = (campo, val) => { if (map[campo] != null) row[map[campo]] = val; };
      setc('id', Utilities.getUuid());
      setc('data', novaData);
      setc('conta', g('conta'));
      setc('meio', g('meio'));
      setc('descricao', g('descricao'));
      setc('tipo', 'Recorrente');
      setc('natureza', norm_(g('natureza')) === 'receita' ? 'Receita' : 'Despesa');
      setc('categoria', g('categoria'));
      setc('valor', Number(g('valor')) || 0);
      setc('obs', g('obs'));
      setc('criadoEm', new Date());
      sh.appendRow(row);
      criadas++;
    });

    return { ok: true, criadas: criadas, ignoradas: ignoradas };
  } finally {
    lock.releaseLock();
  }
}

// Lista as despesas compartilhadas do mês e calcula o reembolso (acerto de contas).
function getCompartilhados(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const shT = ss.getSheetByName(SHEET_TRANS);
  const shS = ss.getSheetByName(SHEET_SERV);
  const shC = ss.getSheetByName(SHEET_CONF);
  if (!shT) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = shT.getDataRange().getValues();
  const map = vals.length ? colMapTrans_(vals[0].map(norm_)) : {};
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const d = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = d.getFullYear() * 100 + (d.getMonth() + 1);

  let compartilhados = [];
  if (shS && shS.getLastRow() > 1) {
    const sv = shS.getDataRange().getValues();
    compartilhados = sv.slice(1)
      .filter(r => r[0] && (r[1] === true || String(r[1]).toLowerCase() === 'true'))
      .map(r => String(r[0]).trim().toLowerCase());
  }

  const itens = [];
  let total = 0;
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (toYM_(col(r, 'data')) !== ymTarget) continue;
    if (norm_(col(r, 'natureza')) === 'receita') continue;
    const desc = String(col(r, 'descricao') || '').trim();
    if (!desc) continue;
    const dl = desc.toLowerCase();
    if (compartilhados.some(c => c && dl.includes(c))) {
      const v = Number(col(r, 'valor')) || 0;
      total += v;
      itens.push({ descricao: desc, conta: String(col(r, 'conta') || ''), valor: round2_(v) });
    }
  }

  const cfg = getConfigMap_(shC);
  const rateio = numFrom_(cfg.rateio, 0.5);
  itens.sort((a, b) => b.valor - a.valor);
  return { itens: itens, total: round2_(total), rateio: rateio, reembolso: round2_(total * rateio) };
}

// ===================== Orçamentos por categoria =====================

// Lê os orçamentos definidos (aba Orcamentos: A=Categoria, B=Limite).
function getOrcamentos() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_ORC);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[0]).trim())
    .map(r => ({ categoria: String(r[0]).trim(), limite: Number(r[1]) || 0 }))
    .filter(o => o.limite > 0)
    .sort((a, b) => b.limite - a.limite);
}

// Cria/atualiza o limite de uma categoria (upsert por nome, case/acento-insensível).
function setOrcamento(categoria, limite) {
  categoria = String(categoria || '').trim();
  if (!categoria) throw new Error('Informe a categoria.');
  const lim = toNumBR_(limite);
  if (!(lim > 0)) throw new Error('Informe um limite maior que zero.');

  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_ORC);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ORC);
    sh.getRange('A1:B1').setValues([['Categoria', 'Limite']]);
    sh.getRange('A1:B1').setFontWeight('bold');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const last = sh.getLastRow();
    const nomes = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    let row = -1;
    for (let i = 0; i < nomes.length; i++) {
      if (norm_(nomes[i][0]) === norm_(categoria)) { row = i + 2; break; }
    }
    if (row === -1) sh.appendRow([categoria, lim]);
    else sh.getRange(row, 1, 1, 2).setValues([[categoria, lim]]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Orçamento salvo' };
}

// Sugere um limite por categoria com base na média de despesas dos últimos N meses.
// Só sugere para categorias que AINDA não têm orçamento definido.
function getSugestoesOrcamento(mesISO, meses) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) return [];
  const n = meses && meses > 0 ? meses : 3;

  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const map = colMapTrans_(vals[0].map(norm_));
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const base = mesISO ? parseLocalDate_(mesISO) : new Date();

  const yms = {};
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    yms[d.getFullYear() * 100 + (d.getMonth() + 1)] = true;
  }

  const acc = {};
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const ym = toYM_(col(r, 'data'));
    if (ym == null || !yms[ym]) continue;
    if (norm_(col(r, 'natureza')) === 'receita') continue;
    const cat = String(col(r, 'categoria') || '').trim();
    if (!cat) continue; // ignora "sem categoria"
    acc[cat] = (acc[cat] || 0) + (Number(col(r, 'valor')) || 0);
  }

  const existentes = {};
  getOrcamentos().forEach(o => { existentes[norm_(o.categoria)] = true; });
  const arredondaDezena = (v) => Math.ceil(v / 10) * 10;

  return Object.keys(acc)
    .filter(c => !existentes[norm_(c)])
    .map(c => ({ categoria: c, media: round2_(acc[c] / n), sugestao: arredondaDezena(acc[c] / n) }))
    .filter(o => o.sugestao > 0)
    .sort((a, b) => b.media - a.media);
}

// Remove o orçamento de uma categoria.
function deleteOrcamento(categoria) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_ORC);
  if (!sh || sh.getLastRow() < 2) return { ok: true };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const nomes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < nomes.length; i++) {
      if (norm_(nomes[i][0]) === norm_(categoria)) { sh.deleteRow(i + 2); break; }
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Orçamento removido' };
}

// ===================== Estrutura / manutenção =====================

// Migração: adiciona colunas ID/CriadoEm em uma planilha já existente e
// preenche um ID único para as transações antigas. Rodar UMA vez no editor.
function migrarEstrutura() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) return 'Aba "Transacoes" não encontrada.';

  const map = ensureColunasTrans_(sh); // garante ID/CriadoEm etc.
  const last = sh.getLastRow();
  if (last > 1 && map.id != null) {
    const idCol = map.id + 1; // 1-based
    const ids = sh.getRange(2, idCol, last - 1, 1).getValues();
    let count = 0;
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i][0]) { ids[i][0] = Utilities.getUuid(); count++; }
    }
    sh.getRange(2, idCol, last - 1, 1).setValues(ids);
    return `Migração concluída. ${count} transação(ões) receberam ID.`;
  }
  return 'Migração concluída (nenhuma linha para preencher).';
}

// Testa a estrutura da planilha (debug).
function testarEstrutura() {
  const ss = SpreadsheetApp.getActive();
  console.log('=== Teste de Estrutura da Planilha ===');

  const abas = [SHEET_TRANS, SHEET_SERV, SHEET_CONF, SHEET_SALD];
  abas.forEach(nome => {
    const aba = ss.getSheetByName(nome);
    if (aba) {
      console.log(`✅ Aba "${nome}" - ${aba.getLastRow()} linhas, ${aba.getLastColumn()} colunas`);
    } else {
      console.log(`❌ Aba "${nome}" NÃO encontrada`);
    }
  });

  const shC = ss.getSheetByName(SHEET_CONF);
  if (shC) {
    const cfg = getConfigMap_(shC);
    console.log(`Salário (por chave): ${cfg.salario}`);
    console.log(`Rateio (por chave): ${cfg.rateio}`);
  }

  return 'Teste concluído - veja o console (Ctrl+Enter para executar).';
}

// Cria a estrutura básica da planilha (caso não exista).
function criarEstruturaPlanilha() {
  const ss = SpreadsheetApp.getActive();

  // Aba Transacoes (já com ID e CriadoEm)
  let shT = ss.getSheetByName(SHEET_TRANS);
  if (!shT) {
    shT = ss.insertSheet(SHEET_TRANS);
    const rng = shT.getRange(1, 1, 1, TRANS_COLS.length);
    rng.setValues([TRANS_COLS]);
    rng.setFontWeight('bold');
  } else {
    ensureColunasTrans_(shT); // completa colunas faltantes numa aba já existente
  }

  // Aba Servicos
  let shS = ss.getSheetByName(SHEET_SERV);
  if (!shS) {
    shS = ss.insertSheet(SHEET_SERV);
    shS.getRange('A1:C1').setValues([['Nome', 'Compartilhado', 'Rateio']]);
    shS.getRange('A1:C1').setFontWeight('bold');
    shS.getRange('A2:C6').setValues([
      ['Disney', true, 0.5],
      ['Google', true, 0.5],
      ['Crunchyroll', true, 0.5],
      ['HBO Max', true, 0.5],
      ['Amazon Prime Anual', true, 0.5]
    ]);
  }

  // Aba Config
  let shC = ss.getSheetByName(SHEET_CONF);
  if (!shC) {
    shC = ss.insertSheet(SHEET_CONF);
    shC.getRange('A1:B5').setValues([
      ['Configuração', 'Valor'],
      ['Mês de referência', new Date()],
      ['Salário líquido', 0],
      ['% gastos recomendados', 0.70],
      ['% reembolso padrão', 0.50]
    ]);
    shC.getRange('A1:B1').setFontWeight('bold');
  }

  // Aba Saldos
  let shD = ss.getSheetByName(SHEET_SALD);
  if (!shD) {
    shD = ss.insertSheet(SHEET_SALD);
    shD.getRange('A1:B1').setValues([['Conta', 'Saldo']]);
    shD.getRange('A1:B1').setFontWeight('bold');
    shD.getRange('A2:B4').setValues([
      ['Itaú', 0],
      ['Inter', 0],
      ['Conta Simples', 0]
    ]);
  }

  // Aba Orcamentos
  let shO = ss.getSheetByName(SHEET_ORC);
  if (!shO) {
    shO = ss.insertSheet(SHEET_ORC);
    shO.getRange('A1:B1').setValues([['Categoria', 'Limite']]);
    shO.getRange('A1:B1').setFontWeight('bold');
  }

  return 'Estrutura da planilha criada/atualizada com sucesso!';
}
