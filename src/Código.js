// Constantes das abas da planilha
const SHEET_TRANS = 'Transacoes';
const SHEET_SERV = 'Servicos';
const SHEET_CONF = 'Config';
const SHEET_SALD = 'Saldos';
const SHEET_ORC = 'Orcamentos';
const SHEET_LEMB = 'Lembretes';
const SHEET_META = 'Metas';

// Colunas canônicas da aba Transacoes (ordem usada ao criar/completar o cabeçalho).
const TRANS_COLS = ['ID', 'Data', 'Conta', 'Meio', 'Descrição', 'Tipo', 'Natureza', 'Categoria',
  'Compartilhado', 'Rateio', 'ParcelaAtual', 'ParcelaTotal', 'Valor', 'Observação', 'CriadoEm'];

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

// Interpreta um valor como "compartilhado?" (aceita boolean, "sim", "true", etc.).
function isCompartFlag_(v) {
  if (v === true) return true;
  const s = norm_(v);
  return s === 'true' || s === 'sim' || s === '1' || s === 'x' || s === 'verdadeiro';
}

// Palavras-chave -> categoria, para auto-categorizar na importação de extrato.
const CATEGORIA_KEYWORDS = {
  'Assinaturas': ['netflix', 'spotify', 'disney', 'hbo', 'max', 'primevideo', 'amazonprime', 'youtube', 'crunchyroll', 'globoplay', 'deezer', 'applecom', 'appletv', 'itunes', 'paramount', 'star', 'canva', 'chatgpt', 'openai', 'notion', 'dropbox', 'googleone', 'icloud', 'linkedin', 'twitch', 'kindle', 'audible', 'mubi'],
  'Transporte': ['uber', '99app', '99', 'cabify', 'indriver', 'posto', 'ipiranga', 'shell', 'petrobras', 'br mania', 'combustivel', 'gasolina', 'alcool', 'estacionamento', 'metro', 'onibus', 'bilheteunico', 'bilhete unico', 'sem parar', 'veloe', 'conectcar', 'pedagio', 'localiza', 'movida', 'unidas'],
  'Mercado': ['mercado', 'supermerc', 'carrefour', 'paodeacucar', 'pao de acucar', 'assai', 'atacadao', 'atacadão', 'hortifruti', 'bigbox', 'extra', 'sams club', 'makro', 'dia ', 'zaffari', 'guanabara', 'mundial', 'sacolao'],
  'Alimentação': ['ifood', 'rappi', 'restaurante', 'lanchonete', 'burger', 'mcdonald', 'bk ', 'burgerking', 'padaria', 'pizzaria', 'subway', 'habib', 'outback', 'starbucks', 'cacau show', 'confeitaria', 'churrascaria', 'hamburgueria', 'asubway'],
  'Saúde': ['farmacia', 'drogaria', 'drogasil', 'pacheco', 'raia', 'droga raia', 'pague menos', 'hospital', 'clinica', 'laboratorio', 'unimed', 'amil', 'hapvida', 'academia', 'smartfit', 'gympass', 'wellhub', 'dentista'],
  'Contas e serviços': ['claro', 'vivo', 'timbrasil', 'tim', 'oi ', 'enel', 'light', 'sabesp', 'copasa', 'cemig', 'cpfl', 'equatorial', 'comgas', 'internet', 'net ', 'vero', 'condominio', 'condomínio', 'iptu', 'seguro', 'porto seguro', 'consorcio'],
  'Educação': ['escola', 'faculdade', 'universidade', 'curso', 'udemy', 'alura', 'duolingo', 'coursera', 'kumon', 'wizard', 'ccaa'],
  'Lazer': ['cinema', 'cinemark', 'steam', 'playstation', 'psn', 'xbox', 'nintendo', 'ingresso', 'ingressocom', 'teatro', 'showlivre', 'ticket'],
  'Compras': ['amazon', 'mercadolivre', 'mercado livre', 'shopee', 'aliexpress', 'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'renner', 'riachuelo', 'cea', 'zara', 'centauro', 'nike', 'adidas'],
  'Vestuário': ['calcados', 'calçados', 'moda', 'boutique', 'shoe']
};

// Sugere uma categoria a partir da descrição: primeiro pelo histórico (histMap:
// descrição normalizada -> categoria), depois por palavras-chave conhecidas.
function categorizarAuto_(descricao, histMap) {
  const nd = norm_(descricao);
  if (!nd) return '';
  if (histMap && histMap[nd]) return histMap[nd];
  for (const cat in CATEGORIA_KEYWORDS) {
    if (CATEGORIA_KEYWORDS[cat].some(k => nd.indexOf(k) !== -1)) return cat;
  }
  return '';
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
    compartilhado: ['compartilhado'],
    rateio: ['rateio'],
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

  // Compartilhamento por lançamento (só faz sentido em despesa)
  const compartilhado = natureza === 'Despesa' && isCompartFlag_(t && t.compartilhado);
  let rateio = '';
  if (compartilhado) {
    let rt = Number(t && t.rateio);
    if (isNaN(rt) || rt <= 0) rt = 0.5;   // padrão 50%
    if (rt > 1) rt = rt / 100;            // aceita porcentagem (ex.: 50)
    rateio = Math.max(0, Math.min(rt, 1));
  }

  return { descricao, valor, tipo, pAtual, pTotal, natureza, compartilhado, rateio };
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
    set('compartilhado', v.compartilhado ? true : '');
    set('rateio', v.rateio);
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
    set('compartilhado', v.compartilhado ? true : '');
    set('rateio', v.rateio);
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
        compartilhado: isCompartFlag_(col(r, 'compartilhado')),
        rateio: Number(col(r, 'rateio')) || '',
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
  // Despesas agrupadas por conta (dinâmico — não depende de contas fixas)
  const porContaMap = {};
  rows.forEach(r => {
    if (isReceita(r)) return;
    const c = String(col(r, 'conta') || '').trim() || '(sem conta)';
    porContaMap[c] = (porContaMap[c] || 0) + (Number(col(r, 'valor')) || 0);
  });
  const porConta = Object.keys(porContaMap)
    .map(c => ({ conta: c, total: round2_(porContaMap[c]) }))
    .sort((a, b) => b.total - a.total);

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

  // (o total compartilhado é calculado abaixo, após ler o rateio padrão da Config)

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

  // Compartilhado: por flag do lançamento OU por nome de serviço (legado).
  // Reembolso usa o rateio do próprio lançamento; se não houver, o rateio padrão.
  let totalCompart = 0;
  let reembolso = 0;
  rows.forEach(r => {
    if (isReceita(r)) return;
    const desc = String(col(r, 'descricao') || '').trim().toLowerCase();
    const explicit = isCompartFlag_(col(r, 'compartilhado'));
    const legado = desc && compartilhados.some(comp => comp && desc.includes(comp));
    if (!explicit && !legado) return;
    const v = Number(col(r, 'valor')) || 0;
    let rt = Number(col(r, 'rateio'));
    if (!(rt > 0)) rt = rateio;
    if (rt > 1) rt = rt / 100;
    totalCompart += v;
    reembolso += v * rt;
  });
  totalCompart = round2_(totalCompart);
  reembolso = round2_(reembolso);

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
  const totalGeral = round2_(porConta.reduce((a, x) => a + x.total, 0));
  const totalAjustado = round2_(totalGeral - reembolso);
  const pctSalario = salario > 0 ? totalAjustado / salario : 0;
  // Previsão inclui salário fixo (Config) + receitas extras lançadas no mês
  const prevFinal = round2_(saldoAtual + salario + totalReceitas - totalAjustado);

  return {
    mes: Utilities.formatDate(new Date(d.getFullYear(), d.getMonth(), 1), Session.getScriptTimeZone(), 'MM/yyyy'),
    porConta: porConta,
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

// Relatório anual: totais por mês (receita/despesa/saldo), por categoria,
// maiores gastos e médias — para a visão do ano inteiro.
function getRelatorioAnual(ano) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const y = Number(ano) || new Date().getFullYear();
  const vals = sh.getDataRange().getValues();
  const map = vals.length ? colMapTrans_(vals[0].map(norm_)) : {};
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const tz = Session.getScriptTimeZone();

  const meses = [];
  for (let m = 0; m < 12; m++) {
    meses.push({ mes: m + 1, label: Utilities.formatDate(new Date(y, m, 1), tz, 'MMM'), receitas: 0, despesas: 0, saldo: 0 });
  }
  const catAcc = {};
  const gastos = [];
  const anosSet = {};
  let totReceitas = 0, totDespesas = 0;

  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const dv = col(r, 'data');
    if (!dv) continue;
    const dt = dv instanceof Date ? dv : new Date(dv);
    if (isNaN(dt)) continue;
    anosSet[dt.getFullYear()] = true;
    if (dt.getFullYear() !== y) continue;

    const v = Number(col(r, 'valor')) || 0;
    const mi = dt.getMonth();
    if (norm_(col(r, 'natureza')) === 'receita') {
      meses[mi].receitas += v; totReceitas += v;
    } else {
      meses[mi].despesas += v; totDespesas += v;
      const cat = String(col(r, 'categoria') || '').trim() || 'Sem categoria';
      catAcc[cat] = (catAcc[cat] || 0) + v;
      gastos.push({ data: Utilities.formatDate(dt, tz, 'yyyy-MM-dd'), descricao: String(col(r, 'descricao') || ''), categoria: cat, valor: v });
    }
  }

  meses.forEach(m => { m.saldo = round2_(m.receitas - m.despesas); m.receitas = round2_(m.receitas); m.despesas = round2_(m.despesas); });
  const porCategoria = Object.keys(catAcc).map(k => ({ categoria: k, total: round2_(catAcc[k]) })).sort((a, b) => b.total - a.total);
  const topGastos = gastos.sort((a, b) => b.valor - a.valor).slice(0, 10).map(g => ({ data: g.data, descricao: g.descricao, categoria: g.categoria, valor: round2_(g.valor) }));
  const mesesComMov = meses.filter(m => m.despesas > 0 || m.receitas > 0).length || 1;
  const anos = Object.keys(anosSet).map(Number).sort((a, b) => b - a);

  return {
    ano: y,
    anos: anos,
    meses: meses,
    porCategoria: porCategoria,
    topGastos: topGastos,
    totais: { receitas: round2_(totReceitas), despesas: round2_(totDespesas), saldo: round2_(totReceitas - totDespesas) },
    mediaMensalDespesa: round2_(totDespesas / mesesComMov),
    mesesComMovimento: mesesComMov
  };
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

// Rodado pelo gatilho mensal: gera os recorrentes do MÊS ATUAL (idempotente).
function verificarRecorrentes() {
  return gerarRecorrentes(); // sem arg = mês atual
}

// Gatilho automático mensal (dia 1º, ~06h) para verificarRecorrentes.
function instalarGatilhoRecorrentes() {
  removerGatilhoRecorrentes();
  ScriptApp.newTrigger('verificarRecorrentes').timeBased().onMonthDay(1).atHour(6).create();
  return { ok: true, ativo: true };
}
function removerGatilhoRecorrentes() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'verificarRecorrentes') ScriptApp.deleteTrigger(t);
  });
  return { ok: true, ativo: false };
}
function statusGatilhoRecorrentes() {
  const ativo = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'verificarRecorrentes');
  return { ativo: ativo };
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

  const cfg = getConfigMap_(shC);
  const rateioPadrao = numFrom_(cfg.rateio, 0.5);

  const itens = [];
  let total = 0;
  let reembolso = 0;
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (toYM_(col(r, 'data')) !== ymTarget) continue;
    if (norm_(col(r, 'natureza')) === 'receita') continue;
    const desc = String(col(r, 'descricao') || '').trim();
    if (!desc) continue;
    const dl = desc.toLowerCase();
    const explicit = isCompartFlag_(col(r, 'compartilhado'));
    const legado = compartilhados.some(c => c && dl.includes(c));
    if (!explicit && !legado) continue;
    const v = Number(col(r, 'valor')) || 0;
    let rt = Number(col(r, 'rateio'));
    if (!(rt > 0)) rt = rateioPadrao;
    if (rt > 1) rt = rt / 100;
    total += v;
    reembolso += v * rt;
    itens.push({ descricao: desc, conta: String(col(r, 'conta') || ''), valor: round2_(v), rateio: rt, reembolso: round2_(v * rt) });
  }

  itens.sort((a, b) => b.valor - a.valor);
  const rateioEfetivo = total > 0 ? reembolso / total : rateioPadrao;
  return { itens: itens, total: round2_(total), rateio: rateioEfetivo, reembolso: round2_(reembolso) };
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

