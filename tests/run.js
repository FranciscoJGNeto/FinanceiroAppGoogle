// Suíte de testes do backend (src/Código.js), rodando em Node com a API do
// Apps Script mockada (tests/mock-sheets.js). Não toca em planilha real.
//
//   node tests/run.js
//
// Sai com código != 0 se algum teste falhar (útil para CI).
'use strict';
const { loadApp, HEADER } = require('./mock-sheets');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('   ✗ ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (esperado ${JSON.stringify(b)}, obteve ${JSON.stringify(a)})`); }
function group(name) { console.log('\n• ' + name); }
function throws(fn, msg) { try { fn(); ok(false, msg + ' (nao lancou erro)'); } catch (e) { ok(true, msg); } }

// Constrói uma linha de transação (ordem canônica do HEADER) a partir de um objeto.
const F = { ID: 'id', Data: 'data', Conta: 'conta', Meio: 'meio', 'Descrição': 'descricao', Tipo: 'tipo', Natureza: 'natureza', Categoria: 'categoria', ParcelaAtual: 'parcelaAtual', ParcelaTotal: 'parcelaTotal', Valor: 'valor', 'Observação': 'obs', CriadoEm: 'criadoEm' };
function txRow(o) { return HEADER.map(h => { const v = o[F[h]]; return v !== undefined ? v : ''; }); }
function baseTrans(rows) { return { Transacoes: [HEADER.slice(), ...rows] }; }

// ---------------------------------------------------------------------------

group('addTransacao — valor decimal e validações');
{
  const { api, sheets } = loadApp(baseTrans([]));
  api.addTransacao({ data: '2026-07-10', conta: 'Inter', descricao: 'Farmácia', valor: '50.5' });
  const last = sheets.Transacoes.data[sheets.Transacoes.data.length - 1];
  const idxValor = HEADER.indexOf('Valor');
  eq(last[idxValor], 50.5, 'valor "50.5" gravado como 50.5 (nao 505)');
  throws(() => api.addTransacao({ descricao: '', valor: '10' }), 'descrição vazia lança');
  throws(() => api.addTransacao({ descricao: 'X', valor: '0' }), 'valor 0 lança');
  throws(() => api.addTransacao({ descricao: 'P', valor: '5', tipo: 'Parcelado', parcelaAtual: 5, parcelaTotal: 3 }), 'parcela atual > total lança');
}

group('mapeamento por cabeçalho + auto-criação de colunas (planilha legada)');
{
  // Cabeçalho antigo: sem ID, Natureza, Categoria, CriadoEm
  const legacy = { Transacoes: [
    ['Data', 'Conta', 'Meio', 'Descrição', 'Tipo', 'ParcelaAtual', 'ParcelaTotal', 'Valor', 'Observação'],
    [new Date(2026, 6, 3), 'Inter', 'Conta', 'Mercado', 'Único', '', '', 150.75, '']
  ] };
  const { api, sheets } = loadApp(legacy);
  api.addTransacao({ data: '2026-07-05', conta: 'Inter', descricao: 'Feira', valor: '80' });
  const header = sheets.Transacoes.data[0].map(String);
  ok(header.indexOf('ID') !== -1 && header.indexOf('CriadoEm') !== -1 && header.indexOf('Natureza') !== -1, 'colunas ID/Natureza/CriadoEm criadas automaticamente');
  const lista = api.listTransacoes('2026-07-01');
  eq(lista.length, 2, 'lista julho tem 2 (Mercado + Feira)');
}

group('getResumo — receita separada de despesa');
{
  const { api } = loadApp({
    Transacoes: [HEADER.slice(),
      txRow({ id: '1', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Mercado', tipo: 'Único', natureza: 'Despesa', valor: 150.75 }),
      txRow({ id: '2', data: new Date(2026, 6, 5), conta: 'Itaú', descricao: 'Uber', tipo: 'Único', natureza: 'Despesa', valor: 35.9 }),
      txRow({ id: '3', data: new Date(2026, 6, 8), conta: 'Inter', descricao: 'Freela', tipo: 'Único', natureza: 'Receita', valor: 500 }),
      txRow({ id: '4', data: new Date(2026, 5, 20), conta: 'Inter', descricao: 'Mês passado', tipo: 'Único', natureza: 'Despesa', valor: 999 })
    ],
    Saldos: [['Conta', 'Saldo', 'Fechamento', 'Vencimento', 'DataSaldo'],
      ['Inter', 0, 0, 0, new Date(2026, 6, 1)], ['Itaú', 0, 0, 0, new Date(2026, 6, 1)]]
  });
  const r = api.getResumo('2026-07-01');
  eq(r.totalGeral, 186.65, 'totalGeral só despesas de julho');
  eq(r.porConta, [{ conta: 'Inter', total: 150.75 }, { conta: 'Itaú', total: 35.9 }], 'porConta dinâmico (desc), sem a receita');
  eq(r.totalReceitas, 500, 'totalReceitas = 500');
  // saldo derivado desde 01/07 (inicial 0): fim de julho = 349.25 (Inter) − 35.9 (Itaú) = 313.35
  ok(Math.abs(r.prevFinal - 313.35) < 0.01, 'prevFinal = saldo derivado ao fim de julho');
}

group('saldo derivado — encadeia entre meses + respeita saldo manual');
{
  const spec = {
    Transacoes: [HEADER.slice(),
      txRow({ id: '1', data: new Date(2026, 0, 10), conta: 'Inter', natureza: 'Receita', valor: 1000 }),
      txRow({ id: '2', data: new Date(2026, 1, 5), conta: 'Inter', natureza: 'Despesa', valor: 300 })
    ],
    Saldos: [['Conta', 'Saldo', 'Fechamento', 'Vencimento', 'DataSaldo'], ['Inter', 1000, 0, 0, new Date(2026, 0, 1)]]
  };
  const { api } = loadApp(spec);
  eq(api.getResumo('2026-01-01').prevFinal, 2000, 'fim de janeiro = 1000 inicial + 1000 receita');
  eq(api.getResumo('2026-02-01').prevFinal, 1700, 'fim de fevereiro = 2000 − 300 (encadeia)');
  const rel = api.getResumo('2026-02-01');
  eq(rel.saldosConta[0].saldo, 1700, 'saldo por conta (hoje) = 1700');

  // Sem DataSaldo: o valor é tratado como saldo de HOJE (transação passada não muda)
  const api2 = loadApp({ Transacoes: [HEADER.slice(), txRow({ id: 'a', data: new Date(2026, 0, 10), conta: 'X', natureza: 'Despesa', valor: 100 })], Saldos: [['Conta', 'Saldo'], ['X', 500]] }).api;
  eq(api2.getResumo('2026-07-01').saldoAtual, 500, 'sem data, saldo manual de hoje é respeitado');
}

group('update / delete por ID');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'a', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Mercado', tipo: 'Único', natureza: 'Despesa', valor: 100 }),
    txRow({ id: 'b', data: new Date(2026, 6, 4), conta: 'Itaú', descricao: 'Uber', tipo: 'Único', natureza: 'Despesa', valor: 50 })
  ]));
  api.updateTransacao('a', { data: '2026-07-03', conta: 'Itaú', descricao: 'Mercado grande', tipo: 'Único', natureza: 'Despesa', valor: '200' });
  let lista = api.listTransacoes('2026-07-01');
  const m = lista.find(x => x.id === 'a');
  eq([m.descricao, m.conta, m.valor], ['Mercado grande', 'Itaú', 200], 'update alterou descrição/conta/valor');
  throws(() => api.updateTransacao('zzz', { descricao: 'x', valor: '1' }), 'update de ID inexistente lança');
  api.deleteTransacao('b');
  lista = api.listTransacoes('2026-07-01');
  eq(lista.length, 1, 'delete removeu 1 (sobra 1)');
  throws(() => api.deleteTransacao('zzz'), 'delete de ID inexistente lança');
}

