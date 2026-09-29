/*
 * Corretor de Simulados A×B — núcleo de cálculo.
 * Funções puras: não tocam na tela nem no armazenamento.
 * Tudo o que aparece como número na tela sai daqui.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------
   * Tabelas fixas
   * ------------------------------------------------------------- */

  var CAUSAS = [
    { id: 'nao_sabia', nome: 'não sabia o conteúdo', contramedida: 'reestudo do assunto' },
    { id: 'leu_errado', nome: 'leu errado o enunciado', contramedida: 'treino de leitura de comando' },
    { id: 'distrator', nome: 'caiu no distrator', contramedida: 'eliminação escrita na próxima' },
    { id: 'desatencao', nome: 'desatenção', contramedida: 'bloco mais curto, na hora' },
    { id: 'chute', nome: 'chute', contramedida: 'marcar para revisão em vez de adivinhar' }
  ];

  var CONFIANCAS = [
    { id: 'C', nome: 'C = certeza' },
    { id: 'D', nome: 'D = dúvida' },
    { id: 'CH', nome: 'CH = chute' }
  ];

  var ETAPAS_A = ['D0', 'D2', 'D7', 'D21'];

  var CONFIG_PADRAO = {
    A: { intervalos: [0, 2, 7, 21], novoCicloAoErrar: true },
    B: { caixas: [1, 3, 7, 16, 35] }
  };

  var RESSALVA_PLACAR = 'Esta comparação não prova qual método é melhor: é um candidato só, em concursos, bancas, assuntos e tempos diferentes. Ela produz uma impressão MEDIDA, com denominador e data.';
  var FRASE_BLOQUEIO = 'semana ruim não muda método: aguarde a janela 2';
  var AVISO_SEM_BLOCOS = 'preencher pelo edital antes de lançar simulado';

  function causaPorId(id) {
    for (var i = 0; i < CAUSAS.length; i++) if (CAUSAS[i].id === id) return CAUSAS[i];
    return null;
  }

  /* ---------------------------------------------------------------
   * Datas (sempre texto AAAA-MM-DD; contas feitas em UTC para não
   * sofrer com horário de verão)
   * ------------------------------------------------------------- */

  var hojeFixo = null;

  function dois(n) { return (n < 10 ? '0' : '') + n; }

  function hoje() {
    if (hojeFixo) return hojeFixo;
    var d = new Date();
    return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate());
  }

  function fixarHoje(s) { hojeFixo = s || null; }

  function paraUTC(s) {
    var p = String(s).split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  function deUTC(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + dois(d.getUTCMonth() + 1) + '-' + dois(d.getUTCDate());
  }

  function somarDias(s, n) { return deUTC(paraUTC(s) + n * 86400000); }

  function diasEntre(a, b) { return Math.round((paraUTC(b) - paraUTC(a)) / 86400000); }

  function dataValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    return deUTC(paraUTC(s)) === s;
  }

  function fmtData(s) {
    if (!s) return '—';
    var p = String(s).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  /* ---------------------------------------------------------------
   * Números (vírgula decimal, percentual sempre com denominador)
   * ------------------------------------------------------------- */

  function arred(x, casas) {
    var f = Math.pow(10, casas == null ? 2 : casas);
    return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * f) / f;
  }

  function fmtNum(x, casas) {
    if (x == null || isNaN(x)) return '—';
    var r = arred(x, casas == null ? 2 : casas);
    if (r === 0) r = 0; // evita "-0"
    return String(r).replace('.', ',');
  }

  function pctValor(n, d) { return d > 0 ? arred(n / d * 100, 1) : null; }

  /** "12/20 = 60%". Nunca devolve percentual sem o denominador. */
  function fmtPct(n, d) {
    if (!d) return fmtNum(n) + '/0 (sem dados)';
    return fmtNum(n) + '/' + fmtNum(d) + ' = ' + fmtNum(pctValor(n, d), 1) + '%';
  }

  function lerNumero(txt) {
    if (txt == null) return null;
    var s = String(txt).trim().replace(/\s/g, '');
    if (s === '') return null;
    if (/^-?\d+(,\d+)?$/.test(s)) s = s.replace(',', '.');
    else if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  function inteiroPositivo(x) { return typeof x === 'number' && isFinite(x) && x > 0 && Math.floor(x) === x; }
  function inteiroNaoNegativo(x) { return typeof x === 'number' && isFinite(x) && x >= 0 && Math.floor(x) === x; }

  /* ---------------------------------------------------------------
   * Concurso
   * ------------------------------------------------------------- */

  function letrasDe(numAlternativas) { return 'ABCDEFGHIJ'.slice(0, numAlternativas || 0).split(''); }

  function totalQuestoes(blocos) {
    var t = 0;
    (blocos || []).forEach(function (b) { t += b.numQuestoes || 0; });
    return t;
  }

  function totalPontos(blocos) {
    var t = 0;
    (blocos || []).forEach(function (b) { t += (b.numQuestoes || 0) * (b.pontosPorQuestao || 0); });
    return arred(t);
  }

  /** Motivos que impedem lançar simulado neste concurso (lista vazia = pode lançar). */
  function bloqueiosLancamento(conc) {
    var m = [];
    if (!conc) return ['Escolha um concurso.'];
    if (!conc.blocos || conc.blocos.length === 0) m.push(AVISO_SEM_BLOCOS);
    else if (totalQuestoes(conc.blocos) === 0) m.push('Os blocos não têm questões: ' + AVISO_SEM_BLOCOS);
    if (!conc.numAlternativas) m.push('Número de alternativas não cadastrado: ' + AVISO_SEM_BLOCOS);
    return m;
  }

  /** Índice do bloco (0, 1, ...) de cada questão, pela numeração. */
  function mapaBlocos(blocos) {
    var mapa = [];
    (blocos || []).forEach(function (b, i) {
      for (var k = 0; k < (b.numQuestoes || 0); k++) mapa.push(i);
    });
    return mapa;
  }

  /** Cópia das regras do concurso guardada dentro do simulado (editar o concurso depois não muda simulados antigos). */
  function regrasDoConcurso(conc) {
    return JSON.parse(JSON.stringify({
      nome: conc.nome, banca: conc.banca || '', alvo: conc.alvo || '',
      numAlternativas: conc.numAlternativas, minimoPontos: conc.minimoPontos,
      zeroElimina: conc.zeroElimina, meta: conc.meta,
      blocos: (conc.blocos || []).map(function (b) {
        return { nome: b.nome, numQuestoes: b.numQuestoes, pontosPorQuestao: b.pontosPorQuestao, assuntos: (b.assuntos || []).slice() };
      })
    }));
  }

  function questoesEmBranco(blocos) {
    return mapaBlocos(blocos).map(function (bi, i) {
      return { n: i + 1, bloco: bi, gabarito: '', anulada: false, justificativa: '', marcada: '', assunto: '', confianca: '', eliminacao: false, par: '', causa: '' };
    });
  }

  /* ---------------------------------------------------------------
   * Leitura de sequências coladas (ex.: "ABCDE...")
   * gabarito: letra ou * / X = anulada
   * marcações: letra ou - . _ = em branco
   * ------------------------------------------------------------- */

  function lerSequencia(texto, numAlternativas, tipo) {
    var letras = letrasDe(numAlternativas);
    var t = String(texto || '').toUpperCase().replace(/[\s,;]+/g, '');
    var valores = [], invalidos = [];
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (letras.indexOf(ch) >= 0) valores.push(ch);
      else if (tipo === 'gabarito' && (ch === '*' || ch === 'X')) valores.push('*');
      else if (tipo === 'marcacao' && (ch === '-' || ch === '.' || ch === '_')) valores.push('');
      else invalidos.push(ch);
    }
    return { valores: valores, invalidos: invalidos };
  }

  /* ---------------------------------------------------------------
   * Classificação de cada questão
   * ------------------------------------------------------------- */

  /** ANULADA | PENDENTE (sem gabarito) | BRANCO | ERRO | RISCO | ACERTO */
  function classificar(q) {
    if (q.anulada) return 'ANULADA';
    if (!q.gabarito) return 'PENDENTE';
    if (!q.marcada) return 'BRANCO';
    if (q.marcada !== q.gabarito) return 'ERRO';
    // Acerto com chute ou sem eliminação escrita vale ponto, mas é RISCO — nunca domínio.
    if (q.confianca === 'CH' || !q.eliminacao) return 'RISCO';
    return 'ACERTO';
  }

  function ehAcerto(c) { return c === 'ACERTO' || c === 'RISCO'; }
  function ehErro(c) { return c === 'ERRO' || c === 'BRANCO'; }

  /** Assunto usado nas contas: a linha escolhida ou, se nenhuma, o nome do bloco. */
  function assuntoDaQuestao(q, regras) {
    if (q.assunto) return q.assunto;
    var b = regras.blocos[q.bloco];
    return b ? b.nome : '(sem bloco)';
  }

  /** Pendências que impedem salvar o simulado. */
  function pendenciasSimulado(rasc, regras) {
    var p = [];
    if (!dataValida(rasc.data)) p.push('Informe a data do simulado.');
    if (!inteiroPositivo(rasc.minutos)) p.push('Informe os minutos gastos na prova (número inteiro maior que zero).');
    var letras = letrasDe(regras.numAlternativas);
    rasc.questoes.forEach(function (q) {
      var r = 'Q' + q.n + ': ';
      if (q.anulada) {
        if (!String(q.justificativa || '').trim()) p.push(r + 'questão anulada precisa de justificativa.');
        return;
      }
      if (!q.gabarito) { p.push(r + 'falta o gabarito oficial.'); return; }
      if (letras.indexOf(q.gabarito) < 0) p.push(r + 'gabarito fora das alternativas.');
      if (q.marcada && letras.indexOf(q.marcada) < 0) p.push(r + 'marcação fora das alternativas.');
      if (q.marcada && !q.confianca) p.push(r + 'falta a confiança (C, D ou CH).');
      if (ehErro(classificar(q)) && !causaPorId(q.causa)) p.push(r + 'erro sem causa.');
    });
    return p;
  }

  /* ---------------------------------------------------------------
   * Correção automática
   * ------------------------------------------------------------- */

  function corrigir(sim) {
    var R = sim.regras;
    var blocos = R.blocos.map(function (b, i) {
      return { indice: i, nome: b.nome, pontosPorQuestao: b.pontosPorQuestao, questoes: b.numQuestoes,
        validas: 0, anuladas: 0, acertos: 0, risco: 0, erros: 0, brancos: 0, pontos: 0, pontosPossiveis: 0 };
    });
    var porAssunto = {}, ordemAssuntos = [];
    var causas = {}; CAUSAS.forEach(function (c) { causas[c.id] = 0; });
    var pares = {}, ordemPares = [];
    var anuladas = [];

    sim.questoes.forEach(function (q) {
      var b = blocos[q.bloco];
      var c = classificar(q);
      if (c === 'ANULADA') { b.anuladas++; anuladas.push({ n: q.n, bloco: b.nome, justificativa: q.justificativa || '' }); return; }
      b.validas++;
      b.pontosPossiveis += b.pontosPorQuestao;
      var chave = assuntoDaQuestao(q, R);
      if (!porAssunto[chave]) { porAssunto[chave] = { assunto: chave, bloco: b.nome, total: 0, acertos: 0, risco: 0, pontos: 0 }; ordemAssuntos.push(chave); }
      var a = porAssunto[chave];
      a.total++;
      var acertou = ehAcerto(c);
      if (acertou) {
        b.acertos++; b.pontos += b.pontosPorQuestao;
        a.acertos++; a.pontos += b.pontosPorQuestao;
        if (c === 'RISCO') { b.risco++; a.risco++; }
      } else {
        if (c === 'BRANCO') b.brancos++; else b.erros++;
        if (causas[q.causa] != null) causas[q.causa]++;
      }
      if (q.par) {
        if (!pares[q.par]) { pares[q.par] = { par: q.par, total: 0, acertos: 0 }; ordemPares.push(q.par); }
        pares[q.par].total++;
        if (acertou) pares[q.par].acertos++;
      }
    });

    var total = { validas: 0, anuladas: 0, acertos: 0, risco: 0, erros: 0, brancos: 0, pontos: 0, pontosPossiveis: 0 };
    blocos.forEach(function (b) {
      b.pontos = arred(b.pontos); b.pontosPossiveis = arred(b.pontosPossiveis);
      ['validas', 'anuladas', 'acertos', 'risco', 'erros', 'brancos', 'pontos', 'pontosPossiveis'].forEach(function (k) { total[k] += b[k]; });
    });
    total.pontos = arred(total.pontos); total.pontosPossiveis = arred(total.pontosPossiveis);
    ordemAssuntos.forEach(function (k) { porAssunto[k].pontos = arred(porAssunto[k].pontos); });

    // Situação diante da eliminação
    var vermelho = [], amarelo = [];
    if (R.minimoPontos != null && total.pontos < R.minimoPontos) {
      vermelho.push('Total de ' + fmtNum(total.pontos) + ' pontos, abaixo do mínimo de ' + fmtNum(R.minimoPontos) + '.');
    }
    blocos.forEach(function (b) {
      if (b.validas > 0 && b.acertos === 0 && R.zeroElimina === true) vermelho.push('Zero em ' + b.nome + ' (0/' + b.validas + '): zero em disciplina elimina.');
    });
    blocos.forEach(function (b) {
      if (b.validas > 0 && b.acertos / b.validas < 0.2) amarelo.push(b.nome + ': ' + fmtPct(b.acertos, b.validas) + ' de acerto, abaixo de 20%.');
    });
    var regraIncompleta = [];
    if (R.minimoPontos == null) regraIncompleta.push('pontuação mínima');
    if (R.zeroElimina == null) regraIncompleta.push('se zero em disciplina elimina');

    var meta = null;
    if (R.meta != null) {
      var dist = arred(R.meta - total.pontos);
      meta = { meta: R.meta, distancia: dist, atingiu: dist <= 0 };
    }

    var totalErros = total.erros + total.brancos;
    return {
      blocos: blocos,
      total: total,
      eliminado: vermelho.length > 0,
      vermelho: vermelho,
      amarelo: amarelo,
      regraIncompleta: regraIncompleta,
      meta: meta,
      porAssunto: ordemAssuntos.map(function (k) { return porAssunto[k]; }),
      causas: CAUSAS.map(function (c) { return { id: c.id, nome: c.nome, contramedida: c.contramedida, n: causas[c.id] }; }),
      totalErros: totalErros,
      pares: ordemPares.map(function (k) { return pares[k]; }),
      anuladas: anuladas
    };
  }

  function textoMeta(m) {
    if (!m) return 'Meta não cadastrada.';
    if (m.distancia > 0) return 'Faltam ' + fmtNum(m.distancia) + ' pontos para a meta de ' + fmtNum(m.meta) + '.';
    if (m.distancia === 0) return 'Exatamente na meta de ' + fmtNum(m.meta) + ' pontos.';
    return fmtNum(-m.distancia) + ' pontos acima da meta de ' + fmtNum(m.meta) + '.';
  }

  /* ---------------------------------------------------------------
   * Erros do laboratório (simulados + sessões de estudo)
   * ------------------------------------------------------------- */

  function listarErros(lab) {
    var out = [];
    (lab.simulados || []).forEach(function (sim) {
      var R = sim.regras;
      sim.questoes.forEach(function (q) {
        var c = classificar(q);
        if (!ehErro(c)) return;
        out.push({
          id: sim.id + ':q' + q.n, origem: 'simulado', simuladoId: sim.id, n: q.n,
          data: sim.data, ordem: sim.criadoEm || '', concursoNome: R.nome, alvo: R.alvo || R.nome,
          bloco: R.blocos[q.bloco] ? R.blocos[q.bloco].nome : '—', linha: q.assunto || '',
          assunto: assuntoDaQuestao(q, R), marcou: q.marcada || '(em branco)', gabarito: q.gabarito,
          causa: q.causa, confianca: q.confianca
        });
      });
    });
    (lab.sessoes || []).forEach(function (s) {
      (s.itens || []).forEach(function (it, i) {
        (it.erros || []).forEach(function (e, j) {
          out.push({
            id: s.id + ':a' + i + 'e' + j, origem: 'sessao', sessaoId: s.id, n: null,
            data: s.data, ordem: s.criadoEm || '', concursoNome: s.concursoNome || '—', alvo: s.alvo || s.concursoNome || '—',
            bloco: it.bloco || it.assunto, linha: it.bloco && it.bloco !== it.assunto ? it.assunto : '',
            assunto: it.assunto, marcou: e.marcou || '—', gabarito: e.gabarito || '—',
            causa: e.causa, confianca: e.confianca
          });
        });
      });
    });
    return out;
  }

  /* ---------------------------------------------------------------
   * Revisão do Laboratório A — D0 / D2 / D7 / D21
   * ------------------------------------------------------------- */

  function configA(lab) { return (lab && lab.config) || CONFIG_PADRAO.A; }
  function configB(lab) { return (lab && lab.config) || CONFIG_PADRAO.B; }

  function montarCiclo(inicio, cfg) {
    return {
      inicio: inicio,
      etapas: ETAPAS_A.map(function (nome, i) { return { nome: nome, data: somarDias(inicio, cfg.intervalos[i]), registro: null }; })
    };
  }

  /** Aplica, em ordem, os registros de revisão de um erro e devolve o estado atual. */
  function estadoItemA(item, registros, cfg) {
    var ciclos = [montarCiclo(item.data, cfg)];
    var fechado = false, dataFechamento = null, naoContaram = [];
    registros.slice().sort(function (a, b) { return a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0; })
      .forEach(function (r) {
        if (fechado) { naoContaram.push(r); return; }
        var ciclo = ciclos[ciclos.length - 1];
        var idx = -1;
        for (var i = 0; i < ciclo.etapas.length; i++) if (!ciclo.etapas[i].registro) { idx = i; break; }
        if (idx < 0) { naoContaram.push(r); return; }
        // D2, D7 e D21 só contam acerto em questão nova.
        if (r.resultado === 'acertou' && idx > 0 && !r.questaoNova) { naoContaram.push(r); return; }
        var ultima = idx === ETAPAS_A.length - 1;
        // Acerto com chute (CH) no D21 não fecha o erro: o D21 continua pendente.
        if (r.resultado === 'acertou' && ultima && r.confianca === 'CH') { naoContaram.push(r); return; }
        ciclo.etapas[idx].registro = r;
        if (r.resultado === 'errou') {
          if (cfg.novoCicloAoErrar || ultima) ciclos.push(montarCiclo(r.data, cfg));
        } else if (ultima) {
          fechado = true; dataFechamento = r.data;
        }
      });
    var atual = ciclos[ciclos.length - 1];
    var proxima = null;
    if (!fechado) for (var k = 0; k < atual.etapas.length; k++) if (!atual.etapas[k].registro) { proxima = atual.etapas[k]; break; }
    return { item: item, ciclos: ciclos, cicloAtual: atual, numCiclo: ciclos.length, proxima: proxima,
      fechado: fechado, dataFechamento: dataFechamento, naoContaram: naoContaram };
  }

  function estadoRevisoesA(lab) {
    var cfg = configA(lab);
    var porItem = {};
    (lab.revisoes || []).forEach(function (r) { (porItem[r.itemId] = porItem[r.itemId] || []).push(r); });
    return listarErros(lab).map(function (it) { return estadoItemA(it, porItem[it.id] || [], cfg); })
      .sort(function (a, b) { return a.item.data < b.item.data ? -1 : a.item.data > b.item.data ? 1 : 0; });
  }

  function vencidasA(estados, dia) {
    return estados.filter(function (e) { return e.proxima && e.proxima.data <= dia; })
      .sort(function (a, b) { return a.proxima.data < b.proxima.data ? -1 : a.proxima.data > b.proxima.data ? 1 : 0; });
  }

  function proximasA(estados, dia) {
    var lim = somarDias(dia, 7);
    return estados.filter(function (e) { return e.proxima && e.proxima.data > dia && e.proxima.data <= lim; })
      .sort(function (a, b) { return a.proxima.data < b.proxima.data ? -1 : a.proxima.data > b.proxima.data ? 1 : 0; });
  }

  function limparCampo(s) { return String(s == null || s === '' ? '—' : s).replace(/\|/g, '/').replace(/[\r\n]+/g, ' ').trim(); }

  /** data | alvo | assunto | item do edital | o que marcou | gabarito | causa | contramedida | D2 | D7 | D21 | status */
  function linhaCaderno(est) {
    var it = est.item, c = est.cicloAtual;
    var causa = causaPorId(it.causa);
    function dataEtapa(nome) {
      for (var i = 0; i < c.etapas.length; i++) if (c.etapas[i].nome === nome) return fmtData(c.etapas[i].data);
      return '—';
    }
    var status = est.fechado
      ? 'fechado em ' + fmtData(est.dataFechamento)
      : 'aberto (ciclo ' + est.numCiclo + '; próxima: ' + est.proxima.nome + ' em ' + fmtData(est.proxima.data) + ')';
    return [fmtData(it.data), it.alvo, it.bloco, it.linha || '—', it.marcou, it.gabarito,
      causa ? causa.nome : '—', causa ? causa.contramedida : '—',
      dataEtapa('D2'), dataEtapa('D7'), dataEtapa('D21'), status].map(limparCampo).join(' | ');
  }

  var CABECALHO_CADERNO = 'data | alvo | assunto | item do edital | o que marcou | gabarito | causa | contramedida | D2 | D7 | D21 | status';

  /* ---------------------------------------------------------------
   * Revisão do Laboratório B — caixas
   * ------------------------------------------------------------- */

  /** Errou → caixa 1. Acertou com CH → fica. Acertou sem chute → sobe uma (até a última). */
  function moverCaixa(caixa, resultado, confianca, nCaixas) {
    if (resultado === 'errou') return 1;
    if (confianca === 'CH') return caixa;
    return Math.min(caixa + 1, nCaixas);
  }

  function eventosB(lab) {
    var ev = [];
    listarErros(lab).forEach(function (e) {
      ev.push({ linha: e.assunto, data: e.data, ordem: e.ordem, tipo: 'erro', origem: e.origem, causa: e.causa });
    });
    (lab.revisoes || []).forEach(function (r) {
      ev.push({ linha: r.linha, data: r.data, ordem: r.criadoEm, tipo: 'revisao', resultado: r.resultado, confianca: r.confianca, causa: r.causa, registro: r });
    });
    (lab.entradasCaixas || []).forEach(function (m) {
      ev.push({ linha: m.linha, data: m.data, ordem: m.criadoEm, tipo: 'entrada' });
    });
    ev.forEach(function (e, i) { e.seq = i; });
    ev.sort(function (a, b) {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      if (a.ordem !== b.ordem) return a.ordem < b.ordem ? -1 : 1;
      return a.seq - b.seq;
    });
    return ev;
  }

  function estadoCaixasB(lab) {
    var caixas = configB(lab).caixas;
    var n = caixas.length;
    var porLinha = {}, ordem = [];
    eventosB(lab).forEach(function (e) {
      var s = porLinha[e.linha];
      if (!s) {
        if (e.tipo === 'revisao') return; // revisão de linha que não está nas caixas não conta
        s = porLinha[e.linha] = { linha: e.linha, caixa: null, proxima: null, historico: [] };
        ordem.push(e.linha);
      }
      var antes = s.caixa;
      if (e.tipo === 'entrada') {
        if (s.caixa == null) s.caixa = 1;
        else { s.historico.push({ data: e.data, tipo: e.tipo, antes: antes, depois: s.caixa }); return; }
      } else if (e.tipo === 'erro') {
        s.caixa = 1;
      } else {
        s.caixa = moverCaixa(s.caixa, e.resultado, e.confianca, n);
      }
      s.proxima = somarDias(e.data, caixas[s.caixa - 1]);
      s.historico.push({ data: e.data, tipo: e.tipo, resultado: e.resultado, confianca: e.confianca, causa: e.causa, antes: antes, depois: s.caixa });
    });
    return ordem.map(function (k) { return porLinha[k]; })
      .sort(function (a, b) { return a.proxima < b.proxima ? -1 : a.proxima > b.proxima ? 1 : 0; });
  }

  function vencidasB(estados, dia) { return estados.filter(function (s) { return s.proxima <= dia; }); }
  function proximasB(estados, dia) {
    var lim = somarDias(dia, 7);
    return estados.filter(function (s) { return s.proxima > dia && s.proxima <= lim; });
  }

  /** Tudo o que aconteceu numa linha num dia (para o registro do 11_ESTADO_B). */
  function atividadeLinhaDia(lab, linha, dia) {
    var r = { questoes: 0, acertos: 0, causas: [], minutos: 0 };
    (lab.simulados || []).forEach(function (sim) {
      if (sim.data !== dia) return;
      sim.questoes.forEach(function (q) {
        var c = classificar(q);
        if (c === 'ANULADA' || assuntoDaQuestao(q, sim.regras) !== linha) return;
        r.questoes++;
        if (ehAcerto(c)) r.acertos++; else r.causas.push(q.causa);
      });
    });
    (lab.sessoes || []).forEach(function (s) {
      if (s.data !== dia) return;
      (s.itens || []).forEach(function (it) {
        if (it.assunto !== linha) return;
        r.questoes += it.questoes; r.acertos += it.acertos; r.minutos += it.minutos;
        (it.erros || []).forEach(function (e) { r.causas.push(e.causa); });
      });
    });
    (lab.revisoes || []).forEach(function (rv) {
      if (rv.data !== dia || rv.linha !== linha) return;
      r.questoes++;
      if (rv.resultado === 'acertou') r.acertos++; else r.causas.push(rv.causa);
    });
    return r;
  }

  /** Linhas com alguma atividade no dia (simulado, sessão ou revisão). */
  function linhasDoDia(lab, dia) {
    var vistas = {}, out = [];
    function add(l) { if (!vistas[l]) { vistas[l] = true; out.push(l); } }
    (lab.simulados || []).forEach(function (sim) {
      if (sim.data === dia) sim.questoes.forEach(function (q) { if (!q.anulada) add(assuntoDaQuestao(q, sim.regras)); });
    });
    (lab.sessoes || []).forEach(function (s) { if (s.data === dia) (s.itens || []).forEach(function (it) { add(it.assunto); }); });
    (lab.revisoes || []).forEach(function (rv) { if (rv.data === dia) add(rv.linha); });
    return out;
  }

  function registroEstadoB(lab, linha, dia, estadosCaixas) {
    var a = atividadeLinhaDia(lab, linha, dia);
    var est = null;
    (estadosCaixas || estadoCaixasB(lab)).forEach(function (s) { if (s.linha === linha) est = s; });
    var causas = a.causas.length ? a.causas.map(function (id) { var c = causaPorId(id); return c ? c.nome : '—'; }).join('; ') : 'nenhum erro';
    var caixa = est ? est.caixa + ' (próxima revisão ' + fmtData(est.proxima) + ')' : 'fora das caixas (nenhum erro registrado nesta linha)';
    return [fmtData(dia), linha, 'questões: ' + a.questoes, 'acertos: ' + fmtPct(a.acertos, a.questoes),
      'causa de cada erro: ' + causas, 'caixa atual: ' + caixa, 'minutos: ' + a.minutos].map(limparCampo).join(' | ');
  }

  /* ---------------------------------------------------------------
   * Placar A×B
   * ------------------------------------------------------------- */

  function primeiraSessao(lab) {
    var m = null;
    (lab.sessoes || []).forEach(function (s) { if (!m || s.data < m) m = s.data; });
    return m;
  }

  function menorData(labs) {
    var m = null;
    function v(d) { if (d && (!m || d < m)) m = d; }
    labs.forEach(function (lab) {
      (lab.simulados || []).forEach(function (s) { v(s.data); });
      (lab.sessoes || []).forEach(function (s) { v(s.data); });
      (lab.operacao || []).forEach(function (s) { v(s.data); });
      (lab.revisoes || []).forEach(function (s) { v(s.data); });
    });
    return m;
  }

  /** Período do placar: da primeira sessão de B (ou data definida em Configurações) até hoje. */
  function periodoPlacar(geral, labA, labB, dia) {
    var auto = primeiraSessao(labB);
    var cfg = geral && geral.primeiraSessaoB ? geral.primeiraSessaoB : null;
    var inicio = cfg || auto;
    var base = inicio || menorData([labA, labB]) || dia;
    return {
      inicio: inicio, fonteInicio: cfg ? 'configuração' : (auto ? 'primeira sessão de B registrada' : null),
      fim: dia, base: base,
      j1: inicio ? somarDias(inicio, 28) : null,
      j2: inicio ? somarDias(inicio, 56) : null,
      nSemanas: Math.max(1, Math.floor(diasEntre(base, dia) / 7) + 1)
    };
  }

  function dentro(d, per) { return (!per.inicio || d >= per.inicio) && d <= per.fim; }

  function semanaDe(d, per) { return Math.floor(diasEntre(per.base, d) / 7) + 1; }

  function faixaSemana(k, per) {
    var ini = somarDias(per.base, (k - 1) * 7);
    return { semana: k, ini: ini, fim: somarDias(ini, 6) };
  }

  /** Ponto por hora, por assunto: pontos no simulado ÷ horas de estudo no mesmo período. */
  function pontoPorHora(lab, per) {
    var pontos = {}, questoes = {}, minutos = {}, chaves = [];
    function k(a) { if (pontos[a] == null) { pontos[a] = 0; questoes[a] = 0; minutos[a] = 0; chaves.push(a); } }
    (lab.simulados || []).forEach(function (sim) {
      if (!dentro(sim.data, per)) return;
      sim.questoes.forEach(function (q) {
        var c = classificar(q);
        if (c === 'ANULADA') return;
        var a = assuntoDaQuestao(q, sim.regras); k(a);
        questoes[a]++;
        if (ehAcerto(c)) pontos[a] += sim.regras.blocos[q.bloco].pontosPorQuestao;
      });
    });
    (lab.sessoes || []).forEach(function (s) {
      if (!dentro(s.data, per)) return;
      (s.itens || []).forEach(function (it) { k(it.assunto); minutos[it.assunto] += it.minutos || 0; });
    });
    var somaP = 0, somaM = 0;
    var linhas = chaves.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).map(function (a) {
      var p = arred(pontos[a]), m = minutos[a];
      var l = { assunto: a, pontos: p, minutos: m, questoes: questoes[a], valor: null, motivo: '' };
      if (!m) l.motivo = 'sem minutos registrados';
      else if (!questoes[a]) l.motivo = 'sem questões deste assunto em simulado';
      else { l.valor = arred(p / (m / 60), 2); somaP += p; somaM += m; }
      return l;
    });
    return { linhas: linhas, pontos: arred(somaP), minutos: somaM, valor: somaM ? arred(somaP / (somaM / 60), 2) : null };
  }

  function textoPph(pontos, minutos, valor) {
    if (valor == null) return 'sem medição';
    return fmtNum(pontos) + ' pts ÷ ' + fmtNum(minutos / 60) + ' h (' + minutos + ' min) = ' + fmtNum(valor) + ' pts/h';
  }

  /**
   * Contatos com cada assunto: {assunto, data, total, acertos, risco, nova}
   * Para a retenção, acerto com confiança CH não é acerto (conta como erro no denominador).
   * risco = acertos RISCO sem CH (C ou D sem eliminação escrita); só o simulado registra eliminação escrita.
   */
  function contatos(lab) {
    var ev = [];
    (lab.simulados || []).forEach(function (sim) {
      sim.questoes.forEach(function (q) {
        var c = classificar(q);
        if (c === 'ANULADA') return;
        var e = { assunto: assuntoDaQuestao(q, sim.regras), data: sim.data, nova: true };
        ev.push(ehAcerto(c) ? eventoAcerto(e, q.confianca, !!q.eliminacao) : eventoErro(e));
      });
    });
    (lab.sessoes || []).forEach(function (s) {
      (s.itens || []).forEach(function (it) { ev.push(eventoSessao({ assunto: it.assunto, data: s.data, nova: true }, it)); });
    });
    var itens = {};
    if (lab.lab === 'A') listarErros(lab).forEach(function (e) { itens[e.id] = e; });
    (lab.revisoes || []).forEach(function (r) {
      var e;
      if (lab.lab === 'A') {
        var it = itens[r.itemId];
        if (!it) return;
        e = { assunto: it.assunto, data: r.data, nova: !!r.questaoNova };
      } else {
        e = { assunto: r.linha, data: r.data, nova: true };
      }
      ev.push(r.resultado === 'acertou' ? eventoAcerto(e, r.confianca, r.eliminacao) : eventoErro(e));
    });
    return ev;
  }

  /**
   * Regra única de acerto para a retenção, igual em simulado, revisão do A e revisão do B:
   *   CH → conta como erro · C/D com eliminação escrita → acerto · C/D sem eliminação escrita → acerto RISCO
   * Confiança ou eliminação ausentes (registro antigo) → "não informado": fica fora da conta.
   */
  function situacaoAcerto(confianca, eliminacao) {
    if (confianca === 'CH') return 'erro';
    if (confianca !== 'C' && confianca !== 'D') return null;
    if (eliminacao === true) return 'acerto';
    if (eliminacao === false) return 'risco';
    return null;
  }

  function eventoErro(e) { e.total = 1; e.acertos = 0; e.risco = 0; return e; }

  function eventoAcerto(e, confianca, eliminacao) {
    var sit = situacaoAcerto(confianca, eliminacao);
    e.total = 1;
    if (sit == null) { e.naoInformado = true; e.acertos = 0; e.risco = 0; return e; }
    e.acertos = sit === 'erro' ? 0 : 1;
    e.risco = sit === 'risco' ? 1 : 0;
    return e;
  }

  /** Sessão: acertos com CH viram erro; "acertos sem eliminação escrita" (sem contar os de CH) são RISCO. */
  function eventoSessao(e, it) {
    var q = it.questoes || 0, a = it.acertos || 0;
    e.total = q;
    if (a > 0 && (it.acertosCH == null || it.acertosSemElim == null)) { e.naoInformado = true; e.acertos = 0; e.risco = 0; return e; }
    e.acertos = a - (it.acertosCH || 0);
    e.risco = it.acertosSemElim || 0;
    return e;
  }

  /** Registros antigos sem confiança ou eliminação escrita: revisões acertadas e assuntos de sessão com acertos. */
  function registrosNaoInformados(lab) {
    var n = 0;
    contatos(lab).forEach(function (e) { if (e.naoInformado) n++; });
    return n;
  }

  /** Validação dos dois campos novos de cada assunto da sessão. */
  function pendenciasAcertosSessao(acertos, ch, semElim) {
    var p = [];
    if (!inteiroNaoNegativo(ch)) p.push('informe os acertos com chute (CH) (0 se nenhum).');
    else if (inteiroNaoNegativo(acertos) && ch > acertos) p.push('acertos com chute (CH) maiores que os acertos.');
    if (!inteiroNaoNegativo(semElim)) p.push('informe os acertos sem eliminação escrita (0 se nenhum).');
    else if (inteiroNaoNegativo(acertos) && semElim > acertos) p.push('acertos sem eliminação escrita maiores que os acertos.');
    if (!p.length && inteiroNaoNegativo(acertos) && ch + semElim > acertos) {
      p.push('acertos com chute + acertos sem eliminação escrita passam dos acertos (os de chute não entram em "sem eliminação escrita").');
    }
    return p;
  }

  /**
   * Retenção aos 21 dias: acerto em questão nova de um assunto 21+ dias depois do primeiro contato com ele.
   * Acerto com CH conta como erro; acerto RISCO sem CH conta como acerto e é contado à parte em "risco".
   */
  function retencao21(lab, per) {
    var ev = contatos(lab);
    var primeiro = {};
    ev.forEach(function (e) { if (!primeiro[e.assunto] || e.data < primeiro[e.assunto]) primeiro[e.assunto] = e.data; });
    var porAssunto = {}, chaves = [], ac = 0, tot = 0, risco = 0, foraDaConta = 0;
    ev.forEach(function (e) {
      if (!e.nova || !e.total || !dentro(e.data, per)) return;
      if (diasEntre(primeiro[e.assunto], e.data) < 21) return;
      if (e.naoInformado) { foraDaConta++; return; }
      if (!porAssunto[e.assunto]) { porAssunto[e.assunto] = { assunto: e.assunto, primeiro: primeiro[e.assunto], acertos: 0, total: 0, risco: 0 }; chaves.push(e.assunto); }
      porAssunto[e.assunto].acertos += e.acertos; porAssunto[e.assunto].total += e.total; porAssunto[e.assunto].risco += e.risco;
      ac += e.acertos; tot += e.total; risco += e.risco;
    });
    return { acertos: ac, total: tot, risco: risco, naoInformados: foraDaConta, linhas: chaves.sort().map(function (k) { return porAssunto[k]; }) };
  }

  function textoNaoInformado(n) {
    return n.naoInformados + ' registro(s) antigo(s) sem confiança ou eliminação escrita (' + n.retencao.naoInformados + ' ficaram fora da retenção do período)';
  }

  /** "x/y, dos quais z RISCO" */
  function textoRetencao(r) {
    if (!r.total) return fmtPct(r.acertos, r.total);
    return r.acertos + '/' + r.total + ', dos quais ' + (r.risco || 0) + ' RISCO';
  }

  /** Uma célula da tabela de ponto por hora: sempre com numerador e denominador. */
  function textoPphLinha(l) {
    if (!l) return 'sem medição (nada registrado neste método: 0 pts ÷ 0 min)';
    if (l.valor != null) return textoPph(l.pontos, l.minutos, l.valor);
    return 'sem medição (' + l.motivo + ': ' + fmtNum(l.pontos) + ' pts ÷ ' + l.minutos + ' min)';
  }

  /** Ponto por hora por assunto, A e B na mesma linha (assuntos casados pelo nome). */
  function pphLadoALado(pA, pB) {
    var mapa = {}, chaves = [];
    function add(lado, l) {
      if (!mapa[l.assunto]) { mapa[l.assunto] = { assunto: l.assunto, a: null, b: null }; chaves.push(l.assunto); }
      mapa[l.assunto][lado] = l;
    }
    pA.linhas.forEach(function (l) { add('a', l); });
    pB.linhas.forEach(function (l) { add('b', l); });
    return chaves.sort(function (x, y) { return x.localeCompare(y, 'pt-BR'); }).map(function (k) { return mapa[k]; });
  }

  /** Causas de erro com data: simulados, sessões e revisões. */
  function causasComData(lab) {
    var out = [];
    listarErros(lab).forEach(function (e) { out.push({ data: e.data, causa: e.causa }); });
    (lab.revisoes || []).forEach(function (r) { if (r.resultado === 'errou') out.push({ data: r.data, causa: r.causa }); });
    return out;
  }

  /** Migração da causa do erro: distribuição das cinco causas por semana. */
  function migracaoCausas(lab, per) {
    var sem = {};
    causasComData(lab).forEach(function (e) {
      if (!dentro(e.data, per) || !causaPorId(e.causa)) return;
      var k = semanaDe(e.data, per);
      if (!sem[k]) { sem[k] = faixaSemana(k, per); sem[k].cont = {}; CAUSAS.forEach(function (c) { sem[k].cont[c.id] = 0; }); sem[k].total = 0; }
      sem[k].cont[e.causa]++; sem[k].total++;
    });
    var semanas = Object.keys(sem).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
      var s = sem[k];
      s.leituraDistrator = s.cont.leu_errado + s.cont.distrator;
      s.naoSabia = s.cont.nao_sabia;
      s.base = s.leituraDistrator + s.naoSabia; // denominador da proporção
      return s;
    });
    var comBase = semanas.filter(function (s) { return s.base > 0; });
    var tendencia = 'sem_dados', primeira = null, ultima = null;
    if (comBase.length >= 2) {
      primeira = comBase[0]; ultima = comBase[comBase.length - 1];
      var x = ultima.leituraDistrator * primeira.base, y = primeira.leituraDistrator * ultima.base;
      tendencia = x < y ? 'diminuindo' : x > y ? 'aumentando' : 'estavel';
    } else if (comBase.length === 1) { primeira = ultima = comBase[0]; tendencia = 'uma_semana'; }
    return { semanas: semanas, primeira: primeira, ultima: ultima, tendencia: tendencia };
  }

  function textoMigracao(m) {
    if (!m.primeira) return 'sem medição (nenhum erro com essas causas no período)';
    var t = function (s) { return 'sem. ' + s.semana + ': ' + fmtPct(s.leituraDistrator, s.base); };
    if (m.tendencia === 'uma_semana') return t(m.primeira) + ' — só uma semana, sem tendência';
    var nome = { diminuindo: 'DIMINUINDO', aumentando: 'aumentando', estavel: 'estável' }[m.tendencia];
    return t(m.primeira) + ' → ' + t(m.ultima) + ' — ' + nome;
  }

  /** Discriminação entre vizinhos: acerto nas questões marcadas com par vizinho, por semana. */
  function vizinhosPorSemana(lab, per) {
    var sem = {}, ac = 0, tot = 0;
    (lab.simulados || []).forEach(function (sim) {
      if (!dentro(sim.data, per)) return;
      sim.questoes.forEach(function (q) {
        var c = classificar(q);
        if (!q.par || c === 'ANULADA') return;
        var k = semanaDe(sim.data, per);
        if (!sem[k]) { sem[k] = faixaSemana(k, per); sem[k].acertos = 0; sem[k].total = 0; }
        sem[k].total++; tot++;
        if (ehAcerto(c)) { sem[k].acertos++; ac++; }
      });
    });
    return { semanas: Object.keys(sem).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return sem[k]; }), acertos: ac, total: tot };
  }

  /** Custo de operação: minutos por semana operando o sistema. */
  function custoOperacao(lab, per) {
    var sem = {}, total = 0;
    (lab.operacao || []).forEach(function (o) {
      if (!dentro(o.data, per)) return;
      var k = semanaDe(o.data, per);
      if (!sem[k]) { sem[k] = faixaSemana(k, per); sem[k].minutos = 0; }
      sem[k].minutos += o.minutos; total += o.minutos;
    });
    return {
      semanas: Object.keys(sem).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return sem[k]; }),
      total: total, nSemanas: per.nSemanas, media: arred(total / per.nSemanas, 1)
    };
  }

  function numerosMetodo(lab, per) {
    return {
      pph: pontoPorHora(lab, per),
      retencao: retencao21(lab, per),
      naoInformados: registrosNaoInformados(lab),
      migracao: migracaoCausas(lab, per),
      vizinhos: vizinhosPorSemana(lab, per),
      custo: custoOperacao(lab, per)
    };
  }

  /** Compara dois valores; null = sem medição em algum lado. */
  function quemGanha(a, b) {
    if (a == null || b == null) return null;
    if (a > b) return 'A';
    if (b > a) return 'B';
    return 'igual';
  }

  function compararFracao(a1, t1, a2, t2) {
    if (!t1 || !t2) return null;
    var x = a1 * t2, y = a2 * t1;
    return x > y ? 'A' : y > x ? 'B' : 'igual';
  }

  /**
   * Critério de vitória: um método só vence se ganhar em ponto por hora E em retenção aos 21 dias.
   * Ganhar só em ponto por hora = "ganho de curto prazo, não é vitória". Caso contrário, EMPATE.
   * Recebe os números de cada lado: {pph: {valor}, retencao: {acertos, total}, custo: {media}}.
   */
  function veredito(nA, nB) {
    var pph = quemGanha(nA.pph.valor, nB.pph.valor);
    var ret = compararFracao(nA.retencao.acertos, nA.retencao.total, nB.retencao.acertos, nB.retencao.total);
    var custo = quemGanha(nB.custo.media, nA.custo.media); // quem gasta MENOS "ganha"
    var r = { pph: pph, retencao: ret, maisBarato: custo };
    if ((pph === 'A' || pph === 'B') && ret === pph) {
      r.tipo = 'vitoria'; r.metodo = pph;
      r.texto = 'Método ' + pph + ' vence: ganhou em ponto por hora E em retenção aos 21 dias.';
    } else if (pph === 'A' || pph === 'B') {
      r.tipo = 'curto_prazo'; r.metodo = pph;
      r.texto = 'Método ' + pph + ': ganho de curto prazo, não é vitória';
    } else {
      r.tipo = 'empate'; r.metodo = null;
      r.texto = 'EMPATE — fique com o mais barato de operar';
      r.textoCusto = custo === 'A' || custo === 'B'
        ? 'Mais barato de operar no período: Método ' + custo + ' (' + fmtNum(custo === 'A' ? nA.custo.media : nB.custo.media, 1) + ' min/semana contra ' + fmtNum(custo === 'A' ? nB.custo.media : nA.custo.media, 1) + ').'
        : 'Custo de operação igual nos dois métodos (' + fmtNum(nA.custo.media, 1) + ' min/semana).';
    }
    return r;
  }

  function faseJanela(per, dia) {
    if (!per.inicio) return { fase: 'sem_inicio' };
    if (dia < per.j1) return { fase: 'antes_j1', faltam: diasEntre(dia, per.j1) };
    if (dia < per.j2) return { fase: 'j1', faltam: diasEntre(dia, per.j2) };
    return { fase: 'j2' };
  }

  /** Janela 1: o teste está de pé? (B com minutos registrados e caixas funcionando) */
  function testeDePe(labB, per) {
    var minutos = 0, revisoes = 0;
    (labB.sessoes || []).forEach(function (s) { if (dentro(s.data, per)) (s.itens || []).forEach(function (it) { minutos += it.minutos || 0; }); });
    (labB.revisoes || []).forEach(function (r) { if (dentro(r.data, per)) revisoes++; });
    var itens = estadoCaixasB(labB).length;
    return { minutosB: minutos, itensCaixas: itens, revisoesCaixas: revisoes, ok: minutos > 0 && itens > 0 && revisoes > 0 };
  }

  /* ---------------------------------------------------------------
   * Exportações em texto (.md e .csv)
   * ------------------------------------------------------------- */

  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'concurso';
  }

  function nomeArquivoSimulado(sim, lab) {
    return sim.data + '_' + slug(sim.regras.nome) + '_Lab' + lab + '_simulado.md';
  }

  function celula(s) { return String(s == null || s === '' ? '—' : s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' '); }
  function tabelaMd(cab, linhas) {
    var t = '| ' + cab.map(celula).join(' | ') + ' |\n|' + cab.map(function () { return '---'; }).join('|') + '|\n';
    linhas.forEach(function (l) { t += '| ' + l.map(celula).join(' | ') + ' |\n'; });
    return t;
  }

  var NOME_SITUACAO = { ACERTO: 'acerto', RISCO: 'acerto RISCO', ERRO: 'erro', BRANCO: 'em branco', ANULADA: 'anulada', PENDENTE: 'sem gabarito' };

  function textoSituacao(cor) {
    if (cor.eliminado) return 'ELIMINADO pelas regras cadastradas: ' + cor.vermelho.join(' ');
    var t = 'Não eliminado pelas regras cadastradas.';
    if (cor.regraIncompleta.length) t += ' (Regra incompleta no cadastro: ' + cor.regraIncompleta.join(', ') + ' — confira o edital.)';
    return t;
  }

  /** Linhas para o Drive geradas por um simulado. */
  function linhasDriveSimulado(lab, sim) {
    if (lab.lab === 'A') {
      return estadoRevisoesA(lab).filter(function (e) { return e.item.simuladoId === sim.id; }).map(linhaCaderno);
    }
    var est = estadoCaixasB(lab), vistas = {}, out = [];
    sim.questoes.forEach(function (q) {
      if (q.anulada) return;
      var l = assuntoDaQuestao(q, sim.regras);
      if (!vistas[l]) { vistas[l] = true; out.push(registroEstadoB(lab, l, sim.data, est)); }
    });
    return out;
  }

  function mdSimulado(lab, sim) {
    var cor = corrigir(sim), R = sim.regras, t = cor.total;
    var md = '# Relatório do simulado — ' + R.nome + ' — Laboratório ' + lab.lab + '\n\n';
    md += '- Data do simulado: ' + fmtData(sim.data) + '\n';
    md += '- Banca: ' + (R.banca || '—') + '\n';
    md += '- Minutos gastos na prova: ' + sim.minutos + '\n';
    md += '- Relatório gerado em: ' + fmtData(hoje()) + '\n';
    md += '- Fonte oficial: Google Drive (' + (lab.lab === 'A' ? 'CADERNO_DE_ERROS' : '11_ESTADO_B') + '). Este arquivo é só o cálculo.\n\n';
    md += '## Resultado\n\n';
    md += '- Acertos: ' + fmtPct(t.acertos, t.validas) + ' (anuladas fora do cálculo: ' + t.anuladas + ')\n';
    md += '- Pontos: ' + fmtNum(t.pontos) + ' de ' + fmtNum(t.pontosPossiveis) + ' possíveis (' + fmtPct(t.pontos, t.pontosPossiveis) + ')\n';
    md += '- Acertos RISCO (contam ponto, não contam domínio): ' + fmtPct(t.risco, t.acertos) + '\n';
    md += '- Situação: ' + textoSituacao(cor) + '\n';
    if (cor.amarelo.length) md += '- Alerta amarelo: ' + cor.amarelo.join(' ') + '\n';
    md += '- Meta: ' + textoMeta(cor.meta) + '\n\n';
    md += '## Por bloco\n\n' + tabelaMd(['Bloco', 'Acertos', 'RISCO', 'Pontos', 'Anuladas'], cor.blocos.map(function (b) {
      return [b.nome, fmtPct(b.acertos, b.validas), b.risco + ' de ' + b.acertos + ' acertos', fmtNum(b.pontos) + ' de ' + fmtNum(b.pontosPossiveis), b.anuladas];
    })) + '\n';
    md += '## Por assunto/linha do edital\n\n' + tabelaMd(['Assunto/linha', 'Bloco', 'Acertos', 'Acertos RISCO'], cor.porAssunto.map(function (a) {
      return [a.assunto, a.bloco, fmtPct(a.acertos, a.total), a.risco + ' de ' + a.acertos];
    })) + '\n';
    md += '## Causas dos erros\n\n' + tabelaMd(['Causa', 'Erros', 'Contramedida'], cor.causas.map(function (c) {
      return [c.nome, fmtPct(c.n, cor.totalErros), c.contramedida];
    })) + '\n';
    md += '## Pares vizinhos\n\n' + (cor.pares.length ? tabelaMd(['Par', 'Acertos'], cor.pares.map(function (p) { return [p.par, fmtPct(p.acertos, p.total)]; })) : 'Nenhuma questão marcada com par vizinho.\n') + '\n';
    if (cor.anuladas.length) md += '## Anuladas (fora do cálculo)\n\n' + tabelaMd(['Questão', 'Bloco', 'Justificativa'], cor.anuladas.map(function (a) { return ['Q' + a.n, a.bloco, a.justificativa]; })) + '\n';
    md += '## Questões\n\n' + tabelaMd(['Q', 'Bloco', 'Assunto/linha', 'Gabarito', 'Marcou', 'Situação', 'Confiança', 'Eliminação escrita', 'Par vizinho', 'Causa'], sim.questoes.map(function (q) {
      var c = causaPorId(q.causa);
      return ['Q' + q.n, R.blocos[q.bloco].nome, q.assunto || '(bloco)', q.anulada ? 'anulada' : q.gabarito, q.marcada || 'em branco',
        NOME_SITUACAO[classificar(q)], q.confianca || '—', q.anulada || !q.marcada ? '—' : (q.eliminacao ? 'sim' : 'não'), q.par || '—', ehErro(classificar(q)) && c ? c.nome : '—'];
    })) + '\n';
    var linhas = linhasDriveSimulado(lab, sim);
    if (lab.lab === 'A') {
      md += '## Linhas para o CADERNO_DE_ERROS\n\n```\n' + CABECALHO_CADERNO + '\n' + (linhas.length ? linhas.join('\n') : '(nenhum erro)') + '\n```\n';
    } else {
      md += '## Registros para o 11_ESTADO_B\n\n```\n' + (linhas.length ? linhas.join('\n') : '(nenhuma linha)') + '\n```\n';
    }
    return md;
  }

  function mdNumerosMetodo(n) {
    var md = '';
    md += '- Ponto por hora (métrica principal): ' + textoPph(n.pph.pontos, n.pph.minutos, n.pph.valor) + '\n';
    md += '- Retenção aos 21 dias (acerto com CH conta como erro): ' + textoRetencao(n.retencao) + '\n';
    md += '  - Não informado: ' + textoNaoInformado(n) + '\n';
    md += '- Migração da causa do erro (leitura + distrator em proporção a "não sabia o conteúdo"): ' + textoMigracao(n.migracao) + '\n';
    md += '- Discriminação entre vizinhos: ' + fmtPct(n.vizinhos.acertos, n.vizinhos.total) + '\n';
    md += '- Custo de operação: ' + n.custo.total + ' min ÷ ' + n.custo.nSemanas + ' semana(s) = ' + fmtNum(n.custo.media, 1) + ' min/semana\n';
    return md;
  }

  function mdDetalhesMetodo(n) {
    var md = '### Ponto por hora, por assunto\n\n';
    md += n.pph.linhas.length ? tabelaMd(['Assunto', 'Pontos no simulado', 'Minutos de estudo', 'Ponto por hora'], n.pph.linhas.map(function (l) {
      return [l.assunto, fmtNum(l.pontos), l.minutos, l.valor == null ? 'sem medição (' + l.motivo + ')' : fmtNum(l.valor) + ' pts/h'];
    })) : 'Nada registrado no período.\n';
    md += '\n### Retenção aos 21 dias, por assunto\n\n';
    md += n.retencao.linhas.length ? tabelaMd(['Assunto', 'Primeiro contato', 'Acertos em questão nova (21+ dias)'], n.retencao.linhas.map(function (l) {
      return [l.assunto, fmtData(l.primeiro), textoRetencao(l)];
    })) : 'Nenhuma questão nova feita 21 dias ou mais depois do primeiro contato.\n';
    md += '\n### Causas do erro por semana\n\n';
    md += n.migracao.semanas.length ? tabelaMd(['Semana'].concat(CAUSAS.map(function (c) { return c.nome; })).concat(['leitura + distrator em proporção a não sabia']), n.migracao.semanas.map(function (s) {
      return ['sem. ' + s.semana + ' (' + fmtData(s.ini) + ' a ' + fmtData(s.fim) + ')'].concat(CAUSAS.map(function (c) { return fmtPct(s.cont[c.id], s.total); })).concat([fmtPct(s.leituraDistrator, s.base)]);
    })) : 'Nenhum erro no período.\n';
    md += '\n### Discriminação entre vizinhos por semana\n\n';
    md += n.vizinhos.semanas.length ? tabelaMd(['Semana', 'Acertos'], n.vizinhos.semanas.map(function (s) {
      return ['sem. ' + s.semana + ' (' + fmtData(s.ini) + ' a ' + fmtData(s.fim) + ')', fmtPct(s.acertos, s.total)];
    })) : 'Nenhuma questão marcada com par vizinho no período.\n';
    md += '\n### Minutos operando o sistema por semana\n\n';
    md += n.custo.semanas.length ? tabelaMd(['Semana', 'Minutos'], n.custo.semanas.map(function (s) {
      return ['sem. ' + s.semana + ' (' + fmtData(s.ini) + ' a ' + fmtData(s.fim) + ')', s.minutos];
    })) : 'Nenhum minuto de operação registrado no período.\n';
    return md;
  }

  function textoPeriodo(per) {
    return (per.inicio ? fmtData(per.inicio) : 'todo o histórico') + ' a ' + fmtData(per.fim) + ' (' + per.nSemanas + ' semana(s))';
  }

  function mdPlacar(labA, labB, geral, dia) {
    var per = periodoPlacar(geral, labA, labB, dia);
    var nA = numerosMetodo(labA, per), nB = numerosMetodo(labB, per);
    var j = faseJanela(per, dia);
    var md = '# Placar A×B — medido em ' + fmtData(dia) + '\n\n';
    md += '> ' + RESSALVA_PLACAR + '\n\n';
    md += '- Período medido: ' + textoPeriodo(per) + '\n';
    md += '- Início do teste: ' + (per.inicio ? fmtData(per.inicio) + ' (' + per.fonteInicio + ')' : 'não definido (nenhuma sessão de B)') + '\n';
    if (per.inicio) md += '- Janela 1: ' + fmtData(per.j1) + ' · Janela 2: ' + fmtData(per.j2) + '\n';
    md += '\n## Janela\n\n';
    if (j.fase === 'sem_inicio') md += 'O teste ainda não começou: registre a primeira sessão de estudo no Laboratório B ou defina a data em Configurações do Laboratório B.\n';
    else if (j.fase === 'antes_j1') md += 'Antes da janela 1 (faltam ' + j.faltam + ' dias).\n';
    else if (j.fase === 'j1') {
      var tp = testeDePe(labB, per);
      md += 'Janela 1 — o teste está de pé? ' + (tp.ok ? 'SIM' : 'NÃO') + ' (B: ' + tp.minutosB + ' minutos de estudo registrados; ' + tp.itensCaixas + ' linha(s) nas caixas; ' + tp.revisoesCaixas + ' revisão(ões) de caixa registradas). Sem vencedor nesta janela.\n';
    } else md += 'Janela 2 alcançada: os cinco números de cada método estão abaixo.\n';
    md += '\n## Veredito\n\n';
    if (j.fase !== 'j2') md += 'Bloqueado: ' + FRASE_BLOQUEIO + '.\n';
    else {
      var v = veredito(nA, nB);
      md += '**' + v.texto + '**\n' + (v.textoCusto ? '\n' + v.textoCusto + '\n' : '');
    }
    var lado = pphLadoALado(nA.pph, nB.pph);
    md += '\n## Ponto por hora por assunto — A e B lado a lado\n\n';
    md += lado.length ? tabelaMd(['Assunto', 'Método A', 'Método B'], lado.map(function (r) { return [r.assunto, textoPphLinha(r.a), textoPphLinha(r.b)]; })
      .concat([['Total dos assuntos medidos (usado no veredito)', textoPph(nA.pph.pontos, nA.pph.minutos, nA.pph.valor), textoPph(nB.pph.pontos, nB.pph.minutos, nB.pph.valor)]])) : 'Nada registrado no período.\n';
    md += '\n## Método A — cinco números\n\n' + mdNumerosMetodo(nA);
    md += '\n## Método B — cinco números\n\n' + mdNumerosMetodo(nB);
    md += '\n## Detalhes — Método A\n\n' + mdDetalhesMetodo(nA);
    md += '\n## Detalhes — Método B\n\n' + mdDetalhesMetodo(nB);
    return md;
  }

  function mdEstadoLab(lab, per, dia) {
    var md = '# Estado do Laboratório ' + lab.lab + ' — ' + fmtData(dia) + '\n\n';
    md += 'Fonte oficial: Google Drive (' + (lab.lab === 'A' ? 'CADERNO_DE_ERROS' : '11_ESTADO_B') + '). Este arquivo é só o registro da ferramenta.\n\n';
    if (lab.lab === 'A') {
      var est = estadoRevisoesA(lab);
      var venc = vencidasA(est, dia), prox = proximasA(est, dia);
      md += '## Revisões D0/D2/D7/D21\n\n';
      md += '- Erros registrados: ' + est.length + ' (abertos: ' + est.filter(function (e) { return !e.fechado; }).length + '; fechados: ' + est.filter(function (e) { return e.fechado; }).length + ')\n';
      md += '- Vencidas hoje: ' + venc.length + '\n- Próximos 7 dias: ' + prox.length + '\n\n';
      md += '```\n' + CABECALHO_CADERNO + '\n' + (est.length ? est.map(linhaCaderno).join('\n') : '(nenhum erro)') + '\n```\n\n';
    } else {
      var cx = estadoCaixasB(lab);
      md += '## Caixas (' + configB(lab).caixas.join(', ') + ' dias)\n\n';
      md += cx.length ? tabelaMd(['Linha', 'Caixa atual', 'Próxima revisão', 'Situação'], cx.map(function (s) {
        return [s.linha, s.caixa, fmtData(s.proxima), s.proxima <= dia ? 'vencida' : 'em dia'];
      })) : 'Nenhuma linha nas caixas.\n';
      md += '\n';
    }
    md += '## Placar deste laboratório (período ' + textoPeriodo(per) + ')\n\n' + mdNumerosMetodo(numerosMetodo(lab, per)) + '\n';
    md += '## Sessões de estudo\n\n';
    var sess = (lab.sessoes || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    md += sess.length ? tabelaMd(['Data', 'Concurso', 'Assunto', 'Minutos', 'Questões', 'Acertos', 'Causas dos erros'], [].concat.apply([], sess.map(function (s) {
      return s.itens.map(function (it) {
        return [fmtData(s.data), s.concursoNome || '—', it.assunto, it.minutos, it.questoes, fmtPct(it.acertos, it.questoes),
          it.erros.length ? it.erros.map(function (e) { var c = causaPorId(e.causa); return (c ? c.nome : '—') + ' (' + (e.confianca || '—') + ')'; }).join('; ') : '—'];
      });
    }))) : 'Nenhuma sessão registrada.\n';
    md += '\n## Minutos operando o sistema, por dia\n\n';
    var dias = {};
    (lab.operacao || []).forEach(function (o) { dias[o.data] = (dias[o.data] || 0) + o.minutos; });
    var ks = Object.keys(dias).sort().reverse();
    md += ks.length ? tabelaMd(['Data', 'Minutos'], ks.map(function (d) { return [fmtData(d), dias[d]]; })) : 'Nenhum registro.\n';
    md += '\n## Simulados\n\n';
    var sims = (lab.simulados || []).slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    md += sims.length ? tabelaMd(['Data', 'Concurso', 'Acertos', 'Pontos', 'Situação'], sims.map(function (s) {
      var c = corrigir(s);
      return [fmtData(s.data), s.regras.nome, fmtPct(c.total.acertos, c.total.validas), fmtNum(c.total.pontos) + ' de ' + fmtNum(c.total.pontosPossiveis), c.eliminado ? 'eliminado' : 'não eliminado'];
    })) : 'Nenhum simulado.\n';
    return md;
  }

  function csvCampo(v) {
    var s = String(v == null ? '' : v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** Uma linha por questão respondida (separador ; e vírgula decimal, para abrir direto no Excel/Planilhas). */
  function csvLab(lab) {
    var cab = ['laboratorio', 'concurso', 'data', 'simulado', 'questao', 'bloco', 'assunto_linha', 'gabarito', 'marcou', 'situacao', 'risco', 'confianca', 'eliminacao_escrita', 'par_vizinho', 'causa', 'contramedida', 'pontos', 'justificativa_anulacao'];
    var linhas = [cab.join(';')];
    (lab.simulados || []).slice().sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; }).forEach(function (sim) {
      var R = sim.regras;
      sim.questoes.forEach(function (q) {
        var c = classificar(q), causa = ehErro(c) ? causaPorId(q.causa) : null;
        linhas.push([lab.lab, R.nome, sim.data, sim.id, q.n, R.blocos[q.bloco].nome, assuntoDaQuestao(q, R), q.anulada ? '' : q.gabarito, q.marcada,
          NOME_SITUACAO[c], c === 'RISCO' ? 'sim' : 'não', q.confianca, q.anulada || !q.marcada ? '' : (q.eliminacao ? 'sim' : 'não'), q.par,
          causa ? causa.nome : '', causa ? causa.contramedida : '', ehAcerto(c) ? fmtNum(R.blocos[q.bloco].pontosPorQuestao) : '0', q.anulada ? q.justificativa : ''].map(csvCampo).join(';'));
      });
    });
    return linhas.join('\r\n') + '\r\n';
  }

  global.Nucleo = {
    CAUSAS: CAUSAS, CONFIANCAS: CONFIANCAS, ETAPAS_A: ETAPAS_A, CONFIG_PADRAO: CONFIG_PADRAO,
    RESSALVA_PLACAR: RESSALVA_PLACAR, FRASE_BLOQUEIO: FRASE_BLOQUEIO, AVISO_SEM_BLOCOS: AVISO_SEM_BLOCOS,
    CABECALHO_CADERNO: CABECALHO_CADERNO, NOME_SITUACAO: NOME_SITUACAO,
    causaPorId: causaPorId,
    hoje: hoje, fixarHoje: fixarHoje, somarDias: somarDias, diasEntre: diasEntre, dataValida: dataValida, fmtData: fmtData,
    arred: arred, fmtNum: fmtNum, fmtPct: fmtPct, pctValor: pctValor, lerNumero: lerNumero,
    inteiroPositivo: inteiroPositivo, inteiroNaoNegativo: inteiroNaoNegativo,
    letrasDe: letrasDe, totalQuestoes: totalQuestoes, totalPontos: totalPontos, bloqueiosLancamento: bloqueiosLancamento,
    mapaBlocos: mapaBlocos, regrasDoConcurso: regrasDoConcurso, questoesEmBranco: questoesEmBranco, lerSequencia: lerSequencia,
    classificar: classificar, ehAcerto: ehAcerto, ehErro: ehErro, assuntoDaQuestao: assuntoDaQuestao,
    pendenciasSimulado: pendenciasSimulado, corrigir: corrigir, textoMeta: textoMeta, textoSituacao: textoSituacao,
    listarErros: listarErros, montarCiclo: montarCiclo, estadoItemA: estadoItemA, estadoRevisoesA: estadoRevisoesA,
    vencidasA: vencidasA, proximasA: proximasA, linhaCaderno: linhaCaderno,
    moverCaixa: moverCaixa, estadoCaixasB: estadoCaixasB, vencidasB: vencidasB, proximasB: proximasB,
    atividadeLinhaDia: atividadeLinhaDia, linhasDoDia: linhasDoDia, registroEstadoB: registroEstadoB,
    primeiraSessao: primeiraSessao, periodoPlacar: periodoPlacar, faseJanela: faseJanela, testeDePe: testeDePe,
    pontoPorHora: pontoPorHora, textoPph: textoPph, textoPphLinha: textoPphLinha, pphLadoALado: pphLadoALado, retencao21: retencao21, textoRetencao: textoRetencao, situacaoAcerto: situacaoAcerto, registrosNaoInformados: registrosNaoInformados, textoNaoInformado: textoNaoInformado, pendenciasAcertosSessao: pendenciasAcertosSessao, migracaoCausas: migracaoCausas, textoMigracao: textoMigracao,
    vizinhosPorSemana: vizinhosPorSemana, custoOperacao: custoOperacao, numerosMetodo: numerosMetodo, veredito: veredito,
    textoPeriodo: textoPeriodo, slug: slug, nomeArquivoSimulado: nomeArquivoSimulado, linhasDriveSimulado: linhasDriveSimulado,
    mdSimulado: mdSimulado, mdPlacar: mdPlacar, mdEstadoLab: mdEstadoLab, csvLab: csvLab
  };
})(typeof window !== 'undefined' ? window : globalThis);