// ===================== Metas de economia =====================
// Aba Metas: A=ID, B=Descrição, C=Tipo(mensal|total), D=Alvo, E=Prazo(yyyy-MM), F=CriadoEm

// Soma a "economia" (receitas − despesas) por mês (ym) a partir das transações.
function netPorMes_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  const net = {};
  if (!sh || sh.getLastRow() < 2) return net;
  const vals = sh.getDataRange().getValues();
  const map = colMapTrans_(vals[0].map(norm_));
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  for (let i = 1; i < vals.length; i++) {
    const ym = toYM_(col(vals[i], 'data'));
    if (ym == null) continue;
    const v = Number(col(vals[i], 'valor')) || 0;
    const rec = norm_(col(vals[i], 'natureza')) === 'receita';
    net[ym] = (net[ym] || 0) + (rec ? v : -v);
  }
  return net;
}

// Lista as metas com o progresso já calculado para o mês de referência.
// - mensal: economia (receitas − despesas) do mês alvo vs. alvo.
// - total: economia acumulada desde a criação até o mês alvo vs. alvo (+ meses restantes).
function getMetas(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_META);
  if (!sh || sh.getLastRow() < 2) return [];

  const d = mesISO ? parseLocalDate_(mesISO) : new Date();
  const ymTarget = d.getFullYear() * 100 + (d.getMonth() + 1);
  const net = netPorMes_();

  return sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[0]).trim())
    .map(r => {
      const id = String(r[0]);
      const descricao = String(r[1] || '');
      const tipo = norm_(r[2]) === 'total' ? 'total' : 'mensal';
      const alvo = Number(r[3]) || 0;
      const prazo = r[4] ? String(r[4]).slice(0, 7) : '';
      const criadoEm = r[5];

      let progresso = 0;
      let mesesRestantes = null;
      if (tipo === 'mensal') {
        progresso = net[ymTarget] || 0;
      } else {
        const dc = criadoEm instanceof Date ? criadoEm : (criadoEm ? new Date(criadoEm) : null);
        const ymCriado = dc && !isNaN(dc) ? dc.getFullYear() * 100 + (dc.getMonth() + 1) : null;
        let acc = 0;
        Object.keys(net).forEach(k => {
          const ym = Number(k);
          if (ymCriado != null && ym < ymCriado) return;
          if (ym > ymTarget) return;
          acc += net[k];
        });
        progresso = acc;
        if (prazo) {
          const p = prazo.split('-').map(Number);
          const ymPrazo = p[0] * 100 + p[1];
          mesesRestantes = (Math.floor(ymPrazo / 100) - Math.floor(ymTarget / 100)) * 12
            + ((ymPrazo % 100) - (ymTarget % 100));
          if (mesesRestantes < 0) mesesRestantes = 0;
        }
      }
      const pct = alvo > 0 ? Math.round((progresso / alvo) * 100) : 0;
      return { id: id, descricao: descricao, tipo: tipo, alvo: round2_(alvo), prazo: prazo,
        progresso: round2_(progresso), pct: pct, mesesRestantes: mesesRestantes };
    });
}

