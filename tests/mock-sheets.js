// Mock mínimo da API do Google Apps Script para testar src/Codigo.js em Node,
// sem tocar em nenhuma planilha real. Usado por tests/run.js.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function colToNum(letters) {
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}
function parseA1(a1) {
  const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(a1);
  const c1 = colToNum(m[1]), r1 = +m[2];
  const c2 = m[3] ? colToNum(m[3]) : c1, r2 = m[4] ? +m[4] : r1;
  return { row: r1, col: c1, numRows: r2 - r1 + 1, numCols: c2 - c1 + 1 };
}

class Sheet {
  constructor(name, data) { this.name = name; this.data = data || []; }
  _ensure(r, c) {
    while (this.data.length < r) this.data.push([]);
    for (let i = 0; i < this.data.length; i++) while (this.data[i].length < c) this.data[i].push('');
  }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getDataRange() { return this._range(1, 1, this.data.length, this.getLastColumn()); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') { const p = parseA1(a); return this._range(p.row, p.col, p.numRows, p.numCols); }
    return this._range(a, b, c, d);
  }
  deleteRow(r) { this.data.splice(r - 1, 1); }
  appendRow(row) { this.data.push(row.slice()); }
  _range(row, col, nR, nC) {
    const sh = this;
    return {
      getValues() {
        const o = [];
        for (let i = 0; i < nR; i++) {
          const rr = [];
          for (let j = 0; j < nC; j++) { const R = sh.data[row - 1 + i] || []; rr.push(R[col - 1 + j] !== undefined ? R[col - 1 + j] : ''); }
          o.push(rr);
        }
        return o;
      },
      getValue() { const R = sh.data[row - 1] || []; return R[col - 1] !== undefined ? R[col - 1] : ''; },
      setValue(v) { sh._ensure(row, col); sh.data[row - 1][col - 1] = v; return this; },
      setValues(v) { sh._ensure(row + nR - 1, col + nC - 1); for (let i = 0; i < nR; i++) for (let j = 0; j < nC; j++) sh.data[row - 1 + i][col - 1 + j] = v[i][j]; return this; },
      setFontWeight() { return this; }
    };
  }
}
class Spreadsheet {
  constructor(sheets) { this.sheets = sheets; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets[n] = s; return s; }
}

// Carrega src/Codigo.js num contexto isolado com a API mockada.
// `sheetsSpec`: { NomeAba: [[linha],[linha]...] }. Retorna { api, ss, sheets }.
function loadApp(sheetsSpec) {
  const sheets = {};
  Object.keys(sheetsSpec || {}).forEach(name => { sheets[name] = new Sheet(name, sheetsSpec[name].map(r => r.slice())); });
  const ss = new Spreadsheet(sheets);
  const driveFiles = [];
  const emails = [];
  const tg = { updates: [], sent: [] }; // mock do Telegram (getUpdates/sendMessage)

  const mesesPt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const pad = n => String(n).padStart(2, '0');
  const ctx = {
    SpreadsheetApp: { getActive: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 10),
      formatDate: (d, tz, f) => {
        if (f.indexOf('yyyy-MM-dd') !== -1) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        if (f.indexOf('dd/MM') !== -1) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        if (f.indexOf('MMM/yy') !== -1) return `${mesesPt[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo', getEffectiveUser: () => ({ getEmail: () => 'teste@exemplo.com' }) },
    DriveApp: { createFile: (nome, content, mime) => { const f = { nome, content, mime, getUrl: () => 'https://drive.google.com/file/' + nome }; driveFiles.push(f); return f; } },
    MailApp: { sendEmail: (to, subj, body) => { emails.push({ to, subj, body }); } },
    ScriptApp: {
      _triggers: [],
      WeekDay: { MONDAY: 'MONDAY' },
      newTrigger: (fn) => { const t = { fn, timeBased: () => t, everyDays: () => t, everyWeeks: () => t, everyMinutes: () => t, onWeekDay: () => t, onMonthDay: () => t, atHour: () => t, create: () => { ctx.ScriptApp._triggers.push({ getHandlerFunction: () => fn, _id: Math.random() }); } }; return t; },
      getProjectTriggers: () => ctx.ScriptApp._triggers,
      deleteTrigger: (t) => { ctx.ScriptApp._triggers = ctx.ScriptApp._triggers.filter(x => x !== t); }
    },
    PropertiesService: (() => { const store = {}; const api = { getProperty: (k) => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); return api; }, deleteProperty: (k) => { delete store[k]; return api; } }; return { getScriptProperties: () => api }; })(),
    UrlFetchApp: { fetch: (url, params) => { let body; if (/getUpdates/.test(url)) body = { ok: true, result: tg.updates }; else if (/sendMessage/.test(url)) { tg.sent.push((params && params.payload) || {}); body = { ok: true }; } else body = { ok: true }; return { getContentText: () => JSON.stringify(body) }; } },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: () => ({ setMimeType() { return this; } }) },
    HtmlService: {},
    console, Date, Math, JSON, String, Number, Array, Object, RegExp, parseFloat, parseInt, isNaN
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'Codigo.js'), 'utf8');
  vm.runInContext(code, ctx);

  const nomes = ['addTransacao', 'updateTransacao', 'deleteTransacao', 'listTransacoes', 'getResumo',
    'getEvolucao', 'getPorCategoria', 'getRelatorioAnual', 'getSugestoesOrcamento', 'getProjecaoParcelas', 'getCompartilhados',
    'gerarRecorrentes', 'verificarRecorrentes', 'instalarGatilhoRecorrentes',
    'removerGatilhoRecorrentes', 'statusGatilhoRecorrentes',
    'getOrcamentos', 'setOrcamento', 'deleteOrcamento',
    'getMetas', 'setMeta', 'deleteMeta',
    'getRegra503020', 'getClassificacao', 'setClasseCategoria',
    'getRegras', 'setRegra', 'deleteRegra', 'recategorizar', 'getCategorias', 'renomearCategoria',
    'setCategoriaTransacao', 'setTipoTransacao', 'setCategoria', 'deleteCategoria',
    'getContas', 'setConta', 'deleteConta', 'getFaturaCartao', 'exportarBackup', 'exportarBackupXML', 'importarTransacoes',
    'backupAgendado', 'instalarGatilhoBackup', 'removerGatilhoBackup', 'statusGatilhoBackup',
    'parseLancamentoMsg_', 'getConfigTelegram', 'setConfigTelegram', 'verificarTelegram',
    'instalarGatilhoTelegram', 'removerGatilhoTelegram',
    'getLembretes', 'setLembrete', 'deleteLembrete', 'getLembretesProximos', 'verificarLembretes',
    'instalarGatilhoLembretes', 'removerGatilhoLembretes', 'statusGatilhoLembretes', 'migrarEstrutura'];
  const api = vm.runInContext('({' + nomes.join(',') + '})', ctx);
  return { api, ss, sheets, driveFiles, emails, tg };
}

// Cabeçalho padrão da aba Transacoes (ordem canônica).
const HEADER = ['ID', 'Data', 'Conta', 'Meio', 'Descrição', 'Tipo', 'Natureza', 'Categoria',
  'ParcelaAtual', 'ParcelaTotal', 'Valor', 'Observação', 'CriadoEm'];

module.exports = { loadApp, HEADER, Sheet, Spreadsheet };