group('getPorCategoria — só despesas, agrupado');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 2), descricao: 'A', natureza: 'Despesa', categoria: 'Mercado', valor: 100 }),
    txRow({ id: '2', data: new Date(2026, 6, 3), descricao: 'B', natureza: 'Despesa', categoria: 'Mercado', valor: 50 }),
    txRow({ id: '3', data: new Date(2026, 6, 4), descricao: 'C', natureza: 'Despesa', categoria: '', valor: 30 }),
    txRow({ id: '4', data: new Date(2026, 6, 5), descricao: 'D', natureza: 'Receita', categoria: 'Salário', valor: 900 })
  ]));
  const c = api.getPorCategoria('2026-07-01');
  eq(c, [{ categoria: 'Mercado', total: 150 }, { categoria: 'Sem categoria', total: 30 }], 'agrupa por categoria, ignora receita');
}

group('getEvolucao — despesas por mês');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 2), descricao: 'jul', natureza: 'Despesa', valor: 100 }),
    txRow({ id: '2', data: new Date(2026, 5, 2), descricao: 'jun', natureza: 'Despesa', valor: 200 }),
    txRow({ id: '3', data: new Date(2026, 6, 3), descricao: 'rec', natureza: 'Receita', valor: 999 })
  ]));
  const ev = api.getEvolucao('2026-07-01', 6);
  eq(ev.length, 6, 'retorna 6 meses');
  eq(ev[ev.length - 1].total, 100, 'julho = 100 (receita não conta)');
  eq(ev[ev.length - 2].total, 200, 'junho = 200');
}