// Cria/atualiza uma meta (upsert por ID; preserva CriadoEm ao editar).
function setMeta(meta) {
  meta = meta || {};
  const descricao = String(meta.descricao || '').trim();
  if (!descricao) throw new Error('Informe a descrição da meta.');
  const tipo = norm_(meta.tipo) === 'total' ? 'total' : 'mensal';
  const alvo = toNumBR_(meta.alvo);
  if (!(alvo > 0)) throw new Error('Informe um valor-alvo maior que zero.');
  const prazo = (tipo === 'total' && meta.prazo) ? String(meta.prazo).slice(0, 7) : '';

  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_META);
  if (!sh) {
    sh = ss.insertSheet(SHEET_META);
    sh.getRange('A1:F1').setValues([['ID', 'Descrição', 'Tipo', 'Alvo', 'Prazo', 'CriadoEm']]);
    sh.getRange('A1:F1').setFontWeight('bold');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const id = String(meta.id || '').trim();
    const last = sh.getLastRow();
    let row = -1;
    if (id && last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { row = i + 2; break; } }
    }
    if (row === -1) {
      const novoId = id || Utilities.getUuid();
      sh.appendRow([novoId, descricao, tipo, alvo, prazo, new Date()]);
      return { ok: true, id: novoId, message: 'Meta criada' };
    }
    const criado = sh.getRange(row, 6).getValue() || new Date();
    sh.getRange(row, 1, 1, 6).setValues([[id, descricao, tipo, alvo, prazo, criado]]);
    return { ok: true, id: id, message: 'Meta atualizada' };
  } finally {
    lock.releaseLock();
  }
}

