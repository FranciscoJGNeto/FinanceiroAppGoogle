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
  const { api } = loadApp(baseTrans([
    txRow({ id: '1', data: new Date(2026, 6, 3), conta: 'Inter', descricao: 'Mercado', tipo: 'Único', natureza: 'Despesa', valor: 150.75 }),
    txRow({ id: '2', data: new Date(2026, 6, 5), conta: 'Itaú', descricao: 'Uber', tipo: 'Único', natureza: 'Despesa', valor: 35.9 }),
    txRow({ id: '3', data: new Date(2026, 6, 8), conta: 'Inter', descricao: 'Freela', tipo: 'Único', natureza: 'Receita', valor: 500 }),
    txRow({ id: '4', data: new Date(2026, 5, 20), conta: 'Inter', descricao: 'Mês passado', tipo: 'Único', natureza: 'Despesa', valor: 999 })
  ]), );
  const r = api.getResumo('2026-07-01');
  eq(r.totalGeral, 186.65, 'totalGeral só despesas de julho');
  eq(r.porConta, [{ conta: 'Inter', total: 150.75 }, { conta: 'Itaú', total: 35.9 }], 'porConta dinâmico (desc), sem a receita');
  eq(r.totalReceitas, 500, 'totalReceitas = 500');
  ok(Math.abs(r.prevFinal - (0 + 0 + 500 - 186.65)) < 0.01, 'prevFinal soma receita e desconta despesa');
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