group('getRelatorioAnual — totais por mês, categoria, top e média');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 0, 10), descricao: 'Salário', natureza: 'Receita', valor: 3000 }),
    txRow({ id: '2', data: new Date(2026, 0, 15), descricao: 'Aluguel', natureza: 'Despesa', categoria: 'Moradia', valor: 1200 }),
    txRow({ id: '3', data: new Date(2026, 6, 5), descricao: 'Mercado', natureza: 'Despesa', categoria: 'Mercado', valor: 800 }),
    txRow({ id: '4', data: new Date(2025, 11, 20), descricao: 'AnoAnterior', natureza: 'Despesa', categoria: 'Outros', valor: 500 })
  ]));
  const rel = api.getRelatorioAnual(2026);
  eq(rel.ano, 2026, 'ano correto');
  eq(rel.meses.length, 12, '12 meses');
  eq(rel.totais.receitas, 3000, 'receitas do ano (só 2026)');
  eq(rel.totais.despesas, 2000, 'despesas do ano = 1200 + 800 (exclui 2025)');
  eq(rel.totais.saldo, 1000, 'saldo = 3000 - 2000');
  eq(rel.meses[0].despesas, 1200, 'janeiro = 1200');
  eq(rel.meses[6].despesas, 800, 'julho = 800');
  eq(rel.porCategoria[0].categoria, 'Moradia', 'maior categoria = Moradia');
  eq(rel.topGastos[0].valor, 1200, 'maior gasto = 1200');
  eq(rel.mesesComMovimento, 2, '2 meses com movimento (jan, jul)');
  eq(rel.mediaMensalDespesa, 1000, 'média = 2000/2 meses com movimento');
  ok(rel.anos.indexOf(2026) !== -1 && rel.anos.indexOf(2025) !== -1, 'lista anos disponíveis (2025 e 2026)');
}

group('getSugestoesOrcamento — média, exclui já orçados');
{
  const { api } = loadApp({
    Transacoes: [HEADER.slice(),
      txRow({ id: '1', data: new Date(2026, 6, 2), descricao: 'm', natureza: 'Despesa', categoria: 'Mercado', valor: 100 }),
      txRow({ id: '2', data: new Date(2026, 5, 2), descricao: 'm', natureza: 'Despesa', categoria: 'Mercado', valor: 200 }),
      txRow({ id: '3', data: new Date(2026, 4, 2), descricao: 'm', natureza: 'Despesa', categoria: 'Mercado', valor: 300 }),
      txRow({ id: '4', data: new Date(2026, 5, 3), descricao: 'x', natureza: 'Despesa', categoria: 'Lazer', valor: 60 })
    ],
    Orcamentos: [['Categoria', 'Limite'], ['Lazer', 150]]
  });
  const s = api.getSugestoesOrcamento('2026-07-01', 3);
  eq(s.length, 1, 'só Mercado (Lazer já tem orçamento)');
  eq([s[0].categoria, s[0].media, s[0].sugestao], ['Mercado', 200, 200], 'média 200, sugestão 200');
}

group('getProjecaoParcelas — parcelas em aberto');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 5), descricao: 'Notebook', tipo: 'Parcelado', natureza: 'Despesa', parcelaAtual: 3, parcelaTotal: 12, valor: 200 }),
    txRow({ id: '2', data: new Date(2026, 6, 6), descricao: 'TV', tipo: 'Parcelado', natureza: 'Despesa', parcelaAtual: 12, parcelaTotal: 12, valor: 300 }),
    txRow({ id: '3', data: new Date(2026, 6, 7), descricao: 'Celular', tipo: 'Parcelado', natureza: 'Despesa', parcelaAtual: 1, parcelaTotal: 3, valor: 100 })
  ]));
  const p = api.getProjecaoParcelas('2026-07-01', 6);
  eq(p.itens.length, 2, 'só 2 em aberto (TV quitada fora)');
  eq(p.totalRestante, 2000, 'total restante = 9*200 + 2*100');
  eq(p.meses[0].total, 300, 'ago = notebook200 + celular100');
}

group('gerarRecorrentes — cria faltantes, não duplica, idempotente');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'a', data: new Date(2026, 5, 30), conta: 'Inter', descricao: 'Netflix', tipo: 'Recorrente', natureza: 'Despesa', valor: 55.9 }),
    txRow({ id: 'b', data: new Date(2026, 5, 10), conta: 'Inter', descricao: 'Aluguel', tipo: 'Recorrente', natureza: 'Despesa', valor: 1200 }),
    txRow({ id: 'd', data: new Date(2026, 6, 2), conta: 'Inter', descricao: 'Netflix', tipo: 'Recorrente', natureza: 'Despesa', valor: 55.9 })
  ]));
  const r1 = api.gerarRecorrentes('2026-07-01');
  eq([r1.criadas, r1.ignoradas], [1, 1], '1ª: cria Aluguel, ignora Netflix (já em julho)');
  const r2 = api.gerarRecorrentes('2026-07-01');
  eq(r2.criadas, 0, '2ª chamada é idempotente (0 criadas)');
}