// Remove uma meta por ID.
function deleteMeta(id) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_META);
  if (!sh || sh.getLastRow() < 2) return { ok: true };
  id = String(id || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { sh.deleteRow(i + 2); break; } }
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Meta removida' };
}

// ===================== Lembretes de vencimento =====================
// Aba Lembretes: A=Descrição, B=Dia(1-31), C=Valor, D=Antecedencia(dias), E=Ativo, F=UltimoAviso(yyyy-MM)

function diaVencimento_(hoje, dia) {
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return new Date(hoje.getFullYear(), hoje.getMonth(), Math.min(Math.max(Number(dia) || 1, 1), ultimo));
}
function diasEntre_(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function getLembretes() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LEMB);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[0]).trim())
    .map(r => ({
      descricao: String(r[0]).trim(),
      dia: Number(r[1]) || 1,
      valor: Number(r[2]) || 0,
      antecedencia: Number(r[3]) || 3,
      ativo: (r[4] === '' || r[4] == null) ? true : isCompartFlag_(r[4])
    }));
}

function setLembrete(descricao, dia, valor, antecedencia, ativo) {
  descricao = String(descricao || '').trim();
  if (!descricao) throw new Error('Informe a descrição do lembrete.');
  const d = Math.min(Math.max(Math.trunc(Number(dia) || 0), 1), 31);
  if (!d) throw new Error('Informe um dia de vencimento (1 a 31).');
  const v = toNumBR_(valor);
  const antec = Math.min(Math.max(Math.trunc(Number(antecedencia) || 3), 0), 30);
  const at = (ativo === undefined) ? true : isCompartFlag_(ativo);

  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_LEMB);
  if (!sh) {
    sh = ss.insertSheet(SHEET_LEMB);
    sh.getRange('A1:F1').setValues([['Descrição', 'Dia', 'Valor', 'Antecedencia', 'Ativo', 'UltimoAviso']]);
    sh.getRange('A1:F1').setFontWeight('bold');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const last = sh.getLastRow();
    const nomes = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    let row = -1;
    for (let i = 0; i < nomes.length; i++) if (norm_(nomes[i][0]) === norm_(descricao)) { row = i + 2; break; }
    if (row === -1) sh.appendRow([descricao, d, v, antec, at, '']);
    else sh.getRange(row, 1, 1, 5).setValues([[descricao, d, v, antec, at]]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Lembrete salvo' };
}

function deleteLembrete(descricao) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LEMB);
  if (!sh || sh.getLastRow() < 2) return { ok: true };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const nomes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < nomes.length; i++) if (norm_(nomes[i][0]) === norm_(descricao)) { sh.deleteRow(i + 2); break; }
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Lembrete removido' };
}

// Próximos vencimentos (para exibir no app), ordenados por proximidade.
function getLembretesProximos() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return getLembretes().filter(l => l.ativo).map(l => {
    let venc = diaVencimento_(hoje, l.dia);
    if (diasEntre_(hoje, venc) < 0) venc = diaVencimento_(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1), l.dia);
    return { descricao: l.descricao, dia: l.dia, valor: l.valor, dias: diasEntre_(hoje, venc) };
  }).sort((a, b) => a.dias - b.dias);
}

// Verifica e envia e-mail dos vencimentos na janela de antecedência (1x por mês por lembrete).
// É o alvo do gatilho diário; também pode ser chamado manualmente ("enviar agora").
function verificarLembretes() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LEMB);
  if (!sh || sh.getLastRow() < 2) return { ok: true, enviados: 0 };

  const tz = Session.getScriptTimeZone();
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ym = Utilities.formatDate(hoje, tz, 'yyyy-MM');
  const brl = (v) => 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ',');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const vals = sh.getDataRange().getValues();
    const devidos = [];
    const marcar = [];
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (!String(r[0]).trim()) continue;
      const ativo = (r[4] === '' || r[4] == null) ? true : isCompartFlag_(r[4]);
      if (!ativo) continue;
      const dia = Number(r[1]) || 1;
      const antec = Number(r[3]) || 3;
      const venc = diaVencimento_(hoje, dia);
      const dias = diasEntre_(hoje, venc);
      const jaAvisou = String(r[5] || '') === ym;
      if (dias >= 0 && dias <= antec && !jaAvisou) {
        devidos.push({ desc: String(r[0]).trim(), dia: dia, valor: Number(r[2]) || 0, dias: dias });
        marcar.push(i + 1);
      }
    }
    if (devidos.length) {
      const email = Session.getEffectiveUser().getEmail();
      const linhas = devidos.map(x =>
        `• ${x.desc}${x.valor ? ' — ' + brl(x.valor) : ''} — vence dia ${x.dia} (${x.dias === 0 ? 'hoje' : 'em ' + x.dias + ' dia(s)'})`).join('\n');
      if (email) {
        MailApp.sendEmail(email, '🔔 Financeiro: contas a vencer',
          'Lembrete de vencimento:\n\n' + linhas + '\n\n— App Financeiro');
      }
      marcar.forEach(rowNum => sh.getRange(rowNum, 6, 1, 1).setValues([[ym]]));
    }
    return { ok: true, enviados: devidos.length };
  } finally {
    lock.releaseLock();
  }
}