group('recorrentes automáticos — gatilho (instalar/status/remover) + verificar');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'a', data: new Date(2026, 5, 10), conta: 'Inter', descricao: 'Aluguel', tipo: 'Recorrente', natureza: 'Despesa', valor: 1200 })
  ]));
  eq(api.statusGatilhoRecorrentes().ativo, false, 'começa sem gatilho');
  eq(api.instalarGatilhoRecorrentes().ativo, true, 'instala gatilho');
  eq(api.statusGatilhoRecorrentes().ativo, true, 'status reflete ativo');
  eq(api.instalarGatilhoRecorrentes().ativo, true, 'reinstalar não duplica (idempotente)');
  const res = api.verificarRecorrentes(); // gera no mês atual
  ok(res && res.ok === true, 'verificarRecorrentes roda gerarRecorrentes (mês atual)');
  eq(api.removerGatilhoRecorrentes().ativo, false, 'remove gatilho');
  eq(api.statusGatilhoRecorrentes().ativo, false, 'status volta a inativo');
}

group('orçamentos — upsert, validação, delete');
{
  const { api } = loadApp({ Transacoes: [HEADER.slice()] });
  api.setOrcamento('Mercado', '800');
  api.setOrcamento('Transporte', '1.234,56');
  api.setOrcamento('mercado', '900'); // upsert (normalizado)
  const lista = api.getOrcamentos();
  eq(lista.length, 2, 'upsert não duplica (2 orçamentos)');
  const merc = lista.find(o => o.categoria.toLowerCase() === 'mercado');
  eq(merc.limite, 900, 'limite atualizado para 900');
  throws(() => api.setOrcamento('X', '0'), 'limite 0 lança');
  throws(() => api.setOrcamento('', '100'), 'categoria vazia lança');
  api.deleteOrcamento('Transporte');
  eq(api.getOrcamentos().length, 1, 'delete removeu 1');
}

group('metas de economia — CRUD + progresso mensal');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'r', data: new Date(2026, 6, 5), conta: 'Inter', descricao: 'Salário', natureza: 'Receita', valor: 3000 }),
    txRow({ id: 'd1', data: new Date(2026, 6, 8), conta: 'Inter', descricao: 'Mercado', natureza: 'Despesa', valor: 1000 })
  ]));
  const s = api.setMeta({ descricao: 'Guardar', tipo: 'mensal', alvo: '1500' });
  ok(s.ok && s.id, 'setMeta cria e retorna id');
  let metas = api.getMetas('2026-07-01');
  eq(metas.length, 1, '1 meta cadastrada');
  eq(metas[0].progresso, 2000, 'progresso mensal = receitas − despesas do mês (3000−1000)');
  eq(metas[0].pct, 133, 'pct = round(2000/1500*100)');
  api.setMeta({ id: s.id, descricao: 'Guardar+', tipo: 'mensal', alvo: '2000' });
  metas = api.getMetas('2026-07-01');
  eq(metas.length, 1, 'upsert por id não duplica');
  eq(metas[0].pct, 100, 'novo alvo 2000 → 100%');
  throws(() => api.setMeta({ descricao: '', alvo: '10' }), 'descrição vazia lança');
  throws(() => api.setMeta({ descricao: 'X', alvo: '0' }), 'alvo 0 lança');
  api.deleteMeta(s.id);
  eq(api.getMetas('2026-07-01').length, 0, 'deleteMeta remove');
}

group('metas de economia — total (acumulado desde criação + meses restantes)');
{
  const spec = baseTrans([
    txRow({ id: 'a', data: new Date(2026, 4, 1), conta: 'Inter', descricao: 'Sal', natureza: 'Receita', valor: 1000 }), // mai +1000
    txRow({ id: 'b', data: new Date(2026, 5, 1), conta: 'Inter', descricao: 'Sal', natureza: 'Receita', valor: 1000 }), // jun +1000
    txRow({ id: 'c', data: new Date(2026, 6, 1), conta: 'Inter', descricao: 'Gasto', natureza: 'Despesa', valor: 500 })  // jul -500
  ]);
  spec.Metas = [
    ['ID', 'Descrição', 'Tipo', 'Alvo', 'Prazo', 'CriadoEm'],
    ['m1', 'Viagem', 'total', 6000, '2026-12', new Date(2026, 4, 1)]
  ];
  const { api } = loadApp(spec);
  const metas = api.getMetas('2026-07-01');
  eq(metas[0].progresso, 1500, 'acumula mai(1000)+jun(1000)+jul(−500) desde a criação = 1500');
  eq(metas[0].pct, 25, 'pct = 1500/6000 = 25');
  eq(metas[0].mesesRestantes, 5, 'de jul a dez = 5 meses restantes');
}

group('regra 50/30/20 — classificação + buckets/percentuais');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 2), descricao: 'Aluguel', natureza: 'Despesa', categoria: 'Moradia', valor: 500 }),
    txRow({ id: '2', data: new Date(2026, 6, 3), descricao: 'Cinema', natureza: 'Despesa', categoria: 'Lazer', valor: 200 }),
    txRow({ id: '3', data: new Date(2026, 6, 4), descricao: 'Aporte', natureza: 'Despesa', categoria: 'Investimentos', valor: 300 })
  ]));
  api.setClasseCategoria('Moradia', 'Essencial');
  api.setClasseCategoria('Lazer', 'Desejo');
  api.setClasseCategoria('Investimentos', 'Poupança');
  api.setClasseCategoria('Moradia', 'essencial'); // upsert normalizado (não duplica)
  eq(api.getClassificacao().length, 3, 'upsert não duplica (3 classes)');
  const r = api.getRegra503020('2026-07-01');
  eq(r.total, 1000, 'total de despesas do mês');
  eq([r.buckets.essencial, r.buckets.desejo, r.buckets.poupanca], [500, 200, 300], 'somas por classe');
  eq([r.pct.essencial, r.pct.desejo, r.pct.poupanca], [50, 20, 30], 'percentuais (50/20/30)');
  eq(r.buckets.naoClassificado, 0, 'nada sem classe');
  api.setClasseCategoria('Lazer', ''); // remove classificação
  const r2 = api.getRegra503020('2026-07-01');
  eq(r2.buckets.naoClassificado, 200, 'Lazer volta para não classificado');
}

group('backup agendado — gatilho (instalar/status/remover) + execução');
{
  const { api, driveFiles } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Mercado', natureza: 'Despesa', valor: 50 })
  ]));
  eq(api.statusGatilhoBackup().ativo, false, 'começa sem gatilho');
  const ins = api.instalarGatilhoBackup('semanal');
  eq([ins.ativo, ins.freq], [true, 'semanal'], 'instala gatilho semanal');
  const st = api.statusGatilhoBackup();
  eq([st.ativo, st.freq], [true, 'semanal'], 'status reflete ativo + frequência');
  api.instalarGatilhoBackup('mensal'); // troca de frequência não duplica
  eq(api.statusGatilhoBackup().freq, 'mensal', 'reinstalar troca a frequência (idempotente)');
  const res = api.backupAgendado(); // execução do gatilho gera backup
  ok(res && res.ok === true && driveFiles.length === 1, 'backupAgendado gera 1 arquivo no Drive');
  eq(api.removerGatilhoBackup().ativo, false, 'remove gatilho');
  eq([api.statusGatilhoBackup().ativo, api.statusGatilhoBackup().freq], [false, ''], 'status volta a inativo e limpa frequência');
}

group('bot Telegram — parser de mensagem');
{
  const { api } = loadApp(baseTrans([]));
  const contas = ['Inter', 'Itaú', 'Nubank'];
  const a = api.parseLancamentoMsg_('Mercado 85,90 Inter', contas);
  eq([a.ok, a.descricao, a.valor, a.conta, a.natureza], [true, 'Mercado', 85.9, 'Inter', 'Despesa'], 'despesa com conta');
  const b = api.parseLancamentoMsg_('Uber 25', contas);
  eq([b.descricao, b.valor, b.conta, b.natureza], ['Uber', 25, '', 'Despesa'], 'despesa sem conta');
  const c = api.parseLancamentoMsg_('+Salario 3000 Inter', contas);
  eq([c.valor, c.conta, c.natureza], [3000, 'Inter', 'Receita'], 'receita por "+"');
  const d = api.parseLancamentoMsg_('Padaria sem valor', contas);
  eq(d.ok, false, 'sem número → inválido');
}

group('bot Telegram — polling (getUpdates → lança + responde)');
{
  const { api, tg } = loadApp({ Transacoes: [HEADER.slice()], Saldos: [['Conta', 'Saldo'], ['Inter', 0]] });
  api.setConfigTelegram('123456:ABC-token', '999');
  const cfg = api.getConfigTelegram();
  eq([cfg.configurado, cfg.chatId], [true, '999'], 'config salva (chatId)');
  ok(cfg.tokenMasc.indexOf('oken') !== -1 && cfg.tokenMasc.indexOf('123456') === -1, 'token mascarado');
  // 1 mensagem válida do chat autorizado + 1 de outro chat (ignorada)
  tg.updates = [
    { update_id: 10, message: { chat: { id: 999 }, text: 'Mercado 50 Inter' } },
    { update_id: 11, message: { chat: { id: 111 }, text: 'Hacker 999' } }
  ];
  const r = api.verificarTelegram();
  eq([r.ok, r.processadas, r.importadas], [true, 2, 1], 'processa 2, lança 1 (só do chat autorizado)');
  const jul = api.listTransacoes(new Date().toISOString().slice(0, 7) + '-01');
  ok(jul.some(x => x.descricao === 'Mercado' && x.valor === 50), 'transação criada pelo bot');
  ok(tg.sent.some(m => /Registrado/.test(m.text)), 'respondeu confirmando');
  // offset avança → getUpdates seguinte sem as mesmas mensagens não relança
  tg.updates = [];
  const r2 = api.verificarTelegram();
  eq(r2.importadas, 0, 'sem novas mensagens, nada é relançado');
  eq(api.instalarGatilhoTelegram().ativo, true, 'instala gatilho de 1 min');
  eq(api.getConfigTelegram().ativo, true, 'status reflete gatilho ativo');
  eq(api.removerGatilhoTelegram().ativo, false, 'remove gatilho');
}