// Gatilho automático diário (08h) para verificarLembretes.
function instalarGatilhoLembretes() {
  removerGatilhoLembretes();
  ScriptApp.newTrigger('verificarLembretes').timeBased().everyDays(1).atHour(8).create();
  return { ok: true, ativo: true };
}
function removerGatilhoLembretes() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'verificarLembretes') ScriptApp.deleteTrigger(t);
  });
  return { ok: true, ativo: false };
}
function statusGatilhoLembretes() {
  const ativo = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'verificarLembretes');
  return { ativo: ativo };
}

// ===================== Backup / Exportação =====================

// Formata uma célula para CSV (datas como yyyy-MM-dd; escapa aspas/vírgula/quebra).
function csvCell_(v) {
  let s;
  if (v instanceof Date) s = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  else s = String(v == null ? '' : v);
  if (/[",\r\n;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Exporta TODAS as transações para um CSV no Google Drive e devolve o link.
function exportarBackup() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = sh.getDataRange().getValues();
  const csv = vals.map(row => row.map(csvCell_).join(',')).join('\r\n');
  const tz = Session.getScriptTimeZone();
  const nome = 'financeiro-backup-' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd-HHmm') + '.csv';
  // BOM para acentos abrirem certo no Excel
  const file = DriveApp.createFile(nome, '﻿' + csv, 'text/csv');
  return { ok: true, nome: nome, url: file.getUrl(), linhas: Math.max(vals.length - 1, 0) };
}

// Escapa um valor para conteúdo de elemento XML.
function xmlCell_(v) {
  let s;
  if (v instanceof Date) s = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  else s = String(v == null ? '' : v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Transforma um cabeçalho da planilha num nome de tag XML seguro.
function xmlTag_(h) {
  let t = String(h == null ? '' : h).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');
  if (!t) t = 'campo';
  if (/^[0-9]/.test(t)) t = 'c' + t;
  return t;
}

// Exporta TODAS as transações para um XML no Google Drive e devolve o link.
// XML é mais estruturado que CSV (uma <transacao> por lançamento, tags nomeadas).
function exportarBackupXML() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const vals = sh.getDataRange().getValues();
  const headers = (vals[0] || []).map(xmlTag_);
  const tz = Session.getScriptTimeZone();
  const itens = [];
  for (let i = 1; i < vals.length; i++) {
    const campos = headers.map((tag, j) => '    <' + tag + '>' + xmlCell_(vals[i][j]) + '</' + tag + '>').join('\n');
    itens.push('  <transacao>\n' + campos + '\n  </transacao>');
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<financeiro gerado="' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm') + '">\n'
    + itens.join('\n') + (itens.length ? '\n' : '') + '</financeiro>\n';
  const nome = 'financeiro-backup-' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd-HHmm') + '.xml';
  const file = DriveApp.createFile(nome, xml, 'application/xml');
  return { ok: true, nome: nome, url: file.getUrl(), linhas: Math.max(vals.length - 1, 0) };
}

// Importa uma lista de transações (ex.: extrato), em lote, evitando duplicar
// (chave: data + descrição + valor). Retorna quantas importou/ignorou.
function importarTransacoes(lista) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_TRANS);
  if (!sh) throw new Error('Aba "Transacoes" não encontrada na planilha');
  if (!lista || !lista.length) return { ok: true, importadas: 0, ignoradas: 0 };

  const tz = Session.getScriptTimeZone();
  const keyOf = (iso, desc, valor) => iso + '|' + norm_(desc) + '|' + Math.round((Number(valor) || 0) * 100);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const map = ensureColunasTrans_(sh);
    const vals = sh.getDataRange().getValues();
    const col = (r, f) => (map[f] != null ? r[map[f]] : '');

    // Índice das transações já existentes (dedup) + histórico p/ auto-categorizar
    const existentes = {};
    const histMap = {};
    for (let i = 1; i < vals.length; i++) {
      const catExist = String(col(vals[i], 'categoria') || '').trim();
      if (catExist) { const kc = norm_(col(vals[i], 'descricao')); if (kc) histMap[kc] = catExist; }
      const dv = col(vals[i], 'data');
      if (!dv) continue;
      const dt = dv instanceof Date ? dv : new Date(dv);
      if (isNaN(dt)) continue;
      const iso = Utilities.formatDate(dt, tz, 'yyyy-MM-dd');
      existentes[keyOf(iso, col(vals[i], 'descricao'), col(vals[i], 'valor'))] = true;
    }

    const nCols = sh.getLastColumn();
    const novas = [];
    let importadas = 0;
    let ignoradas = 0;

    lista.forEach(t => {
      const descricao = String((t && t.descricao) || '').trim();
      const valor = toNumBR_(t && t.valor);
      if (!descricao || !(valor > 0)) { ignoradas++; return; }
      const dataObj = parseLocalDate_(t && t.data);
      const iso = Utilities.formatDate(dataObj, tz, 'yyyy-MM-dd');
      const k = keyOf(iso, descricao, valor);
      if (existentes[k]) { ignoradas++; return; }
      existentes[k] = true;

      const row = new Array(nCols).fill('');
      const setc = (campo, val) => { if (map[campo] != null) row[map[campo]] = val; };
      setc('id', Utilities.getUuid());
      setc('data', dataObj);
      setc('conta', String((t && t.conta) || '').trim());
      setc('meio', String((t && t.meio) || 'Conta'));
      setc('descricao', descricao);
      setc('tipo', 'Único');
      setc('natureza', norm_(t && t.natureza) === 'receita' ? 'Receita' : 'Despesa');
      let categoria = String((t && t.categoria) || '').trim();
      if (!categoria) categoria = categorizarAuto_(descricao, histMap);
      setc('categoria', categoria);
      setc('valor', valor);
      setc('obs', String((t && t.obs) || ''));
      setc('criadoEm', new Date());
      novas.push(row);
      importadas++;
    });

    if (novas.length) sh.getRange(sh.getLastRow() + 1, 1, novas.length, nCols).setValues(novas);
    return { ok: true, importadas: importadas, ignoradas: ignoradas };
  } finally {
    lock.releaseLock();
  }
}

// ===================== Contas (dinâmicas, via aba Saldos) =====================

// Lista as contas cadastradas (aba Saldos: A=Conta, B=Saldo, C=Fechamento, D=Vencimento).
// Fechamento/Vencimento (dia 1-31) são opcionais — usados para a fatura de cartão.
function getContas() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_SALD);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => String(r[0]).trim())
    .map(r => ({ conta: String(r[0]).trim(), saldo: Number(r[1]) || 0, fechamento: Number(r[2]) || 0, vencimento: Number(r[3]) || 0 }));
}