group('getCompartilhados — por serviço (legado) e reembolso');
{
  const { api } = loadApp({
    Transacoes: [HEADER.slice(),
      txRow({ id: '1', data: new Date(2026, 6, 2), conta: 'Inter', descricao: 'Disney+', natureza: 'Despesa', valor: 40 }),
      txRow({ id: '2', data: new Date(2026, 6, 3), conta: 'Itaú', descricao: 'Mercado', natureza: 'Despesa', valor: 200 })
    ],
    Servicos: [['Nome', 'Compartilhado', 'Rateio'], ['Disney', true, 0.5]],
    Config: [['Configuração', 'Valor'], ['% reembolso padrão', 0.5]]
  });
  const c = api.getCompartilhados('2026-07-01');
  eq(c.total, 40, 'total compartilhado = 40 (só Disney+)');
  eq(c.reembolso, 20, 'reembolso = 40 * 0.5');
}

group('compartilhado POR LANÇAMENTO (flag + rateio próprio)');
{
  const { api } = loadApp({ Transacoes: [HEADER.slice()], Config: [['Configuração', 'Valor'], ['% reembolso padrão', 0.5]] });
  // Assinatura compartilhada 70% + despesa normal
  api.addTransacao({ data: '2026-07-05', conta: 'Inter', descricao: 'Notion', natureza: 'Despesa', valor: '100', compartilhado: true, rateio: 0.7 });
  api.addTransacao({ data: '2026-07-06', conta: 'Inter', descricao: 'Almoço', natureza: 'Despesa', valor: '30' });
  const r = api.getResumo('2026-07-01');
  eq(r.totalCompart, 100, 'totalCompart = 100 (só o Notion)');
  eq(r.reembolso, 70, 'reembolso = 100 * 0.7 (rateio do próprio lançamento)');
  eq(r.totalAjustado, 60, 'ajustado = 130 - 70');
  const lst = api.listTransacoes('2026-07-01');
  const notion = lst.find(x => x.descricao === 'Notion');
  eq([notion.compartilhado, notion.rateio], [true, 0.7], 'listTransacoes devolve compartilhado/rateio');
}

group('importarTransacoes — auto-categorização');
{
  const { api } = loadApp(baseTrans([
    // histórico: já categorizou "Padaria do Zé" como Alimentação
    txRow({ id: 'h', data: new Date(2026, 5, 1), descricao: 'Padaria do Zé', natureza: 'Despesa', categoria: 'Alimentação', valor: 12 })
  ]));
  api.importarTransacoes([
    { data: '2026-07-02', descricao: 'NETFLIX.COM', valor: 55.9, conta: 'Inter', natureza: 'Despesa' }, // keyword -> Assinaturas
    { data: '2026-07-03', descricao: 'UBER *TRIP', valor: 20, conta: 'Inter', natureza: 'Despesa' },     // keyword -> Transporte
    { data: '2026-07-04', descricao: 'Padaria do Zé', valor: 15, conta: 'Inter', natureza: 'Despesa' }   // histórico -> Alimentação
  ]);
  const lst = api.listTransacoes('2026-07-01');
  const byDesc = d => lst.find(x => x.descricao === d);
  eq(byDesc('NETFLIX.COM').categoria, 'Assinaturas', 'Netflix -> Assinaturas (keyword)');
  eq(byDesc('UBER *TRIP').categoria, 'Transporte', 'Uber -> Transporte (keyword)');
  eq(byDesc('Padaria do Zé').categoria, 'Alimentação', 'Padaria -> Alimentação (histórico)');
}

group('importarTransacoes — keywords com espaço + sem falso-positivo');
{
  const { api } = loadApp(baseTrans([]));
  api.importarTransacoes([
    { data: '2026-07-02', descricao: 'SEM PARAR PEDAGIO SP', valor: 12, conta: 'Inter', natureza: 'Despesa' },
    { data: '2026-07-03', descricao: 'PAO DE ACUCAR 123', valor: 90, conta: 'Inter', natureza: 'Despesa' },
    { data: '2026-07-04', descricao: 'TARIFA EXTRATO MENSAL', valor: 9, conta: 'Inter', natureza: 'Despesa' }
  ]);
  const lst = api.listTransacoes('2026-07-01');
  const byDesc = d => lst.find(x => x.descricao === d);
  eq(byDesc('SEM PARAR PEDAGIO SP').categoria, 'Transporte', 'keyword com espaço casa (Sem Parar)');
  eq(byDesc('PAO DE ACUCAR 123').categoria, 'Mercado', 'Pão de Açúcar -> Mercado');
  eq(byDesc('TARIFA EXTRATO MENSAL').categoria, '', '"EXTRATO" NÃO vira Mercado (sem falso-positivo)');
}

group('contas — cadastro dinâmico (upsert, delete)');
{
  const { api } = loadApp({ Transacoes: [HEADER.slice()], Saldos: [['Conta', 'Saldo']] });
  api.setConta('Nubank', '1.000,50');
  api.setConta('Inter', '0');
  api.setConta('nubank', '250'); // upsert normalizado
  const lista = api.getContas();
  eq(lista.length, 2, 'upsert não duplica (2 contas)');
  const nu = lista.find(c => c.conta.toLowerCase() === 'nubank');
  eq(nu.saldo, 250, 'saldo do Nubank atualizado para 250');
  throws(() => api.setConta('', '100'), 'conta sem nome lança');
  api.deleteConta('Inter');
  eq(api.getContas().length, 1, 'delete removeu 1');
}

group('fatura de cartão — ciclo por fechamento/vencimento');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'a', data: new Date(2026, 6, 10), conta: 'Nubank', meio: 'Cartão', descricao: 'Compra1', natureza: 'Despesa', valor: 100 }),
    txRow({ id: 'b', data: new Date(2026, 5, 29), conta: 'Nubank', meio: 'Cartão', descricao: 'Compra2', natureza: 'Despesa', valor: 50 }),
    txRow({ id: 'c', data: new Date(2026, 5, 20), conta: 'Nubank', meio: 'Cartão', descricao: 'CicloAnterior', natureza: 'Despesa', valor: 999 }),
    txRow({ id: 'd', data: new Date(2026, 6, 28), conta: 'Nubank', meio: 'Cartão', descricao: 'NoFechamento', natureza: 'Despesa', valor: 30 }),
    txRow({ id: 'e', data: new Date(2026, 6, 29), conta: 'Nubank', meio: 'Cartão', descricao: 'ProxCiclo', natureza: 'Despesa', valor: 77 }),
    txRow({ id: 'f', data: new Date(2026, 6, 15), conta: 'Nubank', meio: 'Conta', descricao: 'DebitoNaoEntra', natureza: 'Despesa', valor: 200 })
  ]));
  api.setConta('Nubank', '0', 28, 7);
  const cfg = api.getContas().find(c => c.conta === 'Nubank');
  eq([cfg.fechamento, cfg.vencimento], [28, 7], 'conta guarda fechamento/vencimento');
  const fat = api.getFaturaCartao('2026-07-01');
  eq(fat.semConfig, false, 'há cartão configurado');
  eq(fat.cartoes.length, 1, '1 cartão na fatura');
  const nu = fat.cartoes[0];
  eq(nu.total, 180, 'fatura = 100+50+30 (janela (28/jun, 28/jul]; exclui débito e ciclos vizinhos)');
  eq(nu.qtd, 3, '3 lançamentos na fatura');
  eq(nu.fechamentoData, '2026-07-28', 'fecha em 28/jul');
  eq(nu.vencimentoData, '2026-08-07', 'vence em 07/ago (1ª ocorrência após o fechamento)');
  eq(fat.totalGeral, 180, 'total geral das faturas');
}

group('fatura de cartão — sem cartão configurado');
{
  const { api } = loadApp(baseTrans([]));
  api.setConta('Carteira', '100'); // sem dia de fechamento
  eq(api.getFaturaCartao('2026-07-01').semConfig, true, 'sem fechamento → semConfig=true');
}

group('exportarBackup — CSV no Drive (com escaping)');
{
  const { api, driveFiles } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Mercado, feira', natureza: 'Despesa', valor: 150.75 })
  ]));
  const res = api.exportarBackup();
  ok(/^financeiro-backup-.*\.csv$/.test(res.nome), 'nome do arquivo no padrão financeiro-backup-*.csv');
  eq(res.linhas, 1, 'contou 1 lançamento');
  ok(driveFiles.length === 1, 'criou 1 arquivo no Drive (mock)');
  const csv = driveFiles[0].content;
  ok(csv.indexOf('"Mercado, feira"') !== -1, 'descrição com vírgula fica entre aspas no CSV');
  ok(csv.indexOf('2026-07-03') !== -1, 'data formatada como yyyy-MM-dd');
}

group('exportarBackupXML — XML no Drive (com escaping)');
{
  const { api, driveFiles } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Café & Cia <loja>', natureza: 'Despesa', valor: 12.5 })
  ]));
  const res = api.exportarBackupXML();
  ok(/^financeiro-backup-.*\.xml$/.test(res.nome), 'nome do arquivo no padrão financeiro-backup-*.xml');
  eq(res.linhas, 1, 'contou 1 lançamento');
  ok(driveFiles.length === 1 && driveFiles[0].mime === 'application/xml', 'criou 1 XML no Drive (mime application/xml)');
  const xml = driveFiles[0].content;
  ok(xml.indexOf('<?xml') === 0, 'começa com declaração XML');
  ok(xml.indexOf('<transacao>') !== -1 && xml.indexOf('</financeiro>') !== -1, 'estrutura financeiro/transacao presente');
  ok(xml.indexOf('Café &amp; Cia &lt;loja&gt;') !== -1, 'caracteres especiais escapados (& < >)');
  ok(xml.indexOf('<Descricao>') !== -1, 'tag derivada do cabeçalho, sem acento (Descricao)');
  ok(xml.indexOf('2026-07-03') !== -1, 'data formatada como yyyy-MM-dd');
}