// Normaliza um dia do mês (0 = não informado; 1..31 caso contrário).
function diaMes_(v) {
  const n = Math.round(Number(v) || 0);
  if (!(n >= 1)) return 0;
  return Math.min(n, 31);
}

// Cria/atualiza uma conta (upsert por nome, ignora acento/caixa).
// saldo pode ser 0/negativo; fechamento/vencimento são opcionais (dia do cartão).
function setConta(nome, saldo, fechamento, vencimento) {
  nome = String(nome || '').trim();
  if (!nome) throw new Error('Informe o nome da conta.');
  const s = toNumBR_(saldo);
  const fech = diaMes_(fechamento);
  const venc = diaMes_(vencimento);

  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_SALD);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SALD);
    sh.getRange('A1:D1').setValues([['Conta', 'Saldo', 'Fechamento', 'Vencimento']]);
    sh.getRange('A1:D1').setFontWeight('bold');
  } else {
    const hdr = sh.getRange(1, 1, 1, 4).getValues()[0];
    if (!hdr[2] || !hdr[3]) sh.getRange('C1:D1').setValues([['Fechamento', 'Vencimento']]);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const last = sh.getLastRow();
    const nomes = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [];
    let row = -1;
    for (let i = 0; i < nomes.length; i++) {
      if (norm_(nomes[i][0]) === norm_(nome)) { row = i + 2; break; }
    }
    if (row === -1) sh.appendRow([nome, s, fech, venc]);
    else sh.getRange(row, 1, 1, 4).setValues([[nome, s, fech, venc]]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Conta salva' };
}

// Remove uma conta da aba Saldos (não altera as transações já lançadas).
function deleteConta(nome) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_SALD);
  if (!sh || sh.getLastRow() < 2) return { ok: true };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const nomes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < nomes.length; i++) {
      if (norm_(nomes[i][0]) === norm_(nome)) { sh.deleteRow(i + 2); break; }
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Conta removida' };
}