group('importarTransacoes — lote e dedup');
{
  const { api } = loadApp(baseTrans([
    txRow({ id: 'x', data: new Date(2026, 6, 5), conta: 'Inter', descricao: 'Mercado', natureza: 'Despesa', valor: 150 })
  ]));
  const res = api.importarTransacoes([
    { data: '2026-07-05', descricao: 'Mercado', valor: 150, conta: 'Inter', natureza: 'Despesa' }, // duplicado
    { data: '2026-07-06', descricao: 'Uber', valor: 30, conta: 'Inter', natureza: 'Despesa' },
    { data: '2026-07-07', descricao: 'Salário', valor: 3000, conta: 'Inter', natureza: 'Receita' },
    { data: '2026-07-08', descricao: '', valor: 10, conta: 'Inter' } // inválida (sem descrição)
  ]);
  eq([res.importadas, res.ignoradas], [2, 2], 'importa 2 (Uber, Salário); ignora duplicado e inválida');
  const jul = api.listTransacoes('2026-07-01');
  eq(jul.length, 3, 'julho passa a ter 3 (Mercado + 2 importadas)');
  const rec = jul.find(x => x.descricao === 'Salário');
  eq(rec.natureza, 'Receita', 'natureza da receita importada preservada');
}

group('importarTransacoes — mantém repetidos legítimos + meio do cartão');
{
  const { api } = loadApp({ Transacoes: [HEADER.slice()], Saldos: [['Conta', 'Saldo'], ['Nubank', 0]] });
  const lote = [
    { data: '2026-07-06', descricao: 'UBER', valor: 25, conta: 'Nubank', meio: 'Cartão', natureza: 'Despesa' },
    { data: '2026-07-06', descricao: 'UBER', valor: 25, conta: 'Nubank', meio: 'Cartão', natureza: 'Despesa' } // repetido legítimo no mesmo extrato
  ];
  const r1 = api.importarTransacoes(lote);
  eq([r1.importadas, r1.ignoradas], [2, 0], 'mantém os 2 Uber idênticos do mesmo extrato');
  const jul = api.listTransacoes('2026-07-01');
  eq(jul.filter(x => x.descricao === 'UBER').length, 2, '2 lançamentos Uber na planilha');
  eq(jul[0].meio, 'Cartão', 'meio "Cartão" preservado na importação');
  const r2 = api.importarTransacoes(lote); // reimportar o mesmo arquivo
  eq([r2.importadas, r2.ignoradas], [0, 2], 'reimportar o mesmo extrato ignora tudo (já existe)');
}

group('lembretes — CRUD + verificação/e-mail (idempotente no mês)');
{
  const { api, emails } = loadApp({ Transacoes: [HEADER.slice()], Lembretes: [['Descrição', 'Dia', 'Valor', 'Antecedencia', 'Ativo', 'UltimoAviso']] });
  api.setLembrete('Aluguel', 10, '1200', 3, true);
  api.setLembrete('aluguel', 15, '1300', 5, true); // upsert (normalizado)
  const lst = api.getLembretes();
  eq(lst.length, 1, 'upsert não duplica');
  eq([lst[0].dia, lst[0].valor, lst[0].antecedencia], [15, 1300, 5], 'dados do lembrete atualizados');

  const diaHoje = new Date().getDate();
  api.setLembrete('Cartão', diaHoje, '500', 0, true); // vence hoje
  const r1 = api.verificarLembretes();
  ok(r1.enviados >= 1, 'verifica e envia (vence hoje)');
  eq(emails.length, 1, 'um e-mail consolidado');
  eq(api.verificarLembretes().enviados, 0, 'não reenvia no mesmo mês (idempotente)');

  api.deleteLembrete('Aluguel');
  eq(api.getLembretes().length, 1, 'delete remove');
}

group('lembretes — gatilho automático (instalar/status/remover)');
{
  const { api } = loadApp({ Transacoes: [HEADER.slice()] });
  eq(api.statusGatilhoLembretes().ativo, false, 'começa sem gatilho');
  api.instalarGatilhoLembretes();
  eq(api.statusGatilhoLembretes().ativo, true, 'após instalar: ativo');
  api.instalarGatilhoLembretes(); // reinstalar não duplica
  api.removerGatilhoLembretes();
  eq(api.statusGatilhoLembretes().ativo, false, 'após remover: inativo');
}

// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(40)}`);
console.log(`Resultado: ${pass} passaram, ${fail} falharam.`);
process.exit(fail ? 1 : 0);