// ===================== Fatura de cartão =====================

// Fatura prevista de cada cartão (contas com dia de fechamento configurado), no ciclo
// que FECHA no mês de referência. Agrupa os lançamentos "Cartão" da conta no período
// (fechamento anterior, fechamento atual], e calcula o vencimento (por ciclo, não por
// competência). Contas sem fechamento configurado não entram.
function getFaturaCartao(mesISO) {
  const ss = SpreadsheetApp.getActive();
  const shT = ss.getSheetByName(SHEET_TRANS);
  if (!shT) throw new Error('Aba "Transacoes" não encontrada na planilha');

  const cartoesCfg = getContas().filter(c => c.fechamento > 0);
  if (!cartoesCfg.length) return { cartoes: [], semConfig: true };

  const base = mesISO ? parseLocalDate_(mesISO) : new Date();
  const tz = Session.getScriptTimeZone();
  const vals = shT.getDataRange().getValues();
  const map = vals.length ? colMapTrans_(vals[0].map(norm_)) : {};
  const col = (r, f) => (map[f] != null ? r[map[f]] : '');
  const clampDay = (y, m, d) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()));

  const cartoes = cartoesCfg.map(c => {
    const F = c.fechamento, V = c.vencimento || F;
    const closeThis = clampDay(base.getFullYear(), base.getMonth(), F);
    const closePrev = clampDay(base.getFullYear(), base.getMonth() - 1, F);
    // vencimento = 1ª ocorrência do dia V em/depois do fechamento
    let due = clampDay(closeThis.getFullYear(), closeThis.getMonth(), V);
    if (due < closeThis) due = clampDay(closeThis.getFullYear(), closeThis.getMonth() + 1, V);

    let total = 0;
    const itens = [];
    for (let i = 1; i < vals.length; i++) {
      const r = vals[i];
      if (norm_(col(r, 'meio')) !== 'cartao') continue;
      if (norm_(col(r, 'conta')) !== norm_(c.conta)) continue;
      if (norm_(col(r, 'natureza')) === 'receita') continue;
      const dv = col(r, 'data');
      if (!dv) continue;
      const dt = dv instanceof Date ? dv : new Date(dv);
      if (isNaN(dt) || !(dt > closePrev && dt <= closeThis)) continue;
      const v = Number(col(r, 'valor')) || 0;
      total += v;
      itens.push({ data: Utilities.formatDate(dt, tz, 'yyyy-MM-dd'), descricao: String(col(r, 'descricao') || ''), categoria: String(col(r, 'categoria') || ''), valor: round2_(v) });
    }
    itens.sort((a, b) => (a.data < b.data ? -1 : (a.data > b.data ? 1 : 0)));
    return {
      conta: c.conta, fechamento: F, vencimento: V,
      fechamentoData: Utilities.formatDate(closeThis, tz, 'yyyy-MM-dd'),
      vencimentoData: Utilities.formatDate(due, tz, 'yyyy-MM-dd'),
      total: round2_(total), qtd: itens.length, itens: itens
    };
  });

  const totalGeral = round2_(cartoes.reduce((a, c) => a + c.total, 0));
  return { cartoes: cartoes, semConfig: false, totalGeral: totalGeral };
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

  // Aba Saldos (C/D = fechamento/vencimento do cartão, opcionais)
  let shD = ss.getSheetByName(SHEET_SALD);
  if (!shD) {
    shD = ss.insertSheet(SHEET_SALD);
    shD.getRange('A1:D1').setValues([['Conta', 'Saldo', 'Fechamento', 'Vencimento']]);
    shD.getRange('A1:D1').setFontWeight('bold');
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

  // Aba Lembretes
  let shL = ss.getSheetByName(SHEET_LEMB);
  if (!shL) {
    shL = ss.insertSheet(SHEET_LEMB);
    shL.getRange('A1:F1').setValues([['Descrição', 'Dia', 'Valor', 'Antecedencia', 'Ativo', 'UltimoAviso']]);
    shL.getRange('A1:F1').setFontWeight('bold');
  }

  // Aba Metas
  let shM = ss.getSheetByName(SHEET_META);
  if (!shM) {
    shM = ss.insertSheet(SHEET_META);
    shM.getRange('A1:F1').setValues([['ID', 'Descrição', 'Tipo', 'Alvo', 'Prazo', 'CriadoEm']]);
    shM.getRange('A1:F1').setFontWeight('bold');
  }

  return 'Estrutura da planilha criada/atualizada com sucesso!';
}
