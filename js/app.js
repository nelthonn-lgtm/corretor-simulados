/*
 * Corretor de Simulados A×B — interface.
 * Cada tela de laboratório recebe só o laboratório dela (Dados.lab(L)).
 * A única tela que lê os dois lados é o Placar A×B.
 */
(function (global) {
  'use strict';

  var N = global.Nucleo, D = global.Dados;

  var LABS = {
    A: { nome: 'Laboratório A', metodo: 'Método A', alvos: 'SEDUC/CE e Cruzeta/RN', drive: 'CADERNO_DE_ERROS' },
    B: { nome: 'Laboratório B', metodo: 'Método B', alvos: 'Jucurutu/RN', drive: '11_ESTADO_B' }
  };

  var FRASE_DRIVE = 'A fonte oficial é o seu Google Drive (CADERNO_DE_ERROS no Método A e 11_ESTADO_B no Método B): esta ferramenta só calcula e registra, e toda correção termina em texto pronto para colar lá.';

  // Estado passageiro da tela (separado por laboratório)
  var T = { aviso: null, concEdit: { A: null, B: null }, planoEdital: { A: null, B: null }, filtroA: 'abertos', diaDrive: { A: null, B: null }, pendencias: null };

  /* ---------------------------------------------------------------
   * Utilidades
   * ------------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function opcoes(lista, atual, vazio) {
    var h = vazio != null ? '<option value="">' + esc(vazio) + '</option>' : '';
    lista.forEach(function (o) {
      var v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o;
      h += '<option value="' + esc(v) + '"' + (String(v) === String(atual == null ? '' : atual) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return h;
  }

  function opcoesCausa(atual) { return opcoes(N.CAUSAS.map(function (c) { return { v: c.id, t: c.nome }; }), atual, '— escolha a causa —'); }
  function opcoesConfianca(atual, vazio) { return opcoes(N.CONFIANCAS.map(function (c) { return { v: c.id, t: c.nome }; }), atual, vazio == null ? '—' : vazio); }

  function alerta(tipo, html) { return '<div class="alerta ' + tipo + '">' + html + '</div>'; }

  function avisar(tipo, texto) { T.aviso = { tipo: tipo, texto: texto }; }

  function blocoTexto(id, texto, rotuloBotao) {
    var linhas = Math.min(14, Math.max(3, String(texto).split('\n').length + 1));
    return '<textarea class="saida" id="' + esc(id) + '" readonly rows="' + linhas + '">' + esc(texto) + '</textarea>' +
      '<button type="button" data-acao="copiar" data-alvo="' + esc(id) + '">' + esc(rotuloBotao || 'Copiar') + '</button>';
  }

  function tabela(cab, linhas, classe) {
    var h = '<div class="tabela-rolagem"><table class="' + (classe || '') + '"><thead><tr>';
    cab.forEach(function (c) { h += '<th>' + c + '</th>'; });
    h += '</tr></thead><tbody>';
    linhas.forEach(function (l) { h += '<tr>' + l.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  }

  function baixar(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  function copiar(texto, botao) {
    function ok() { if (botao) { var t = botao.textContent; botao.textContent = 'Copiado!'; setTimeout(function () { botao.textContent = t; }, 1500); } }
    function reserva() {
      var ta = document.createElement('textarea');
      ta.value = texto; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { alert('Não consegui copiar: selecione o texto e copie manualmente.'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, reserva);
    else reserva();
  }

  function numOuNull(txt) { var n = N.lerNumero(txt); return n; }

  function assuntosDoLab(lab) {
    var vistos = {}, out = [];
    lab.concursos.forEach(function (c) {
      (c.blocos || []).forEach(function (b) {
        [b.nome].concat(b.assuntos || []).forEach(function (a) { if (a && !vistos[a]) { vistos[a] = true; out.push(a); } });
      });
    });
    return out;
  }

  function concursoPorId(lab, id) {
    for (var i = 0; i < lab.concursos.length; i++) if (lab.concursos[i].id === id) return lab.concursos[i];
    return null;
  }

  function somaMinutos(lista, desde) {
    var t = 0;
    lista.forEach(function (x) { if (!desde || x.data >= desde) t += x.minutos; });
    return t;
  }

  function minutosSessoes(lab, desde) {
    var t = 0;
    lab.sessoes.forEach(function (s) { if (!desde || s.data >= desde) s.itens.forEach(function (it) { t += it.minutos; }); });
    return t;
  }

  /* ---------------------------------------------------------------
   * Rotas
   * ------------------------------------------------------------- */

  function rota(hash) {
    var p = String(hash || '').replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    return { area: p[0] || '', sub: p[1] || '', param: p[2] || '' };
  }

  function htmlDaTela(hash) {
    var r = rota(hash);
    if (r.area === 'A' || r.area === 'B') return telaLab(r.area, r.sub, r.param);
    if (r.area === 'placar') return telaPlacar();
    if (r.area === 'backup') return telaBackup();
    return telaInicio();
  }

  /* ---------------------------------------------------------------
   * Tela inicial
   * ------------------------------------------------------------- */

  function telaInicio() {
    var h = '<h1>Corretor de Simulados A×B</h1>';
    h += '<p class="destaque-drive">' + esc(FRASE_DRIVE) + '</p>';
    h += '<p>A ferramenta <strong>calcula e registra</strong>. Ela não ensina, não gera questões e não substitui os mentores. Não guarda enunciados: só gabaritos, marcações e classificações que você digita.</p>';
    h += '<div class="grade2">';
    h += '<a class="cartao-link lab-a" href="#/A"><strong>Laboratório A</strong><span>Método A · SEDUC/CE e Cruzeta/RN</span><span>Revisão D0/D2/D7/D21 → CADERNO_DE_ERROS</span></a>';
    h += '<a class="cartao-link lab-b" href="#/B"><strong>Laboratório B</strong><span>Método B · Jucurutu/RN</span><span>Revisão por caixas → 11_ESTADO_B</span></a>';
    h += '<a class="cartao-link placar" href="#/placar"><strong>Placar A×B</strong><span>Compara os dois laboratórios, com denominador e data</span></a>';
    h += '<a class="cartao-link neutro" href="#/backup"><strong>Backup</strong><span>Exportar e importar todos os dados (.json)</span></a>';
    h += '</div>';
    h += '<p class="suave">Os dados ficam só neste navegador. Limpar os dados do navegador apaga tudo o que não foi exportado — faça backup.</p>';
    return h;
  }

  /* ---------------------------------------------------------------
   * Moldura do laboratório
   * ------------------------------------------------------------- */

  var ABAS = [
    ['', 'Painel'], ['lancar', 'Lançar simulado'], ['simulados', 'Simulados'], ['sessoes', 'Sessões de estudo'],
    ['operacao', 'Minutos operando'], ['revisoes', null], ['drive', 'Drive e exportar'], ['concursos', 'Concursos e pares'], ['config', 'Configurações']
  ];

  function telaLab(L, sub, param) {
    var lab = D.lab(L), info = LABS[L];
    var h = '<section class="lab lab-' + L.toLowerCase() + '" data-lab="' + L + '">';
    h += '<div class="faixa-lab"><strong>' + info.nome + '</strong> · ' + info.metodo + ' · ' + esc(info.alvos) + '<span class="faixa-drive">Drive: ' + info.drive + '</span></div>';
    h += '<nav class="abas" aria-label="Seções do ' + info.nome + '">';
    ABAS.forEach(function (a) {
      var nome = a[1] || (L === 'A' ? 'Revisões D0–D21' : 'Caixas');
      var ativo = sub === a[0] || (sub === 'simulado' && a[0] === 'simulados');
      h += '<a href="#/' + L + (a[0] ? '/' + a[0] : '') + '"' + (ativo ? ' class="ativo" aria-current="page"' : '') + '>' + nome + '</a>';
    });
    h += '</nav><div class="conteudo">';
    var f = {
      '': telaPainel, lancar: telaLancar, simulados: telaSimulados, simulado: telaSimulado, sessoes: telaSessoes,
      operacao: telaOperacao, revisoes: L === 'A' ? telaRevisoesA : telaCaixasB, drive: telaDrive, concursos: telaConcursos, config: telaConfig
    }[sub] || telaPainel;
    h += f(L, lab, param);
    return h + '</div></section>';
  }

  /* ---------------------------------------------------------------
   * Painel
   * ------------------------------------------------------------- */

  function telaPainel(L, lab) {
    var dia = N.hoje(), semana = N.somarDias(dia, -6);
    var venc, prox;
    if (L === 'A') { var ea = N.estadoRevisoesA(lab); venc = N.vencidasA(ea, dia).length; prox = N.proximasA(ea, dia).length; }
    else { var eb = N.estadoCaixasB(lab); venc = N.vencidasB(eb, dia).length; prox = N.proximasB(eb, dia).length; }
    var h = '<h2>Painel — ' + LABS[L].nome + '</h2>';
    h += '<div class="grade-num">';
    h += '<a class="numero-grande' + (venc ? ' urgente' : '') + '" href="#/' + L + '/revisoes"><span>' + venc + '</span>' + (L === 'A' ? 'revisões vencidas hoje' : 'linhas vencidas nas caixas') + '</a>';
    h += '<a class="numero-grande" href="#/' + L + '/revisoes"><span>' + prox + '</span>nos próximos 7 dias</a>';
    h += '<a class="numero-grande" href="#/' + L + '/sessoes"><span>' + minutosSessoes(lab, semana) + '</span>minutos de estudo nos últimos 7 dias</a>';
    h += '<a class="numero-grande" href="#/' + L + '/operacao"><span>' + somaMinutos(lab.operacao, semana) + '</span>minutos operando o sistema nos últimos 7 dias</a>';
    h += '</div>';
    h += '<div class="acoes"><a class="botao primario" href="#/' + L + '/lancar">Lançar simulado</a><a class="botao" href="#/' + L + '/sessoes">Registrar sessão</a><a class="botao" href="#/' + L + '/drive">Levar para o Drive</a></div>';
    h += '<h3>Concursos deste laboratório</h3>';
    lab.concursos.forEach(function (c) {
      var bl = N.bloqueiosLancamento(c);
      h += '<div class="cartao"><strong>' + esc(c.nome) + '</strong> · banca ' + esc(c.banca || '—') + ' · prova ' + N.fmtData(c.dataProva) +
        (c.dataProva ? ' (faltam ' + Math.max(0, N.diasEntre(dia, c.dataProva)) + ' dias)' : '') +
        (bl.length ? alerta('amarelo', esc(N.AVISO_SEM_BLOCOS) + ' — <a href="#/' + L + '/concursos">abrir cadastro</a>') : '') + '</div>';
    });
    var sims = lab.simulados.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; }).slice(0, 3);
    if (sims.length) {
      h += '<h3>Últimos simulados</h3>' + sims.map(cartaoSimulado.bind(null, L)).join('');
    }
    return h;
  }

  /* ---------------------------------------------------------------
   * Lançar simulado
   * ------------------------------------------------------------- */

  function assinaturaBlocos(conc) {
    return JSON.stringify((conc.blocos || []).map(function (b) { return [b.nome, b.numQuestoes, b.pontosPorQuestao, b.assuntos]; })) + '|' + conc.numAlternativas;
  }

  function telaLancar(L, lab) {
    var r = lab.rascunho;
    var conc = r ? concursoPorId(lab, r.concursoId) : null;
    var h = '<h2>Lançar simulado</h2>';
    h += '<div class="cartao"><h3>1. Concurso, data e tempo de prova</h3>';
    h += '<label>Concurso<select data-rasc-concurso>' + opcoes(lab.concursos.map(function (c) {
      return { v: c.id, t: c.nome + (N.bloqueiosLancamento(c).length ? ' — ' + N.AVISO_SEM_BLOCOS : '') };
    }), conc ? conc.id : '', '— escolha o concurso —') + '</select></label>';
    if (!conc) return h + '</div>';
    var bl = N.bloqueiosLancamento(conc);
    if (bl.length) {
      return h + alerta('vermelho', '<strong>Lançamento bloqueado:</strong> ' + esc(bl.join(' · ')) + '. <a href="#/' + L + '/concursos">Abrir o cadastro de ' + esc(conc.nome) + '</a>') + '</div>';
    }
    if (r.assinatura !== assinaturaBlocos(conc)) {
      return h + alerta('amarelo', 'O cadastro de ' + esc(conc.nome) + ' mudou depois que este rascunho foi começado.') +
        '<button type="button" data-acao="rasc-recomecar">Recomeçar com o cadastro atual</button></div>';
    }
    var R = N.regrasDoConcurso(conc);
    h += '<div class="grade2"><label>Data do simulado<input type="date" data-rasc="data" value="' + esc(r.data) + '"></label>';
    h += '<label>Minutos gastos na prova<input type="number" min="1" step="1" inputmode="numeric" data-rasc="minutos" value="' + esc(r.minutos) + '"></label></div>';
    var faltam = N.camposNaoPreenchidos(R);
    if (faltam.length) h += alerta('amarelo', '<ul>' + faltam.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>');
    h += '<p class="suave">' + N.totalQuestoes(R.blocos) + ' questões · ' + R.numAlternativas + ' alternativas (' + N.letrasDe(R.numAlternativas).join(', ') + ') · ' + N.fmtNum(N.totalPontos(R.blocos)) + ' pontos possíveis</p></div>';

    h += '<div class="cartao"><h3>2. Gabarito oficial e suas marcações</h3>';
    h += '<p class="suave">Cole as letras em sequência (ex.: ABCDE...). No gabarito, use <strong>*</strong> para questão anulada. Nas marcações, use <strong>-</strong> (hífen) para questão em branco. Espaços e quebras de linha são ignorados. Também dá para preencher questão por questão logo abaixo.</p>';
    h += '<label>Gabarito oficial<textarea rows="2" data-rasc="gabTexto" placeholder="ABCDE...">' + esc(r.gabTexto || '') + '</textarea></label>';
    h += '<button type="button" data-acao="rasc-aplicar" data-tipo="gabarito">Aplicar gabarito</button>';
    h += '<label>Suas marcações<textarea rows="2" data-rasc="marcTexto" placeholder="ABCD-E...">' + esc(r.marcTexto || '') + '</textarea></label>';
    h += '<button type="button" data-acao="rasc-aplicar" data-tipo="marcacao">Aplicar marcações</button></div>';

    h += '<div class="cartao"><h3>3. Questão por questão</h3>';
    h += '<p class="suave">Acerto com confiança CH ou sem eliminação escrita conta ponto, mas é classificado como <strong>RISCO</strong>, nunca como domínio.</p>';
    h += '<div class="acoes"><button type="button" data-acao="rasc-massa" data-tipo="confC">Confiança C nas marcadas sem confiança</button>';
    h += '<button type="button" data-acao="rasc-massa" data-tipo="elimSim">Eliminação escrita = sim em todas</button>';
    h += '<button type="button" data-acao="rasc-massa" data-tipo="elimNao">Eliminação escrita = não em todas</button></div>';
    var blocoAtual = -1;
    r.questoes.forEach(function (q, i) {
      if (q.bloco !== blocoAtual) {
        blocoAtual = q.bloco;
        var b = R.blocos[q.bloco];
        h += '<h4 class="titulo-bloco">' + esc(b.nome) + ' — ' + b.numQuestoes + ' questões × ' + N.fmtNum(b.pontosPorQuestao) + '</h4>';
      }
      h += htmlQuestao(q, i, R, lab.pares);
    });
    h += '</div>';
    h += '<div id="resumo-rasc" class="resumo-fixo">' + htmlResumoRascunho(r, R) + '</div>';
    h += '<div id="lista-pendencias">' + htmlPendencias() + '</div>';
    return h;
  }

  var ROTULO_SITUACAO = { ACERTO: 'acerto', RISCO: 'acerto RISCO', ERRO: 'erro', BRANCO: 'em branco', ANULADA: 'anulada', PENDENTE: 'falta gabarito' };

  function htmlQuestao(q, i, R, pares) {
    var c = N.classificar(q), b = R.blocos[q.bloco], letras = N.letrasDe(R.numAlternativas);
    var h = '<div class="questao s-' + c + '" data-q="' + i + '" id="q' + q.n + '">';
    h += '<div class="q-cab"><span class="q-num">Q' + q.n + '</span><span class="chip s-' + c + '">' + ROTULO_SITUACAO[c] + '</span></div>';
    h += '<div class="q-campos">';
    h += '<label>Gabarito<select data-q-campo="gabarito">' + opcoes(letras.concat([{ v: '*', t: 'anulada' }]), q.anulada ? '*' : q.gabarito, '—') + '</select></label>';
    if (q.anulada) {
      h += '<label class="largo">Justificativa da anulação (obrigatória)<input type="text" data-q-campo="justificativa" value="' + esc(q.justificativa) + '" placeholder="ex.: anulada pela banca no gabarito definitivo"></label>';
      return h + '</div></div>';
    }
    h += '<label>Marcou<select data-q-campo="marcada">' + opcoes(letras, q.marcada, 'em branco') + '</select></label>';
    if (b.assuntos && b.assuntos.length) h += '<label>Assunto/linha<select data-q-campo="assunto">' + opcoes(b.assuntos, q.assunto, '(' + b.nome + ')') + '</select></label>';
    if (q.marcada) {
      h += '<label>Confiança<select data-q-campo="confianca">' + opcoesConfianca(q.confianca) + '</select></label>';
      h += '<label class="marcar"><input type="checkbox" data-q-campo="eliminacao"' + (q.eliminacao ? ' checked' : '') + '> Fez eliminação escrita</label>';
    }
    if (pares && pares.length) h += '<label>Par vizinho<select data-q-campo="par">' + opcoes(pares, q.par, 'não envolve') + '</select></label>';
    if (N.ehErro(c)) {
      var causa = N.causaPorId(q.causa);
      h += '<label class="largo">Causa do erro (obrigatória)<select data-q-campo="causa">' + opcoesCausa(q.causa) + '</select></label>';
      if (causa) h += '<p class="largo contramedida">Contramedida: ' + esc(causa.contramedida) + '</p>';
    }
    return h + '</div></div>';
  }

  function htmlResumoRascunho(r, R) {
    var cor = N.corrigir({ regras: R, questoes: r.questoes });
    var semGab = r.questoes.filter(function (q) { return N.classificar(q) === 'PENDENTE'; }).length;
    var pend = N.pendenciasSimulado(r, R).length;
    var h = '<div class="resumo-numeros"><span>Acertos ' + N.fmtPct(cor.total.acertos, cor.total.validas) + '</span><span>Pontos ' + N.fmtNum(cor.total.pontos) + ' de ' + N.fmtNum(cor.total.pontosPossiveis) + '</span>';
    h += '<span>' + (semGab ? semGab + ' sem gabarito · ' : '') + pend + ' pendência(s)</span></div>';
    h += '<div class="acoes"><button type="button" class="primario" data-acao="rasc-salvar">Corrigir e salvar</button><button type="button" data-acao="rasc-descartar">Descartar rascunho</button></div>';
    return h;
  }

  function htmlPendencias() {
    if (!T.pendencias || !T.pendencias.length) return '';
    var p = T.pendencias, mostrar = p.slice(0, 20);
    return alerta('vermelho', '<strong>Não salvei: corrija ' + p.length + ' pendência(s).</strong><ul>' + mostrar.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + (p.length > 20 ? 'e mais ' + (p.length - 20) + '.' : ''));
  }

  function novoRascunho(conc) {
    return { concursoId: conc.id, assinatura: assinaturaBlocos(conc), data: N.hoje(), minutos: '', gabTexto: '', marcTexto: '', questoes: N.questoesEmBranco(conc.blocos) };
  }

  function rascunhoTemDados(r) {
    return r && r.questoes && r.questoes.some(function (q) { return q.gabarito || q.marcada || q.anulada; });
  }

  /* ---------------------------------------------------------------
   * Simulados (lista e correção)
   * ------------------------------------------------------------- */

  function cartaoSimulado(L, s) {
    var c = N.corrigir(s);
    return '<a class="cartao cartao-link-simples" href="#/' + L + '/simulado/' + encodeURIComponent(s.id) + '">' +
      '<strong>' + esc(s.regras.nome) + '</strong> · ' + N.fmtData(s.data) + ' · ' + s.minutos + ' min<br>' +
      'Acertos ' + N.fmtPct(c.total.acertos, c.total.validas) + ' · Pontos ' + N.fmtNum(c.total.pontos) + ' de ' + N.fmtNum(c.total.pontosPossiveis) +
      ' <span class="chip ' + (c.eliminado ? 's-ERRO">ELIMINADO' : 's-ACERTO">não eliminado') + '</span></a>';
  }

  function telaSimulados(L, lab) {
    var h = '<h2>Simulados</h2>';
    if (!lab.simulados.length) return h + '<p>Nenhum simulado lançado ainda. <a href="#/' + L + '/lancar">Lançar o primeiro</a>.</p>';
    return h + lab.simulados.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; }).map(cartaoSimulado.bind(null, L)).join('');
  }

  function telaSimulado(L, lab, id) {
    var sim = null;
    lab.simulados.forEach(function (s) { if (s.id === id) sim = s; });
    if (!sim) return '<h2>Simulado não encontrado</h2><p><a href="#/' + L + '/simulados">Voltar à lista</a></p>';
    var cor = N.corrigir(sim), R = sim.regras, t = cor.total;
    var h = '<h2>Correção — ' + esc(R.nome) + ' — ' + N.fmtData(sim.data) + '</h2>';
    h += '<p class="suave">Banca ' + esc(R.banca || '—') + ' · ' + sim.minutos + ' minutos de prova</p>';
    if (cor.eliminado) h += alerta('vermelho', '<strong>ELIMINADO pelas regras cadastradas.</strong><ul>' + cor.vermelho.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>');
    else h += alerta('verde', '<strong>Não eliminado</strong> pelas regras cadastradas' + (R.minimoPontos != null ? ' (mínimo ' + N.fmtNum(R.minimoPontos) + ' pontos' + (R.zeroElimina ? '; zero em disciplina elimina' : '') + ')' : '') + '.');
    var faltamC = N.camposNaoPreenchidos(R);
    if (faltamC.length) h += alerta('amarelo', '<ul>' + faltamC.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>');
    if (cor.amarelo.length) h += alerta('amarelo', '<strong>Atenção — bloco com acerto abaixo de 20%:</strong><ul>' + cor.amarelo.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>');

    h += '<div class="grade-num">';
    h += '<div class="numero-grande"><span>' + N.fmtNum(t.pontos) + '</span>pontos de ' + N.fmtNum(t.pontosPossiveis) + ' possíveis</div>';
    h += '<div class="numero-grande"><span>' + t.acertos + '/' + t.validas + '</span>acertos' + (t.validas ? ' = ' + N.fmtNum(N.pctValor(t.acertos, t.validas), 1) + '%' : ' (sem questões válidas)') + '</div>';
    h += '<div class="numero-grande"><span>' + (cor.meta ? N.fmtNum(Math.abs(cor.meta.distancia)) : '—') + '</span>' + esc(N.textoMeta(cor.meta)) + '</div>';
    h += '<div class="numero-grande"><span>' + t.risco + '/' + t.acertos + '</span>acertos foram RISCO (contam ponto, não domínio)</div>';
    h += '</div>';
    if (t.anuladas) h += '<p>' + t.anuladas + ' questão(ões) anulada(s) fora do cálculo (nem no total, nem no denominador).</p>';

    h += '<h3>Por bloco</h3>' + tabela(['Bloco', 'Acertos', 'RISCO', 'Pontos', 'Anuladas'], cor.blocos.map(function (b) {
      var cls = b.validas > 0 && b.acertos === 0 ? ' class="ruim"' : '';
      return ['<span' + cls + '>' + esc(b.nome) + '</span>', N.fmtPct(b.acertos, b.validas), b.risco + ' de ' + b.acertos, N.fmtNum(b.pontos) + ' de ' + N.fmtNum(b.pontosPossiveis), b.anuladas];
    }).concat([['<strong>Total</strong>', '<strong>' + N.fmtPct(t.acertos, t.validas) + '</strong>', t.risco + ' de ' + t.acertos, '<strong>' + N.fmtNum(t.pontos) + ' de ' + N.fmtNum(t.pontosPossiveis) + '</strong>', t.anuladas]]));

    h += '<h3>Por assunto/linha do edital</h3>' + tabela(['Assunto/linha', 'Bloco', 'Acertos', 'Acertos RISCO'], cor.porAssunto.map(function (a) {
      return [esc(a.assunto), esc(a.bloco), N.fmtPct(a.acertos, a.total), a.risco + ' de ' + a.acertos];
    }));

    h += '<h3>Causas dos erros</h3>' + tabela(['Causa', 'Erros', 'Contramedida'], cor.causas.map(function (c) {
      return [esc(c.nome), N.fmtPct(c.n, cor.totalErros), esc(c.contramedida)];
    }));

    h += '<h3>Pares vizinhos</h3>' + (cor.pares.length ? tabela(['Par', 'Acertos'], cor.pares.map(function (p) { return [esc(p.par), N.fmtPct(p.acertos, p.total)]; })) : '<p>Nenhuma questão marcada com par vizinho.</p>');

    if (cor.anuladas.length) h += '<h3>Anuladas</h3>' + tabela(['Questão', 'Bloco', 'Justificativa'], cor.anuladas.map(function (a) { return ['Q' + a.n, esc(a.bloco), esc(a.justificativa)]; }));

    var linhas = N.linhasDriveSimulado(lab, sim);
    h += '<h3>Para o Drive — ' + LABS[L].drive + '</h3>';
    if (L === 'A') h += linhas.length ? blocoTexto('drive-sim', N.CABECALHO_CADERNO + '\n' + linhas.join('\n'), 'Copiar linhas para o CADERNO_DE_ERROS') : '<p>Nenhum erro neste simulado.</p>';
    else h += blocoTexto('drive-sim', linhas.join('\n'), 'Copiar registros para o 11_ESTADO_B');

    h += '<details class="cartao"><summary>Ver todas as questões</summary>' + tabela(['Q', 'Bloco', 'Assunto', 'Gab.', 'Marcou', 'Situação', 'Conf.', 'Elim.', 'Par', 'Causa'], sim.questoes.map(function (q) {
      var c = N.classificar(q), causa = N.ehErro(c) ? N.causaPorId(q.causa) : null;
      return ['Q' + q.n, esc(R.blocos[q.bloco].nome), esc(q.assunto || '—'), q.anulada ? 'anulada' : esc(q.gabarito), esc(q.marcada || '—'), '<span class="chip s-' + c + '">' + ROTULO_SITUACAO[c] + '</span>',
        esc(q.confianca || '—'), q.anulada || !q.marcada ? '—' : (q.eliminacao ? 'sim' : 'não'), esc(q.par || '—'), causa ? esc(causa.nome) : '—'];
    })) + '</details>';

    h += '<div class="acoes"><button type="button" class="primario" data-acao="baixar-simulado" data-id="' + esc(sim.id) + '">Relatório do simulado (.md)</button>';
    h += '<button type="button" class="perigo" data-acao="excluir-simulado" data-id="' + esc(sim.id) + '">Excluir simulado</button></div>';
    return h;
  }

  /* ---------------------------------------------------------------
   * Sessões de estudo
   * ------------------------------------------------------------- */

  function novaSessao(lab) {
    return { data: N.hoje(), concursoId: lab.concursos[0] ? lab.concursos[0].id : '', itens: [novoItemSessao()] };
  }
  function novoItemSessao() { return { assunto: '', minutos: '', questoes: '', acertos: '', acertosCH: '', acertosSemElim: '', erros: [] }; }

  function numErrosItem(it) {
    var q = N.lerNumero(it.questoes), a = N.lerNumero(it.acertos);
    if (!N.inteiroNaoNegativo(q) || !N.inteiroNaoNegativo(a) || a > q) return 0;
    return q - a;
  }

  function ajustarErros(it) {
    var n = numErrosItem(it);
    while (it.erros.length < n) it.erros.push({ confianca: '', causa: '', marcou: '', gabarito: '' });
    it.erros.length = n;
  }

  function htmlErrosItem(L, it, i) {
    var n = it.erros.length;
    if (!n) return '<p class="suave">Sem erros neste assunto (ou questões/acertos ainda não preenchidos).</p>';
    var h = '<p><strong>' + n + ' erro(s):</strong> confiança e causa de cada um.</p>';
    it.erros.forEach(function (e, j) {
      var c = N.causaPorId(e.causa);
      h += '<div class="erro-sessao" data-erro="' + j + '"><span class="q-num">Erro ' + (j + 1) + '</span>';
      h += '<label>Confiança<select data-erro-campo="confianca">' + opcoesConfianca(e.confianca) + '</select></label>';
      h += '<label>Causa<select data-erro-campo="causa">' + opcoesCausa(e.causa) + '</select></label>';
      if (L === 'A') {
        h += '<label>O que marcou (opcional)<input type="text" maxlength="3" data-erro-campo="marcou" value="' + esc(e.marcou) + '"></label>';
        h += '<label>Gabarito (opcional)<input type="text" maxlength="3" data-erro-campo="gabarito" value="' + esc(e.gabarito) + '"></label>';
      }
      if (c) h += '<p class="contramedida">Contramedida: ' + esc(c.contramedida) + '</p>';
      h += '</div>';
    });
    return h;
  }

  function htmlFormSessao(L, lab) {
    var s = lab.rascunhoSessao || novaSessao(lab);
    var h = '<datalist id="assuntos-' + L + '">' + assuntosDoLab(lab).map(function (a) { return '<option value="' + esc(a) + '">'; }).join('') + '</datalist>';
    h += '<div class="grade2"><label>Data<input type="date" data-sess="data" value="' + esc(s.data) + '"></label>';
    h += '<label>Concurso<select data-sess="concursoId">' + opcoes(lab.concursos.map(function (c) { return { v: c.id, t: c.nome }; }), s.concursoId, '— escolha —') + '</select></label></div>';
    s.itens.forEach(function (it, i) {
      h += '<fieldset class="item-sessao" data-item="' + i + '"><legend>Assunto ' + (i + 1) + '</legend>';
      h += '<label>Assunto/linha do edital<input type="text" list="assuntos-' + L + '" data-item-campo="assunto" value="' + esc(it.assunto) + '" placeholder="escolha da lista ou digite"></label>';
      h += '<div class="grade3"><label>Minutos<input type="number" min="1" step="1" inputmode="numeric" data-item-campo="minutos" value="' + esc(it.minutos) + '"></label>';
      h += '<label>Questões feitas<input type="number" min="0" step="1" inputmode="numeric" data-item-campo="questoes" value="' + esc(it.questoes) + '"></label>';
      h += '<label>Acertos<input type="number" min="0" step="1" inputmode="numeric" data-item-campo="acertos" value="' + esc(it.acertos) + '"></label></div>';
      h += '<div class="grade2"><label>Acertos com chute (CH)<input type="number" min="0" step="1" inputmode="numeric" data-item-campo="acertosCH" value="' + esc(it.acertosCH == null ? '' : it.acertosCH) + '"></label>';
      h += '<label>Acertos sem eliminação escrita (sem contar os de chute)<input type="number" min="0" step="1" inputmode="numeric" data-item-campo="acertosSemElim" value="' + esc(it.acertosSemElim == null ? '' : it.acertosSemElim) + '"></label></div>';
      h += '<div class="erros-item" id="erros-' + L + '-' + i + '">' + htmlErrosItem(L, it, i) + '</div>';
      if (s.itens.length > 1) h += '<button type="button" class="perigo" data-acao="sess-remover-item" data-i="' + i + '">Remover este assunto</button>';
      h += '</fieldset>';
    });
    h += '<div class="acoes"><button type="button" data-acao="sess-add-item">+ Outro assunto nesta sessão</button>';
    h += '<button type="button" class="primario" data-acao="sess-salvar">Salvar sessão</button>';
    h += '<button type="button" data-acao="sess-limpar">Limpar formulário</button></div>';
    return h;
  }

  function telaSessoes(L, lab) {
    var h = '<h2>Sessões de estudo</h2>';
    h += '<p class="suave">Registre os minutos de cada assunto. Sem minutos a sessão não pode ser salva. Os minutos de operar o sistema vão em <a href="#/' + L + '/operacao">Minutos operando</a>, separados.</p>';
    h += '<div class="cartao" id="form-sessao">' + htmlFormSessao(L, lab) + '</div>';
    h += '<h3>Sessões registradas</h3>';
    var lista = lab.sessoes.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : (a.criadoEm < b.criadoEm ? 1 : -1); });
    if (!lista.length) return h + '<p>Nenhuma sessão registrada.</p>';
    var cx = L === 'B' ? N.estadoCaixasB(lab) : null;
    lista.forEach(function (s) {
      var min = 0; s.itens.forEach(function (it) { min += it.minutos; });
      h += '<div class="cartao"><strong>' + N.fmtData(s.data) + '</strong> · ' + esc(s.concursoNome || '—') + ' · ' + min + ' min no total<ul>';
      s.itens.forEach(function (it) {
        h += '<li><strong>' + esc(it.assunto) + '</strong>: ' + it.minutos + ' min · ' + it.questoes + ' questões · acertos ' + N.fmtPct(it.acertos, it.questoes);
        h += it.acertosCH != null && it.acertosSemElim != null ? ' (com chute: ' + it.acertosCH + '; sem eliminação escrita: ' + it.acertosSemElim + ')' : (it.acertos > 0 ? ' (chute/eliminação: não informado)' : '');
        if (it.erros.length) h += ' · erros: ' + it.erros.map(function (e) { var c = N.causaPorId(e.causa); return esc((c ? c.nome : '—') + ' (' + (e.confianca || '—') + ')'); }).join('; ');
        h += '</li>';
      });
      h += '</ul>';
      if (L === 'B') {
        h += '<details><summary>Registro para o 11_ESTADO_B</summary>' + blocoTexto('reg-' + s.id, s.itens.map(function (it) { return N.registroEstadoB(lab, it.assunto, s.data, cx); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join('\n')) + '</details>';
      }
      h += '<button type="button" class="perigo pequeno" data-acao="excluir-sessao" data-id="' + esc(s.id) + '">Excluir sessão</button></div>';
    });
    return h;
  }

  /* ---------------------------------------------------------------
   * Minutos operando o sistema
   * ------------------------------------------------------------- */

  function telaOperacao(L, lab) {
    var h = '<h2>Minutos operando o sistema</h2>';
    h += '<p class="suave">Registro separado do estudo: tempo gasto colando prompt, imprimindo, transferindo e gravando. Entra no custo de operação do placar.</p>';
    h += '<form class="cartao" data-form="operacao"><div class="grade3">';
    h += '<label>Data<input type="date" name="data" value="' + N.hoje() + '"></label>';
    h += '<label>Minutos<input type="number" name="minutos" min="1" step="1" inputmode="numeric"></label>';
    h += '<label>O que fez (opcional)<input type="text" name="nota" placeholder="colar prompt, imprimir, transferir, gravar"></label></div>';
    h += '<button type="submit" class="primario">Registrar minutos</button></form>';
    var dias = {};
    lab.operacao.forEach(function (o) { (dias[o.data] = dias[o.data] || []).push(o); });
    var ks = Object.keys(dias).sort().reverse();
    h += '<h3>Por dia</h3>';
    if (!ks.length) return h + '<p>Nenhum registro.</p>';
    ks.forEach(function (d) {
      var tot = 0; dias[d].forEach(function (o) { tot += o.minutos; });
      h += '<div class="cartao"><strong>' + N.fmtData(d) + ' — ' + tot + ' min</strong><ul>';
      dias[d].forEach(function (o) {
        h += '<li>' + o.minutos + ' min' + (o.nota ? ' · ' + esc(o.nota) : '') + ' <button type="button" class="perigo pequeno" data-acao="excluir-operacao" data-id="' + esc(o.id) + '">Excluir</button></li>';
      });
      h += '</ul></div>';
    });
    return h;
  }

  /* ---------------------------------------------------------------
   * Revisões — Laboratório A (D0/D2/D7/D21)
   * ------------------------------------------------------------- */

  function linhaDoTempoA(est) {
    return est.cicloAtual.etapas.map(function (e) {
      var r = e.registro;
      var marca = r ? (r.resultado === 'acertou' ? '✓' : '✗') : (est.fechado ? '' : '·');
      return '<span class="etapa' + (r ? (r.resultado === 'acertou' ? ' feita' : ' falhou') : '') + '">' + e.nome + ' ' + marca + ' ' + N.fmtData(e.data) + '</span>';
    }).join(' ');
  }

  function descricaoItemA(est) {
    var it = est.item, c = N.causaPorId(it.causa);
    return '<strong>' + esc(it.linha || it.bloco) + '</strong> · ' + esc(it.alvo) + ' · ' + esc(it.bloco) +
      '<br><span class="suave">Erro em ' + N.fmtData(it.data) + ' (' + (it.origem === 'simulado' ? 'simulado, Q' + it.n : 'sessão de estudo') + ') · marcou ' + esc(it.marcou) + ', gabarito ' + esc(it.gabarito) +
      ' · causa: ' + esc(c ? c.nome : '—') + ' → ' + esc(c ? c.contramedida : '—') + '</span>';
  }

  function detalhesCaderno(est) {
    return '<details class="caderno"><summary>Linha para o CADERNO_DE_ERROS</summary>' + blocoTexto('cad-' + est.item.id, N.linhaCaderno(est)) + '</details>';
  }

  function formRevisaoA(est) {
    var e = est.proxima;
    var h = '<form class="form-revisao" data-form="revisao-a" data-item="' + esc(est.item.id) + '">';
    h += '<div class="grade2"><label>Data em que fez a revisão<input type="date" name="data" value="' + N.hoje() + '"></label>';
    h += '<fieldset class="radios"><legend>Resultado</legend><label class="marcar"><input type="radio" name="resultado" value="acertou"> Acertou</label><label class="marcar"><input type="radio" name="resultado" value="errou"> Errou</label></fieldset></div>';
    if (e.nome !== 'D0') {
      h += '<label class="marcar"><input type="checkbox" name="nova"> ' + (e.nome === 'D2' ? 'Foi em item novo ou estruturalmente diferente' : 'Foi em questão nova') + '</label>';
    }
    h += '<div class="grade2"><label>Confiança (se acertou)<select name="confianca">' + opcoesConfianca('', '— escolha —') + '</select></label>';
    h += '<fieldset class="radios"><legend>Fez eliminação escrita? (se acertou)</legend><label class="marcar"><input type="radio" name="elim" value="sim"> Sim</label><label class="marcar"><input type="radio" name="elim" value="nao"> Não</label></fieldset>' + '</div>';
    if (e.nome === 'D21') h += '<p class="suave">Acerto com chute (CH) no D21 não fecha o erro.</p>';
    h += '<label>Causa (se errou)<select name="causa">' + opcoesCausa('') + '</select></label>';
    h += '<button type="submit" class="primario">Registrar ' + e.nome + '</button></form>';
    return h;
  }

  function telaRevisoesA(L, lab) {
    var dia = N.hoje(), cfg = lab.config;
    var est = N.estadoRevisoesA(lab), venc = N.vencidasA(est, dia), prox = N.proximasA(est, dia);
    var h = '<h2>Revisões D0 / D2 / D7 / D21</h2>';
    h += '<p class="suave">Cada erro gera um item. D0 = mesmo dia; D2 = +' + cfg.intervalos[1] + ' dias; D7 = +' + cfg.intervalos[2] + '; D21 = +' + cfg.intervalos[3] + '. ' +
      'O erro só fecha com D21 acertado em questão nova. ' + (cfg.novoCicloAoErrar ? 'Errou em qualquer etapa: abre novo ciclo com D0 na data desse erro.' : 'Errou: segue para a próxima etapa (regra alterada em Configurações).') + '</p>';
    h += '<h3>Vencidas hoje (' + venc.length + ')</h3>';
    if (!venc.length) h += '<p>Nenhuma revisão vencida.</p>';
    venc.forEach(function (e) {
      var atraso = N.diasEntre(e.proxima.data, dia);
      h += '<div class="cartao item-rev urgente">' + descricaoItemA(e);
      h += '<p><strong>Ciclo ' + e.numCiclo + ' · etapa ' + e.proxima.nome + '</strong> prevista para ' + N.fmtData(e.proxima.data) + (atraso > 0 ? ' — <span class="ruim">vencida há ' + atraso + ' dia(s)</span>' : ' — vence hoje') + '</p>';
      h += '<p class="linha-tempo">' + linhaDoTempoA(e) + '</p>';
      h += formRevisaoA(e) + detalhesCaderno(e) + '</div>';
    });
    h += '<h3>Próximos 7 dias (' + prox.length + ')</h3>';
    h += prox.length ? tabela(['Data', 'Etapa', 'Linha', 'Alvo'], prox.map(function (e) {
      return [N.fmtData(e.proxima.data), e.proxima.nome + ' (ciclo ' + e.numCiclo + ')', esc(e.item.linha || e.item.bloco), esc(e.item.alvo)];
    })) : '<p>Nada nos próximos 7 dias.</p>';
    var abertos = est.filter(function (e) { return !e.fechado; }).length;
    h += '<h3>Todos os erros (' + est.length + ': ' + abertos + ' abertos, ' + (est.length - abertos) + ' fechados)</h3>';
    h += '<label>Mostrar<select data-filtro-a>' + opcoes([{ v: 'abertos', t: 'só abertos' }, { v: 'fechados', t: 'só fechados' }, { v: 'todos', t: 'todos' }], T.filtroA) + '</select></label>';
    est.filter(function (e) { return T.filtroA === 'todos' || (T.filtroA === 'abertos' ? !e.fechado : e.fechado); }).forEach(function (e) {
      h += '<div class="cartao item-rev">' + descricaoItemA(e);
      h += '<p>' + (e.fechado ? '<span class="chip s-ACERTO">fechado em ' + N.fmtData(e.dataFechamento) + '</span>' : '<span class="chip s-RISCO">aberto · ciclo ' + e.numCiclo + ' · próxima ' + e.proxima.nome + ' em ' + N.fmtData(e.proxima.data) + '</span>') + '</p>';
      h += '<p class="linha-tempo">' + linhaDoTempoA(e) + '</p>' + detalhesCaderno(e) + '</div>';
    });
    return h;
  }

  /* ---------------------------------------------------------------
   * Revisões — Laboratório B (caixas)
   * ------------------------------------------------------------- */

  function ultimaDataLinha(s) { return s.historico.length ? s.historico[s.historico.length - 1].data : N.hoje(); }

  function telaCaixasB(L, lab) {
    var dia = N.hoje(), cx = lab.config.caixas;
    var est = N.estadoCaixasB(lab), venc = N.vencidasB(est, dia), prox = N.proximasB(est, dia);
    var h = '<h2>Caixas</h2>';
    h += '<p class="suave">Caixas de ' + cx.join(', ') + ' dias. Acertou sem ser chute → sobe uma caixa. Errou → volta para a caixa 1. Acerto com confiança CH não sobe. Toda revisão é registrada como feita em questão nova. Errar a linha num simulado ou numa sessão também a leva para a caixa 1.</p>';
    h += '<h3>Vencidas hoje (' + venc.length + ')</h3>';
    if (!venc.length) h += '<p>Nenhuma linha vencida.</p>';
    venc.forEach(function (s, vi) {
      var atraso = N.diasEntre(s.proxima, dia);
      h += '<div class="cartao item-rev urgente"><strong>' + esc(s.linha) + '</strong> · caixa ' + s.caixa + ' (' + cx[s.caixa - 1] + ' dias)';
      h += '<p>Prevista para ' + N.fmtData(s.proxima) + (atraso > 0 ? ' — <span class="ruim">vencida há ' + atraso + ' dia(s)</span>' : ' — vence hoje') + '</p>';
      h += '<form class="form-revisao" data-form="revisao-b" data-linha="' + esc(s.linha) + '"><div class="grade2">';
      h += '<label>Data em que fez a revisão<input type="date" name="data" value="' + dia + '"></label>';
      h += '<fieldset class="radios"><legend>Resultado (questão nova)</legend><label class="marcar"><input type="radio" name="resultado" value="acertou"> Acertou</label><label class="marcar"><input type="radio" name="resultado" value="errou"> Errou</label></fieldset>';
      h += '<label>Confiança (se acertou)<select name="confianca">' + opcoesConfianca('', '— escolha —') + '</select></label>';
      h += '<fieldset class="radios"><legend>Fez eliminação escrita? (se acertou)</legend><label class="marcar"><input type="radio" name="elim" value="sim"> Sim</label><label class="marcar"><input type="radio" name="elim" value="nao"> Não</label></fieldset>';
      h += '<label>Causa (se errou)<select name="causa">' + opcoesCausa('') + '</select></label></div>';
      h += '<button type="submit" class="primario">Registrar revisão</button></form>';
      h += '<details><summary>Registro para o 11_ESTADO_B</summary>' + blocoTexto('regb-' + vi, N.registroEstadoB(lab, s.linha, ultimaDataLinha(s), est)) + '</details></div>';
    });
    h += '<h3>Próximos 7 dias (' + prox.length + ')</h3>';
    h += prox.length ? tabela(['Data', 'Linha', 'Caixa'], prox.map(function (s) { return [N.fmtData(s.proxima), esc(s.linha), s.caixa]; })) : '<p>Nada nos próximos 7 dias.</p>';
    h += '<h3>Todas as caixas</h3>';
    for (var k = 1; k <= cx.length; k++) {
      var nesta = est.filter(function (s) { return s.caixa === k; });
      h += '<div class="cartao"><strong>Caixa ' + k + ' (' + cx[k - 1] + ' dias)</strong> — ' + nesta.length + ' linha(s)';
      if (nesta.length) h += '<ul>' + nesta.map(function (s, ci) {
        return '<li>' + esc(s.linha) + ' · próxima ' + N.fmtData(s.proxima) + ' <details class="inline"><summary>Registro para o 11_ESTADO_B</summary>' + blocoTexto('regc-' + k + '-' + ci, N.registroEstadoB(lab, s.linha, ultimaDataLinha(s), est)) + '</details></li>';
      }).join('') + '</ul>';
      h += '</div>';
    }
    h += '<h3>Colocar uma linha nas caixas</h3>';
    h += '<form class="cartao" data-form="entrada-b"><datalist id="assuntos-B-cx">' + assuntosDoLab(lab).map(function (a) { return '<option value="' + esc(a) + '">'; }).join('') + '</datalist>';
    h += '<p class="suave">Linhas entram sozinhas na caixa 1 quando você erra. Use aqui para colocar uma linha que ainda não teve erro.</p>';
    h += '<label>Linha<input type="text" name="linha" list="assuntos-B-cx"></label><button type="submit">Colocar na caixa 1</button></form>';
    return h;
  }

  /* ---------------------------------------------------------------
   * Drive e exportar
   * ------------------------------------------------------------- */

  function telaDrive(L, lab) {
    var h = '<h2>Levar para o Drive — ' + LABS[L].drive + '</h2>';
    h += '<p class="destaque-drive">' + esc(FRASE_DRIVE) + '</p>';
    if (L === 'A') {
      var est = N.estadoRevisoesA(lab);
      var filtro = T.filtroA;
      var lista = est.filter(function (e) { return filtro === 'todos' || (filtro === 'abertos' ? !e.fechado : e.fechado); });
      h += '<label>Quais erros<select data-filtro-a>' + opcoes([{ v: 'abertos', t: 'só abertos' }, { v: 'fechados', t: 'só fechados' }, { v: 'todos', t: 'todos' }], filtro) + '</select></label>';
      h += lista.length ? blocoTexto('drive-a', N.CABECALHO_CADERNO + '\n' + lista.map(N.linhaCaderno).join('\n'), 'Copiar linhas para o CADERNO_DE_ERROS') : '<p>Nenhum erro nesta seleção.</p>';
    } else {
      var dia = T.diaDrive.B || N.hoje();
      var ls = N.linhasDoDia(lab, dia), cx = N.estadoCaixasB(lab);
      h += '<label>Dia<input type="date" data-dia-drive value="' + dia + '"></label>';
      h += ls.length ? blocoTexto('drive-b', ls.map(function (l) { return N.registroEstadoB(lab, l, dia, cx); }).join('\n'), 'Copiar registros para o 11_ESTADO_B') : '<p>Nenhuma atividade registrada neste dia.</p>';
    }
    h += '<h3>Exportar arquivos</h3><div class="acoes">';
    h += '<button type="button" data-acao="baixar-estado">Estado do laboratório (.md)</button>';
    h += '<button type="button" data-acao="baixar-csv">Planilha (.csv)</button>';
    h += '<a class="botao" href="#/placar">Placar A×B (.md) — na tela do placar</a>';
    h += '<a class="botao" href="#/backup">Backup completo (.json)</a></div>';
    if (lab.simulados.length) {
      h += '<h3>Relatórios dos simulados (.md)</h3><ul class="lista-limpa">';
      lab.simulados.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).forEach(function (s) {
        h += '<li><button type="button" data-acao="baixar-simulado" data-id="' + esc(s.id) + '">' + esc(N.nomeArquivoSimulado(s, L)) + '</button></li>';
      });
      h += '</ul>';
    }
    return h;
  }

  /* ---------------------------------------------------------------
   * Concursos e pares vizinhos
   * ------------------------------------------------------------- */

  function paraEdicao(c, L) {
    return {
      id: c ? c.id : null, nome: c ? c.nome : '', banca: c ? c.banca || '' : '', dataProva: c ? c.dataProva || '' : '',
      numAlternativas: c && c.numAlternativas != null ? String(c.numAlternativas) : '',
      minimoPontos: c && c.minimoPontos != null ? N.fmtNum(c.minimoPontos) : '',
      zeroElimina: c ? (c.zeroElimina === true ? 'sim' : c.zeroElimina === false ? 'nao' : '') : '',
      meta: c && c.meta != null ? N.fmtNum(c.meta) : '', alvo: c ? c.alvo || '' : '',
      blocos: c ? c.blocos.map(function (b) { return { nome: b.nome, numQuestoes: String(b.numQuestoes), pontosPorQuestao: N.fmtNum(b.pontosPorQuestao), assuntosTexto: (b.assuntos || []).join('\n'),
        minimoAcertos: b.minimoAcertos != null ? String(b.minimoAcertos) : '' }; }) : [],
      grupos: c && c.grupos ? c.grupos.map(function (g) { return { nome: g.nome, blocos: g.blocos.slice(), minimoAcertos: String(g.minimoAcertos) }; }) : []
    };
  }

  function htmlFormConcurso(L, e) {
    var h = '<h3>' + (e.id ? 'Editar ' + esc(e.nome) : 'Novo concurso') + '</h3>';
    h += '<p class="suave">Laboratório: <strong>' + LABS[L].nome + '</strong> (fixo: cada laboratório guarda seus próprios concursos).</p>';
    h += '<div class="grade2">';
    h += '<label>Nome<input type="text" data-conc="nome" value="' + esc(e.nome) + '"></label>';
    h += '<label>Banca<input type="text" data-conc="banca" value="' + esc(e.banca) + '"></label>';
    h += '<label>Data da prova<input type="date" data-conc="dataProva" value="' + esc(e.dataProva) + '"></label>';
    h += '<label>Número de alternativas<input type="number" min="2" max="10" step="1" inputmode="numeric" data-conc="numAlternativas" value="' + esc(e.numAlternativas) + '" placeholder="pelo edital"></label>';
    h += '<label>Pontuação mínima para não eliminar<input type="text" inputmode="decimal" data-conc="minimoPontos" value="' + esc(e.minimoPontos) + '" placeholder="pelo edital"></label>';
    h += '<label>Zero em qualquer disciplina elimina?<select data-conc="zeroElimina">' + opcoes([{ v: 'sim', t: 'sim' }, { v: 'nao', t: 'não' }], e.zeroElimina, '— preencher pelo edital —') + '</select></label>';
    h += '<label>Meta de pontos<input type="text" inputmode="decimal" data-conc="meta" value="' + esc(e.meta) + '"></label>';
    if (L === 'A') h += '<label>Alvo no CADERNO_DE_ERROS<input type="text" data-conc="alvo" value="' + esc(e.alvo) + '" placeholder="CE ou CRUZETA"></label>';
    h += '</div><h4>Blocos (na ordem da prova)</h4>';
    if (!e.blocos.length) h += alerta('amarelo', esc(N.AVISO_SEM_BLOCOS) + '. Nenhum bloco cadastrado.');
    e.blocos.forEach(function (b, i) {
      h += '<fieldset class="bloco-edit" data-bloco="' + i + '"><legend>Bloco ' + (i + 1) + '</legend><div class="grade3">';
      h += '<label>Nome<input type="text" data-bloco-campo="nome" value="' + esc(b.nome) + '"></label>';
      h += '<label>Nº de questões<input type="number" min="1" step="1" inputmode="numeric" data-bloco-campo="numQuestoes" value="' + esc(b.numQuestoes) + '"></label>';
      h += '<label>Pontos por questão<input type="text" inputmode="decimal" data-bloco-campo="pontosPorQuestao" value="' + esc(b.pontosPorQuestao) + '"></label>';
      h += '<label>Mínimo de acertos no bloco (opcional)<input type="number" min="0" step="1" inputmode="numeric" data-bloco-campo="minimoAcertos" value="' + esc(b.minimoAcertos || '') + '" placeholder="sem mínimo"></label></div>';
      h += '<label>Assuntos/linhas do edital (um por linha)<textarea rows="4" data-bloco-campo="assuntosTexto">' + esc(b.assuntosTexto) + '</textarea></label>';
      h += '<button type="button" class="perigo pequeno" data-acao="conc-remover-bloco" data-i="' + i + '">Remover bloco</button></fieldset>';
    });
    h += '<div class="acoes"><button type="button" data-acao="conc-add-bloco">+ Bloco</button></div>';
    h += '<h4>Grupos de blocos com mínimo próprio (opcional)</h4>';
    h += '<p class="suave">Ex.: uma "Parte 1" formada por vários blocos, com mínimo de acertos somado. Abaixo do mínimo, elimina.</p>';
    (e.grupos || []).forEach(function (g, gi) {
      h += '<fieldset class="bloco-edit" data-grupo="' + gi + '"><legend>Grupo ' + (gi + 1) + '</legend><div class="grade2">';
      h += '<label>Nome do grupo<input type="text" data-grupo-campo="nome" value="' + esc(g.nome) + '"></label>';
      h += '<label>Mínimo de acertos do grupo<input type="number" min="0" step="1" inputmode="numeric" data-grupo-campo="minimoAcertos" value="' + esc(g.minimoAcertos) + '"></label></div>';
      h += '<p><strong>Blocos do grupo</strong></p>';
      e.blocos.forEach(function (b, bi) {
        h += '<label class="marcar"><input type="checkbox" data-grupo-bloco="' + bi + '"' + (g.blocos.indexOf(bi) >= 0 ? ' checked' : '') + '> Bloco ' + (bi + 1) + (b.nome ? ' — ' + esc(b.nome) : '') + '</label>';
      });
      if (!e.blocos.length) h += '<p class="suave">Cadastre os blocos primeiro.</p>';
      h += '<button type="button" class="perigo pequeno" data-acao="conc-remover-grupo" data-i="' + gi + '">Remover grupo</button></fieldset>';
    });
    h += '<div class="acoes"><button type="button" data-acao="conc-add-grupo">+ Grupo de blocos</button>';
    h += '<button type="button" class="primario" data-acao="conc-salvar">Salvar concurso</button>';
    h += '<button type="button" data-acao="conc-cancelar">Cancelar</button>';
    if (e.id) h += '<button type="button" class="perigo" data-acao="conc-excluir">Excluir concurso</button>';
    return h + '</div>';
  }

  function telaConcursos(L, lab) {
    var h = '<h2>Concursos e pares vizinhos</h2>';
    var e = T.concEdit[L];
    if (e) return h + '<div class="cartao" id="form-concurso">' + htmlFormConcurso(L, e) + '</div>';
    lab.concursos.forEach(function (c) {
      var bl = N.bloqueiosLancamento(c);
      h += '<div class="cartao"><strong>' + esc(c.nome) + '</strong> · ' + LABS[L].nome + ' · banca ' + esc(c.banca || '—') + ' · prova ' + N.fmtData(c.dataProva);
      h += '<br><span class="suave">' + (c.numAlternativas ? c.numAlternativas + ' alternativas' : 'alternativas: não cadastrado') +
        ' · mínimo: ' + (c.minimoPontos != null ? N.fmtNum(c.minimoPontos) + ' pontos' : 'não cadastrado') +
        ' · zero em disciplina elimina: ' + (c.zeroElimina === true ? 'sim' : c.zeroElimina === false ? 'não' : 'não cadastrado') +
        ' · meta: ' + (c.meta != null ? N.fmtNum(c.meta) : 'não cadastrada') + (L === 'A' ? ' · alvo: ' + esc(c.alvo || '—') : '') + '</span>';
      if (bl.length) h += alerta('amarelo', '<strong>' + esc(N.AVISO_SEM_BLOCOS) + '.</strong> ' + esc(bl.join(' · ')));
      if (c.blocos.length) {
        h += tabela(['Bloco', 'Questões', 'Pontos/questão', 'Subtotal', 'Mínimo de acertos', 'Linhas do edital'], c.blocos.map(function (b) {
          return [esc(b.nome), b.numQuestoes, N.fmtNum(b.pontosPorQuestao), N.fmtNum(b.numQuestoes * b.pontosPorQuestao), b.minimoAcertos != null ? b.minimoAcertos : '—', b.assuntos.length ? esc(b.assuntos.join(', ')) : '<span class="suave">a preencher</span>'];
        }).concat([['<strong>Total</strong>', N.totalQuestoes(c.blocos), '', '<strong>' + N.fmtNum(N.totalPontos(c.blocos)) + '</strong>', '', '']]));
        if (c.grupos && c.grupos.length) h += '<p>Grupos com mínimo próprio: ' + c.grupos.map(function (g) {
          return '<strong>' + esc(g.nome) + '</strong> (' + g.blocos.map(function (i) { return c.blocos[i] ? esc(c.blocos[i].nome) : '?'; }).join(', ') + ') mínimo ' + g.minimoAcertos + ' acertos';
        }).join('; ') + '</p>';
      }
      h += '<button type="button" data-acao="conc-editar" data-id="' + esc(c.id) + '">Editar</button></div>';
    });
    h += '<button type="button" data-acao="conc-novo">+ Novo concurso</button>';
    h += '<h3>Pares vizinhos deste laboratório</h3>';
    h += '<form class="cartao" data-form="pares"><label>Um par por linha (ex.: Piaget × Vygotsky)<textarea name="pares" rows="6">' + esc(lab.pares.join('\n')) + '</textarea></label>';
    h += '<button type="submit" class="primario">Salvar pares</button></form>';
    return h;
  }

  /* ---------------------------------------------------------------
   * Configurações
   * ------------------------------------------------------------- */

  function htmlEditais(L) {
    var quais = L === 'A' ? 'SEDUC/CE e Cruzeta/RN' : 'Jucurutu/RN';
    var h = '<div class="cartao" id="editais"><h3>Carregar cadastro dos editais</h3>';
    h += '<p class="suave">Atualiza ' + quais + ' com os dados dos editais. Não apaga nem altera simulados, sessões, revisões ou caixas já registrados. ' +
      'Campos que o edital deixa em branco não são preenchidos (se você já tiver digitado algo neles, fica o que você digitou). ' +
      'Os concursos do outro laboratório são carregados nas Configurações dele.</p>';
    var plano = T.planoEdital[L];
    if (!plano) return h + '<button type="button" class="primario" data-acao="edital-carregar">Carregar cadastro dos editais</button></div>';
    var editados = plano.filter(function (p) { return p.editado && p.mudancas.length; });
    h += alerta('amarelo', '<strong>Você já editou ' + editados.map(function (p) { return esc(p.nome); }).join(' e ') + '.</strong> Confira abaixo o que vai mudar e confirme de novo.');
    plano.forEach(function (p) {
      h += '<h4>' + esc(p.nome) + (p.editado ? ' (editado por você)' : '') + '</h4>';
      h += p.mudancas.length ? '<ul>' + p.mudancas.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>' : '<p>Nada muda.</p>';
      if (p.avisos.length) h += alerta('amarelo', p.avisos.map(esc).join('<br>'));
    });
    h += '<div class="acoes"><button type="button" class="primario" data-acao="edital-aplicar">Confirmar e carregar</button><button type="button" data-acao="edital-cancelar">Cancelar</button></div>';
    return h + '</div>';
  }

  function telaConfig(L, lab) {
    var h = '<h2>Configurações — ' + LABS[L].nome + '</h2>';
    h += htmlEditais(L);
    if (L === 'A') {
      var c = lab.config;
      h += '<form class="cartao" data-form="config-a"><h3>Revisão D0/D2/D7/D21</h3><p class="suave">Dias depois da data do erro (ou do início do novo ciclo).</p><div class="grade3">';
      N.ETAPAS_A.forEach(function (nome, i) {
        h += '<label>' + nome + ' = + dias<input type="number" min="0" step="1" inputmode="numeric" name="int' + i + '" value="' + c.intervalos[i] + '"></label>';
      });
      h += '</div><label class="marcar"><input type="checkbox" name="novoCiclo"' + (c.novoCicloAoErrar ? ' checked' : '') + '> Errou em qualquer etapa: abrir novo ciclo com D0 na data desse erro</label>';
      h += '<p class="suave">Desmarcado: o erro segue para a próxima etapa (errar o D21 sempre abre novo ciclo). O erro só fecha com D21 acertado em questão nova.</p>';
      h += '<div class="acoes"><button type="submit" class="primario">Salvar</button><button type="button" data-acao="config-padrao">Voltar ao padrão (0, 2, 7, 21; novo ciclo)</button></div></form>';
    } else {
      var cx = lab.config.caixas, g = D.geral(), auto = N.primeiraSessao(lab);
      h += '<form class="cartao" data-form="config-b"><h3>Caixas</h3><p class="suave">Dias até a próxima revisão em cada caixa.</p><div class="grade3">';
      cx.forEach(function (d, i) { h += '<label>Caixa ' + (i + 1) + '<input type="number" min="1" step="1" inputmode="numeric" name="cx' + i + '" value="' + d + '"></label>'; });
      h += '</div><div class="acoes"><button type="submit" class="primario">Salvar caixas</button><button type="button" data-acao="config-padrao">Voltar ao padrão (1, 3, 7, 16, 35)</button></div></form>';
      h += '<form class="cartao" data-form="config-inicio"><h3>Data da primeira sessão de B (placar)</h3>';
      h += '<p class="suave">As janelas do placar contam a partir desta data (janela 1 = 4 semanas; janela 2 = 8 semanas). Em branco, vale a primeira sessão de B registrada' + (auto ? ': ' + N.fmtData(auto) : ' (ainda não há nenhuma)') + '.</p>';
      h += '<label>Data<input type="date" name="inicio" value="' + esc(g.primeiraSessaoB || '') + '"></label>';
      h += '<button type="submit" class="primario">Salvar data</button></form>';
    }
    return h;
  }

  /* ---------------------------------------------------------------
   * Placar A×B (única tela que lê os dois laboratórios)
   * ------------------------------------------------------------- */

  function vencedorTexto(w) { return w === 'A' || w === 'B' ? 'Método ' + w : w === 'igual' ? 'igual' : 'sem medição'; }

  function telaPlacar() {
    var labA = D.lab('A'), labB = D.lab('B'), g = D.geral(), dia = N.hoje();
    var per = N.periodoPlacar(g, labA, labB, dia);
    var nA = N.numerosMetodo(labA, per), nB = N.numerosMetodo(labB, per);
    var j = N.faseJanela(per, dia);
    var h = '<div class="ressalva" role="note">' + esc(N.RESSALVA_PLACAR) + '</div>';
    h += '<section class="placar-tela"><h1>Placar A×B</h1>';
    h += '<p>Medido em <strong>' + N.fmtData(dia) + '</strong> · período: ' + esc(N.textoPeriodo(per)) + '.<br>';
    h += 'Início do teste: ' + (per.inicio ? N.fmtData(per.inicio) + ' (' + esc(per.fonteInicio) + ') · janela 1: ' + N.fmtData(per.j1) + ' · janela 2: ' + N.fmtData(per.j2) : 'não definido — registre a primeira sessão no Laboratório B ou defina a data em <a href="#/B/config">Configurações do B</a>') + '.</p>';

    h += '<h2>Janela</h2>';
    if (j.fase === 'sem_inicio') h += alerta('info', 'O teste ainda não começou.');
    else if (j.fase === 'antes_j1') h += alerta('info', 'Antes da janela 1: faltam ' + j.faltam + ' dia(s) para ' + N.fmtData(per.j1) + '.');
    else if (j.fase === 'j1') {
      var tp = N.testeDePe(labB, per);
      h += alerta(tp.ok ? 'verde' : 'amarelo', '<strong>Janela 1 — o teste está de pé? ' + (tp.ok ? 'SIM' : 'NÃO') + '</strong><ul>' +
        '<li>B com minutos registrados: ' + (tp.minutosB > 0 ? 'sim' : 'não') + ' (' + tp.minutosB + ' min de estudo no período)</li>' +
        '<li>Caixas funcionando: ' + (tp.itensCaixas > 0 && tp.revisoesCaixas > 0 ? 'sim' : 'não') + ' (' + tp.itensCaixas + ' linha(s) nas caixas; ' + tp.revisoesCaixas + ' revisão(ões) registradas)</li></ul>' +
        'Nenhum vencedor é declarado na janela 1. Faltam ' + j.faltam + ' dia(s) para a janela 2.');
    } else h += alerta('verde', 'Janela 2 alcançada (8 semanas): os cinco números de cada método estão abaixo, com denominador.');

    h += '<h2>Veredito</h2>';
    if (j.fase !== 'j2') h += '<div class="veredito bloqueado">Veredito bloqueado: ' + esc(N.FRASE_BLOQUEIO) + '.</div>';
    else {
      var v = N.veredito(nA, nB);
      h += '<div class="veredito ' + v.tipo + '"><strong>' + esc(v.texto) + '</strong>' + (v.textoCusto ? '<br>' + esc(v.textoCusto) : '') + '</div>';
      h += '<p class="suave">Ponto por hora: ' + vencedorTexto(v.pph) + ' à frente · Retenção aos 21 dias: ' + vencedorTexto(v.retencao) + ' à frente. Um método só vence se ganhar nos dois.</p>';
    }

    h += '<h2>Os cinco números</h2>';
    h += tabela(['Métrica', 'Método A', 'Método B'], [
      ['<strong>Ponto por hora</strong> (principal)', esc(N.textoPph(nA.pph.pontos, nA.pph.minutos, nA.pph.valor)), esc(N.textoPph(nB.pph.pontos, nB.pph.minutos, nB.pph.valor))],
      ['Retenção aos 21 dias<br><span class="suave">acerto com CH conta como erro</span>', esc(N.textoRetencao(nA.retencao)), esc(N.textoRetencao(nB.retencao))],
      ['Não informado<br><span class="suave">registros antigos, fora da retenção</span>', esc(N.textoNaoInformado(nA)), esc(N.textoNaoInformado(nB))],
      ['Migração da causa do erro<br><span class="suave">leitura + distrator em proporção a "não sabia"</span>', esc(N.textoMigracao(nA.migracao)), esc(N.textoMigracao(nB.migracao))],
      ['Discriminação entre vizinhos', N.fmtPct(nA.vizinhos.acertos, nA.vizinhos.total), N.fmtPct(nB.vizinhos.acertos, nB.vizinhos.total)],
      ['Custo de operação', nA.custo.total + ' min ÷ ' + nA.custo.nSemanas + ' sem. = ' + N.fmtNum(nA.custo.media, 1) + ' min/semana', nB.custo.total + ' min ÷ ' + nB.custo.nSemanas + ' sem. = ' + N.fmtNum(nB.custo.media, 1) + ' min/semana']
    ], 'cinco');

    var lado = N.pphLadoALado(nA.pph, nB.pph);
    h += '<h2 id="titulo-pph-assunto">Ponto por hora por assunto — A e B lado a lado</h2>';
    h += '<p class="suave">Pontos ganhos no simulado naquele assunto ÷ horas de estudo registradas naquele assunto no mesmo período. Assuntos casados pelo nome. A última linha é a soma dos assuntos medidos, usada no veredito.</p>';
    h += '<div id="pph-por-assunto">' + (lado.length ? tabela(['Assunto', 'Método A', 'Método B'], lado.map(function (r) {
      return [esc(r.assunto), esc(N.textoPphLinha(r.a)), esc(N.textoPphLinha(r.b))];
    }).concat([['<strong>Total dos assuntos medidos (veredito)</strong>', '<strong>' + esc(N.textoPph(nA.pph.pontos, nA.pph.minutos, nA.pph.valor)) + '</strong>', '<strong>' + esc(N.textoPph(nB.pph.pontos, nB.pph.minutos, nB.pph.valor)) + '</strong>']]), 'lado-a-lado') : '<p>Nada registrado no período.</p>') + '</div>';

    h += '<div class="acoes"><button type="button" class="primario" data-acao="baixar-placar">Placar A×B (.md)</button></div>';

    [['A', nA], ['B', nB]].forEach(function (par) {
      var n = par[1], L = par[0];
      h += '<details class="cartao detalhe-metodo lab-' + L.toLowerCase() + '"><summary>Detalhes — Método ' + L + '</summary>';
      h += '<h3>Ponto por hora, por assunto</h3>' + (n.pph.linhas.length ? tabela(['Assunto', 'Pontos no simulado', 'Minutos de estudo', 'Ponto por hora'], n.pph.linhas.map(function (l) {
        return [esc(l.assunto), N.fmtNum(l.pontos), l.minutos, l.valor == null ? '<span class="suave">sem medição (' + esc(l.motivo) + ')</span>' : N.fmtNum(l.pontos) + ' ÷ ' + N.fmtNum(l.minutos / 60) + ' h = <strong>' + N.fmtNum(l.valor) + ' pts/h</strong>'];
      })) : '<p>Nada registrado no período.</p>');
      h += '<h3>Retenção aos 21 dias</h3>' + (n.retencao.linhas.length ? tabela(['Assunto', 'Primeiro contato', 'Acertos em questão nova (21+ dias)'], n.retencao.linhas.map(function (l) {
        return [esc(l.assunto), N.fmtData(l.primeiro), esc(N.textoRetencao(l))];
      })) : '<p>Nenhuma questão nova feita 21 dias ou mais depois do primeiro contato com o assunto.</p>');
      h += '<h3>Migração da causa do erro, por semana</h3>' + (n.migracao.semanas.length ? tabela(['Semana'].concat(N.CAUSAS.map(function (c) { return esc(c.nome); })).concat(['leitura + distrator / (leitura + distrator + não sabia)']), n.migracao.semanas.map(function (s) {
        return ['sem. ' + s.semana + '<br><span class="suave">' + N.fmtData(s.ini) + '–' + N.fmtData(s.fim) + '</span>'].concat(N.CAUSAS.map(function (c) { return N.fmtPct(s.cont[c.id], s.total); })).concat([N.fmtPct(s.leituraDistrator, s.base)]);
      })) + '<p><strong>Tendência:</strong> ' + esc(N.textoMigracao(n.migracao)) + '</p>' : '<p>Nenhum erro no período.</p>');
      h += '<h3>Discriminação entre vizinhos, por semana</h3>' + (n.vizinhos.semanas.length ? tabela(['Semana', 'Acertos'], n.vizinhos.semanas.map(function (s) {
        return ['sem. ' + s.semana + ' (' + N.fmtData(s.ini) + '–' + N.fmtData(s.fim) + ')', N.fmtPct(s.acertos, s.total)];
      })) : '<p>Nenhuma questão marcada com par vizinho no período.</p>');
      h += '<h3>Custo de operação, por semana</h3>' + (n.custo.semanas.length ? tabela(['Semana', 'Minutos operando'], n.custo.semanas.map(function (s) {
        return ['sem. ' + s.semana + ' (' + N.fmtData(s.ini) + '–' + N.fmtData(s.fim) + ')', s.minutos];
      })) : '<p>Nenhum minuto de operação registrado no período.</p>');
      h += '</details>';
    });
    return h + '</section>';
  }

  /* ---------------------------------------------------------------
   * Backup
   * ------------------------------------------------------------- */

  function telaBackup() {
    var h = '<h1>Backup</h1>';
    h += alerta('amarelo', '<strong>Os dados ficam só neste navegador.</strong> Limpar os dados do navegador (histórico, cookies e dados de sites), usar aba anônima ou trocar de aparelho apaga tudo o que não foi exportado. Exporte o backup com frequência e guarde no Drive.');
    if (!D.persistente()) h += alerta('vermelho', 'Este navegador não está deixando gravar dados: o que você lançar agora some ao fechar a página.');
    h += '<div class="cartao"><h2>Exportar backup completo</h2><p>Um arquivo .json com os dois laboratórios, separados, e as configurações.</p>';
    h += '<button type="button" class="primario" data-acao="baixar-backup">Backup completo (.json)</button></div>';
    h += '<div class="cartao"><h2>Importar backup</h2><p>Importar <strong>substitui todos os dados atuais</strong> dos dois laboratórios pelos do arquivo. Você vai confirmar antes.</p>';
    h += '<label>Arquivo de backup (.json)<input type="file" accept=".json,application/json" data-importar></label></div>';
    return h;
  }

  /* ---------------------------------------------------------------
   * Ações (cliques)
   * ------------------------------------------------------------- */

  function labDoElemento(el) {
    var s = el.closest('[data-lab]');
    return s ? s.getAttribute('data-lab') : null;
  }

  function mutar(L, fn) {
    var lab = D.lab(L);
    var r = fn(lab);
    D.salvarLab(lab);
    return r;
  }

  var acoes = {
    copiar: function (el) {
      var alvo = document.getElementById(el.getAttribute('data-alvo'));
      if (alvo) copiar(alvo.value, el);
    },

    'rasc-recomecar': function (el, L) {
      mutar(L, function (lab) { var c = concursoPorId(lab, lab.rascunho.concursoId); lab.rascunho = novoRascunho(c); });
      render(true);
    },

    'rasc-aplicar': function (el, L) {
      var tipo = el.getAttribute('data-tipo');
      var msg = mutar(L, function (lab) {
        var r = lab.rascunho, conc = concursoPorId(lab, r.concursoId);
        var lido = N.lerSequencia(tipo === 'gabarito' ? r.gabTexto : r.marcTexto, conc.numAlternativas, tipo);
        var total = r.questoes.length;
        if (lido.invalidos.length) return { erro: 'Caracteres não reconhecidos: ' + lido.invalidos.slice(0, 10).join(' ') + '. Use só ' + N.letrasDe(conc.numAlternativas).join('') + (tipo === 'gabarito' ? ' e * (anulada).' : ' e - (em branco).') };
        if (lido.valores.length !== total) return { erro: 'A sequência tem ' + lido.valores.length + ' posições e o concurso tem ' + total + ' questões. Confira e cole de novo.' };
        r.questoes.forEach(function (q, i) {
          var v = lido.valores[i];
          if (tipo === 'gabarito') { if (v === '*') { q.anulada = true; q.gabarito = ''; } else { q.anulada = false; q.gabarito = v; } }
          else q.marcada = v;
        });
        return { ok: (tipo === 'gabarito' ? 'Gabarito' : 'Marcações') + ' aplicado(as) nas ' + total + ' questões.' };
      });
      if (msg.erro) avisar('erro', msg.erro); else avisar('ok', msg.ok);
      render(true);
    },

    'rasc-massa': function (el, L) {
      var tipo = el.getAttribute('data-tipo');
      mutar(L, function (lab) {
        lab.rascunho.questoes.forEach(function (q) {
          if (q.anulada || !q.marcada) return;
          if (tipo === 'confC' && !q.confianca) q.confianca = 'C';
          if (tipo === 'elimSim') q.eliminacao = true;
          if (tipo === 'elimNao') q.eliminacao = false;
        });
      });
      render(true);
    },

    'rasc-salvar': function (el, L) {
      var lab = D.lab(L), r = lab.rascunho, conc = r && concursoPorId(lab, r.concursoId);
      if (!conc) return;
      var R = N.regrasDoConcurso(conc);
      var rr = { data: r.data, minutos: N.lerNumero(r.minutos), questoes: r.questoes };
      var p = N.bloqueiosLancamento(conc).concat(N.pendenciasSimulado(rr, R));
      if (p.length) {
        T.pendencias = p;
        var alvo = document.getElementById('lista-pendencias');
        if (alvo) { alvo.innerHTML = htmlPendencias(); alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        return;
      }
      T.pendencias = null;
      var sim = {
        id: D.novoId('sim'), concursoId: conc.id, data: r.data, minutos: rr.minutos, regras: R,
        questoes: r.questoes.map(function (q) {
          var c = N.classificar(q);
          return { n: q.n, bloco: q.bloco, gabarito: q.anulada ? '' : q.gabarito, anulada: !!q.anulada, justificativa: q.anulada ? String(q.justificativa).trim() : '',
            marcada: q.anulada ? '' : q.marcada, assunto: q.anulada ? '' : q.assunto, confianca: q.anulada || !q.marcada ? '' : q.confianca,
            eliminacao: !q.anulada && !!q.marcada && !!q.eliminacao, par: q.anulada ? '' : q.par, causa: N.ehErro(c) ? q.causa : '' };
        }),
        criadoEm: D.agora()
      };
      lab.simulados.push(sim);
      lab.rascunho = null;
      D.salvarLab(lab);
      avisar('ok', 'Simulado corrigido e salvo. Leve as linhas abaixo para o Drive (' + LABS[L].drive + ').');
      location.hash = '#/' + L + '/simulado/' + encodeURIComponent(sim.id);
    },

    'rasc-descartar': function (el, L) {
      if (!confirm('Descartar o rascunho deste simulado? O que foi preenchido será apagado.')) return;
      mutar(L, function (lab) { lab.rascunho = null; });
      T.pendencias = null;
      render(true);
    },

    'baixar-simulado': function (el, L) {
      var lab = D.lab(L), id = el.getAttribute('data-id');
      lab.simulados.forEach(function (s) { if (s.id === id) baixar(N.nomeArquivoSimulado(s, L), N.mdSimulado(lab, s), 'text/markdown;charset=utf-8'); });
    },

    'excluir-simulado': function (el, L) {
      if (!confirm('Excluir este simulado? As revisões geradas pelos erros dele também somem. Não dá para desfazer.')) return;
      var id = el.getAttribute('data-id');
      mutar(L, function (lab) {
        lab.simulados = lab.simulados.filter(function (s) { return s.id !== id; });
        if (L === 'A') lab.revisoes = lab.revisoes.filter(function (r) { return r.itemId.indexOf(id + ':') !== 0; });
      });
      avisar('ok', 'Simulado excluído.');
      location.hash = '#/' + L + '/simulados';
    },

    'sess-add-item': function (el, L) {
      mutar(L, function (lab) { lab.rascunhoSessao = lab.rascunhoSessao || novaSessao(lab); lab.rascunhoSessao.itens.push(novoItemSessao()); });
      rerenderFormSessao(L);
    },

    'sess-remover-item': function (el, L) {
      var i = +el.getAttribute('data-i');
      mutar(L, function (lab) { lab.rascunhoSessao.itens.splice(i, 1); });
      rerenderFormSessao(L);
    },

    'sess-limpar': function (el, L) {
      if (!confirm('Limpar o formulário da sessão?')) return;
      mutar(L, function (lab) { lab.rascunhoSessao = null; });
      rerenderFormSessao(L);
    },

    'sess-salvar': function (el, L) {
      var lab = D.lab(L), s = lab.rascunhoSessao || novaSessao(lab), erros = [];
      var conc = concursoPorId(lab, s.concursoId);
      if (!N.dataValida(s.data)) erros.push('Informe a data.');
      if (!conc) erros.push('Escolha o concurso.');
      if (!s.itens.length) erros.push('Inclua pelo menos um assunto.');
      var itens = s.itens.map(function (it, i) {
        var r = 'Assunto ' + (i + 1) + ': ';
        var m = N.lerNumero(it.minutos), q = N.lerNumero(it.questoes), a = N.lerNumero(it.acertos);
        var ch = N.lerNumero(it.acertosCH), se = N.lerNumero(it.acertosSemElim);
        if (!String(it.assunto).trim()) erros.push(r + 'informe o assunto/linha.');
        if (!N.inteiroPositivo(m)) erros.push(r + 'informe os minutos (sem minutos a sessão não pode ser salva).');
        if (!N.inteiroNaoNegativo(q)) erros.push(r + 'informe quantas questões fez (0 se nenhuma).');
        if (!N.inteiroNaoNegativo(a)) erros.push(r + 'informe os acertos (0 se nenhum).');
        else if (N.inteiroNaoNegativo(q) && a > q) erros.push(r + 'acertos maiores que questões.');
        N.pendenciasAcertosSessao(a, ch, se).forEach(function (x) { erros.push(r + x); });
        ajustarErros(it);
        it.erros.forEach(function (e, j) {
          if (!e.confianca) erros.push(r + 'erro ' + (j + 1) + ' sem confiança.');
          if (!N.causaPorId(e.causa)) erros.push(r + 'erro ' + (j + 1) + ' sem causa.');
        });
        var assunto = String(it.assunto).trim(), bloco = '';
        if (conc) conc.blocos.forEach(function (b) { if (b.nome === assunto || (b.assuntos || []).indexOf(assunto) >= 0) bloco = bloco || b.nome; });
        return { assunto: assunto, bloco: bloco, minutos: m, questoes: q, acertos: a, acertosCH: ch, acertosSemElim: se,
          erros: it.erros.map(function (e) { return { confianca: e.confianca, causa: e.causa, marcou: String(e.marcou || '').trim().toUpperCase(), gabarito: String(e.gabarito || '').trim().toUpperCase() }; }) };
      });
      if (erros.length) { avisar('erro', 'Sessão não salva: ' + erros.join(' ')); render(true); return; }
      lab.sessoes.push({ id: D.novoId('ses'), data: s.data, concursoId: conc.id, concursoNome: conc.nome, alvo: conc.alvo || conc.nome, itens: itens, criadoEm: D.agora() });
      lab.rascunhoSessao = null;
      D.salvarLab(lab);
      var nErros = 0; itens.forEach(function (it) { nErros += it.erros.length; });
      avisar('ok', 'Sessão salva.' + (nErros ? ' ' + nErros + ' erro(s) ' + (L === 'A' ? 'viraram itens de revisão D0/D2/D7/D21.' : 'levaram as linhas para a caixa 1.') : ''));
      render(true);
    },

    'excluir-sessao': function (el, L) {
      if (!confirm('Excluir esta sessão? Os minutos e erros dela saem das contas.')) return;
      var id = el.getAttribute('data-id');
      mutar(L, function (lab) {
        lab.sessoes = lab.sessoes.filter(function (s) { return s.id !== id; });
        if (L === 'A') lab.revisoes = lab.revisoes.filter(function (r) { return r.itemId.indexOf(id + ':') !== 0; });
      });
      avisar('ok', 'Sessão excluída.');
      render(true);
    },

    'excluir-operacao': function (el, L) {
      var id = el.getAttribute('data-id');
      mutar(L, function (lab) { lab.operacao = lab.operacao.filter(function (o) { return o.id !== id; }); });
      render(true);
    },

    'baixar-estado': function (el, L) {
      var lab = D.lab(L), dia = N.hoje();
      // O período do placar só precisa da data de início (não lê dados do outro laboratório nesta exportação).
      var g = D.geral();
      var inicio = g.primeiraSessaoB || (L === 'B' ? N.primeiraSessao(lab) : N.primeiraSessao(D.lab('B')));
      var per = N.periodoPlacar({ primeiraSessaoB: inicio || '' }, L === 'A' ? lab : { sessoes: [] }, L === 'B' ? lab : { sessoes: [] }, dia);
      baixar(dia + '_estado_Lab' + L + '.md', N.mdEstadoLab(lab, per, dia), 'text/markdown;charset=utf-8');
    },

    'baixar-csv': function (el, L) {
      baixar(N.hoje() + '_planilha_Lab' + L + '.csv', '﻿' + N.csvLab(D.lab(L)), 'text/csv;charset=utf-8');
    },

    'baixar-placar': function () {
      var dia = N.hoje();
      baixar(dia + '_placar_AxB.md', N.mdPlacar(D.lab('A'), D.lab('B'), D.geral(), dia), 'text/markdown;charset=utf-8');
    },

    'baixar-backup': function () {
      baixar(N.hoje() + '_backup_corretor_AxB.json', JSON.stringify(D.exportarBackup(), null, 2), 'application/json');
    },

    'conc-novo': function (el, L) { T.concEdit[L] = paraEdicao(null, L); render(true); },
    'conc-editar': function (el, L) {
      var c = concursoPorId(D.lab(L), el.getAttribute('data-id'));
      T.concEdit[L] = paraEdicao(c, L); render(true);
    },
    'conc-cancelar': function (el, L) { T.concEdit[L] = null; render(true); },
    'conc-add-bloco': function (el, L) {
      T.concEdit[L].blocos.push({ nome: '', numQuestoes: '', pontosPorQuestao: '', assuntosTexto: '', minimoAcertos: '' });
      render(true);
    },
    'conc-remover-bloco': function (el, L) {
      var i = +el.getAttribute('data-i'), e = T.concEdit[L];
      e.blocos.splice(i, 1);
      // os grupos guardam o número do bloco: tira o removido e renumera os seguintes
      (e.grupos || []).forEach(function (g) {
        g.blocos = g.blocos.filter(function (x) { return x !== i; }).map(function (x) { return x > i ? x - 1 : x; });
      });
      render(true);
    },
    'conc-add-grupo': function (el, L) {
      var e = T.concEdit[L];
      e.grupos = e.grupos || [];
      e.grupos.push({ nome: '', blocos: [], minimoAcertos: '' });
      render(true);
    },
    'conc-remover-grupo': function (el, L) {
      T.concEdit[L].grupos.splice(+el.getAttribute('data-i'), 1);
      render(true);
    },
    'conc-excluir': function (el, L) {
      var e = T.concEdit[L];
      if (!confirm('Excluir o concurso ' + e.nome + '? Simulados já lançados continuam guardados com uma cópia das regras.')) return;
      mutar(L, function (lab) {
        lab.concursos = lab.concursos.filter(function (c) { return c.id !== e.id; });
        if (lab.rascunho && lab.rascunho.concursoId === e.id) lab.rascunho = null;
      });
      T.concEdit[L] = null;
      avisar('ok', 'Concurso excluído.');
      render(true);
    },
    'conc-salvar': function (el, L) {
      var e = T.concEdit[L], erros = [];
      if (!e.nome.trim()) erros.push('Informe o nome.');
      if (e.dataProva && !N.dataValida(e.dataProva)) erros.push('Data da prova inválida.');
      var alt = N.lerNumero(e.numAlternativas);
      if (alt != null && !(N.inteiroPositivo(alt) && alt >= 2 && alt <= 10)) erros.push('Número de alternativas deve ser um inteiro de 2 a 10.');
      var min = N.lerNumero(e.minimoPontos), meta = N.lerNumero(e.meta);
      if (min != null && (isNaN(min) || min < 0)) erros.push('Pontuação mínima inválida.');
      if (meta != null && (isNaN(meta) || meta < 0)) erros.push('Meta inválida.');
      var blocos = e.blocos.map(function (b, i) {
        var nq = N.lerNumero(b.numQuestoes), pp = N.lerNumero(b.pontosPorQuestao);
        if (!b.nome.trim()) erros.push('Bloco ' + (i + 1) + ': informe o nome.');
        if (!N.inteiroPositivo(nq)) erros.push('Bloco ' + (i + 1) + ': número de questões inválido.');
        if (!(pp > 0)) erros.push('Bloco ' + (i + 1) + ': pontos por questão inválidos.');
        var mb = N.lerNumero(b.minimoAcertos);
        if (mb != null && !(N.inteiroNaoNegativo(mb) && (!N.inteiroPositivo(nq) || mb <= nq))) erros.push('Bloco ' + (i + 1) + ': mínimo de acertos deve ser um inteiro entre 0 e o número de questões.');
        var vistos = {};
        return { nome: b.nome.trim(), numQuestoes: nq, pontosPorQuestao: pp,
          assuntos: String(b.assuntosTexto || '').split('\n').map(function (s) { return s.trim(); }).filter(function (s) { if (!s || vistos[s]) return false; vistos[s] = true; return true; }),
          minimoAcertos: mb };
      });
      var grupos = (e.grupos || []).map(function (g, gi) {
        var r = 'Grupo ' + (gi + 1) + ': ', mg = N.lerNumero(g.minimoAcertos), soma = 0;
        g.blocos.forEach(function (i) { soma += blocos[i] && N.inteiroPositivo(blocos[i].numQuestoes) ? blocos[i].numQuestoes : 0; });
        if (!String(g.nome).trim()) erros.push(r + 'informe o nome.');
        if (!g.blocos.length) erros.push(r + 'escolha os blocos que o compõem.');
        if (!(N.inteiroNaoNegativo(mg) && mg <= soma)) erros.push(r + 'mínimo de acertos deve ser um inteiro entre 0 e o total de questões dos blocos escolhidos.');
        return { nome: String(g.nome).trim(), blocos: g.blocos.slice().sort(function (a, b) { return a - b; }), minimoAcertos: mg };
      });
      if (erros.length) { avisar('erro', 'Concurso não salvo: ' + erros.join(' ')); render(true); return; }
      mutar(L, function (lab) {
        var obj = { id: e.id || D.novoId('conc'), nome: e.nome.trim(), lab: L, banca: e.banca.trim(), dataProva: e.dataProva || '',
          numAlternativas: alt, minimoPontos: min, zeroElimina: e.zeroElimina === 'sim' ? true : e.zeroElimina === 'nao' ? false : null,
          meta: meta, alvo: L === 'A' ? (e.alvo.trim() || e.nome.trim().toUpperCase()) : '', blocos: blocos, grupos: grupos };
        var achou = false;
        lab.concursos = lab.concursos.map(function (c) { if (c.id === obj.id) { achou = true; return obj; } return c; });
        if (!achou) lab.concursos.push(obj);
      });
      T.concEdit[L] = null;
      avisar('ok', 'Concurso salvo.');
      render(true);
    },

    'edital-carregar': function (el, L) {
      if (!confirm('Carregar o cadastro dos editais em ' + (L === 'A' ? 'SEDUC/CE e Cruzeta/RN' : 'Jucurutu/RN') + '?\n\nSimulados, sessões, revisões e caixas já registrados não mudam.')) return;
      var plano = D.planoEditais(D.lab(L));
      if (!plano.some(function (p) { return p.mudancas.length; })) { avisar('ok', 'O cadastro dos editais já está carregado: nada muda.'); render(true); return; }
      if (plano.some(function (p) { return p.editado && p.mudancas.length; })) {
        T.planoEdital[L] = plano; render(true);
        var alvo = document.getElementById('editais'); if (alvo) alvo.scrollIntoView({ block: 'start' });
        return;
      }
      aplicarEditais(L);
    },
    'edital-aplicar': function (el, L) { aplicarEditais(L); },
    'edital-cancelar': function (el, L) { T.planoEdital[L] = null; avisar('ok', 'Nada foi carregado.'); render(true); },

    'config-padrao': function (el, L) {
      mutar(L, function (lab) { lab.config = JSON.parse(JSON.stringify(N.CONFIG_PADRAO[L])); });
      avisar('ok', 'Configuração padrão restaurada.');
      render(true);
    }
  };

  function aplicarEditais(L) {
    var mudou = mutar(L, function (lab) {
      var plano = D.planoEditais(lab); // refeito na hora, sobre o cadastro atual
      D.aplicarPlanoEditais(lab, plano);
      return plano.filter(function (p) { return p.mudancas.length; }).map(function (p) { return p.nome; });
    });
    T.planoEdital[L] = null; T.concEdit[L] = null;
    avisar('ok', mudou.length ? 'Cadastro dos editais carregado: ' + mudou.join(', ') + '. Simulados, sessões, revisões e caixas não foram alterados.' : 'O cadastro dos editais já está carregado: nada muda.');
    render(true);
  }

  /* ---------------------------------------------------------------
   * Formulários (submit)
   * ------------------------------------------------------------- */

  function valorRadio(form, nome) {
    var el = form.querySelector('input[name="' + nome + '"]:checked');
    return el ? el.value : '';
  }

  var formularios = {
    operacao: function (form, L) {
      var data = form.data.value, m = N.lerNumero(form.minutos.value);
      if (!N.dataValida(data) || !N.inteiroPositivo(m)) { avisar('erro', 'Informe a data e os minutos (inteiro maior que zero).'); render(true); return; }
      mutar(L, function (lab) { lab.operacao.push({ id: D.novoId('op'), data: data, minutos: m, nota: form.nota.value.trim(), criadoEm: D.agora() }); });
      avisar('ok', m + ' minuto(s) de operação registrados em ' + N.fmtData(data) + '.');
      render(true);
    },

    'revisao-a': function (form, L) {
      var lab = D.lab(L), id = form.getAttribute('data-item'), dia = N.hoje();
      var est = null;
      N.estadoRevisoesA(lab).forEach(function (e) { if (e.item.id === id) est = e; });
      if (!est || !est.proxima) return;
      var etapa = est.proxima, data = form.data.value, res = valorRadio(form, 'resultado');
      var nova = form.nova ? form.nova.checked : false, causa = form.causa.value;
      var conf = form.confianca.value, elim = valorRadio(form, 'elim');
      var erro = null;
      if (!N.dataValida(data)) erro = 'Informe a data da revisão.';
      else if (data > dia) erro = 'A data da revisão não pode ser no futuro.';
      else if (data < etapa.data) erro = etapa.nome + ' está prevista para ' + N.fmtData(etapa.data) + ': a data da revisão não pode ser anterior.';
      else if (!res) erro = 'Marque se acertou ou errou.';
      else if (res === 'acertou' && etapa.nome !== 'D0' && !nova) erro = 'Acerto no ' + etapa.nome + ' só vale em ' + (etapa.nome === 'D2' ? 'item novo ou estruturalmente diferente' : 'questão nova') + '. Faça uma e registre de novo.';
      else if (res === 'acertou' && !conf) erro = 'Acertou: escolha a confiança (C, D ou CH).';
      else if (res === 'acertou' && !elim) erro = 'Acertou: diga se fez eliminação escrita (sim ou não).';
      else if (res === 'errou' && !N.causaPorId(causa)) erro = 'Errou: escolha a causa.';
      if (erro) { avisar('erro', erro); render(true); return; }
      lab.revisoes.push({ id: D.novoId('rev'), itemId: id, etapa: etapa.nome, ciclo: est.numCiclo, data: data, resultado: res,
        questaoNova: etapa.nome === 'D0' ? false : nova, confianca: res === 'acertou' ? conf : '', eliminacao: res === 'acertou' ? elim === 'sim' : null,
        causa: res === 'errou' ? causa : '', criadoEm: D.agora() });
      D.salvarLab(lab);
      var depois = null;
      N.estadoRevisoesA(lab).forEach(function (e) { if (e.item.id === id) depois = e; });
      var msg = etapa.nome + ' registrado (' + res + ').';
      if (depois.fechado) msg += ' Erro FECHADO: D21 acertado em questão nova.';
      else if (etapa.nome === 'D21' && res === 'acertou' && conf === 'CH') msg += ' Acerto com chute (CH) no D21 não fecha o erro: o D21 continua pendente; refaça em questão nova.';
      else if (depois.numCiclo > est.numCiclo) msg += ' Novo ciclo aberto com D0 em ' + N.fmtData(depois.cicloAtual.inicio) + '.';
      else msg += ' Próxima: ' + depois.proxima.nome + ' em ' + N.fmtData(depois.proxima.data) + '.';
      avisar('ok', msg + ' Atualize a linha no CADERNO_DE_ERROS.');
      render(true);
    },

    'revisao-b': function (form, L) {
      var lab = D.lab(L), linha = form.getAttribute('data-linha'), dia = N.hoje();
      var est = null;
      N.estadoCaixasB(lab).forEach(function (s) { if (s.linha === linha) est = s; });
      if (!est) return;
      var data = form.data.value, res = valorRadio(form, 'resultado'), conf = form.confianca.value, causa = form.causa.value, elim = valorRadio(form, 'elim');
      var erro = null;
      if (!N.dataValida(data)) erro = 'Informe a data da revisão.';
      else if (data > dia) erro = 'A data da revisão não pode ser no futuro.';
      else if (data < est.proxima) erro = 'A revisão está prevista para ' + N.fmtData(est.proxima) + ': a data não pode ser anterior.';
      else if (!res) erro = 'Marque se acertou ou errou.';
      else if (res === 'acertou' && !conf) erro = 'Acertou: escolha a confiança (C, D ou CH).';
      else if (res === 'acertou' && !elim) erro = 'Acertou: diga se fez eliminação escrita (sim ou não).';
      else if (res === 'errou' && !N.causaPorId(causa)) erro = 'Errou: escolha a causa.';
      if (erro) { avisar('erro', erro); render(true); return; }
      lab.revisoes.push({ id: D.novoId('rev'), linha: linha, data: data, resultado: res, confianca: res === 'acertou' ? conf : '', eliminacao: res === 'acertou' ? elim === 'sim' : null,
        causa: res === 'errou' ? causa : '', questaoNova: true, caixaAntes: est.caixa, criadoEm: D.agora() });
      D.salvarLab(lab);
      var depois = null;
      N.estadoCaixasB(lab).forEach(function (s) { if (s.linha === linha) depois = s; });
      avisar('ok', linha + ': caixa ' + est.caixa + ' → ' + depois.caixa + (res === 'acertou' && conf === 'CH' ? ' (acerto com chute não sobe)' : '') + '. Próxima revisão em ' + N.fmtData(depois.proxima) + '. Leve o registro para o 11_ESTADO_B.');
      render(true);
    },

    'entrada-b': function (form, L) {
      var linha = form.linha.value.trim();
      if (!linha) { avisar('erro', 'Informe a linha.'); render(true); return; }
      var ja = N.estadoCaixasB(D.lab(L)).some(function (s) { return s.linha === linha; });
      if (ja) { avisar('erro', linha + ' já está nas caixas.'); render(true); return; }
      mutar(L, function (lab) { lab.entradasCaixas = lab.entradasCaixas || []; lab.entradasCaixas.push({ id: D.novoId('ent'), linha: linha, data: N.hoje(), criadoEm: D.agora() }); });
      avisar('ok', linha + ' colocada na caixa 1.');
      render(true);
    },

    pares: function (form, L) {
      var vistos = {};
      var lista = form.pares.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { if (!s || vistos[s]) return false; vistos[s] = true; return true; });
      mutar(L, function (lab) { lab.pares = lista; });
      avisar('ok', lista.length + ' par(es) vizinho(s) salvo(s).');
      render(true);
    },

    'config-a': function (form, L) {
      var ints = [0, 1, 2, 3].map(function (i) { return N.lerNumero(form['int' + i].value); });
      var ok = ints.every(N.inteiroNaoNegativo) && ints[0] <= ints[1] && ints[1] <= ints[2] && ints[2] <= ints[3];
      if (!ok) { avisar('erro', 'Intervalos inválidos: use inteiros a partir de 0, em ordem crescente.'); render(true); return; }
      mutar(L, function (lab) { lab.config = { intervalos: ints, novoCicloAoErrar: form.novoCiclo.checked }; });
      avisar('ok', 'Configuração salva. As datas de revisão foram recalculadas.');
      render(true);
    },

    'config-b': function (form, L) {
      var cx = [0, 1, 2, 3, 4].map(function (i) { return N.lerNumero(form['cx' + i].value); });
      var ok = cx.every(N.inteiroPositivo) && cx.every(function (v, i) { return i === 0 || v >= cx[i - 1]; });
      if (!ok) { avisar('erro', 'Caixas inválidas: use inteiros maiores que zero, em ordem crescente.'); render(true); return; }
      mutar(L, function (lab) { lab.config = { caixas: cx }; });
      avisar('ok', 'Caixas salvas. As datas foram recalculadas.');
      render(true);
    },

    'config-inicio': function (form) {
      var v = form.inicio.value;
      if (v && !N.dataValida(v)) { avisar('erro', 'Data inválida.'); render(true); return; }
      var g = D.geral(); g.primeiraSessaoB = v || ''; D.salvarGeral(g);
      avisar('ok', v ? 'Início do teste definido em ' + N.fmtData(v) + '.' : 'Início do teste volta a ser a primeira sessão de B registrada.');
      render(true);
    }
  };

  /* ---------------------------------------------------------------
   * Campos que mudam enquanto se digita/escolhe
   * ------------------------------------------------------------- */

  function atualizarRascunhoQuestao(el, L) {
    var box = el.closest('[data-q]'), i = +box.getAttribute('data-q'), campo = el.getAttribute('data-q-campo');
    var lab = D.lab(L), r = lab.rascunho, q = r.questoes[i];
    var conc = concursoPorId(lab, r.concursoId), R = N.regrasDoConcurso(conc);
    if (campo === 'gabarito') {
      if (el.value === '*') { q.anulada = true; q.gabarito = ''; } else { q.anulada = false; q.gabarito = el.value; }
    } else if (campo === 'eliminacao') q.eliminacao = el.checked;
    else q[campo] = el.value;
    D.salvarLab(lab);
    if (campo !== 'justificativa') {
      var tmp = document.createElement('div');
      tmp.innerHTML = htmlQuestao(q, i, R, lab.pares);
      var novo = tmp.firstChild;
      box.parentNode.replaceChild(novo, box);
      var foco = novo.querySelector('[data-q-campo="' + campo + '"]');
      if (foco) foco.focus();
    }
    var res = document.getElementById('resumo-rasc');
    if (res) res.innerHTML = htmlResumoRascunho(r, R);
    atualizarPendencias(r, R);
  }

  /** Se a lista de pendências está aberta, ela acompanha o que já foi corrigido. */
  function atualizarPendencias(r, R) {
    if (!T.pendencias) return;
    T.pendencias = N.pendenciasSimulado({ data: r.data, minutos: N.lerNumero(r.minutos), questoes: r.questoes }, R);
    var alvo = document.getElementById('lista-pendencias');
    if (alvo) alvo.innerHTML = T.pendencias.length ? htmlPendencias() : alerta('verde', 'Nenhuma pendência: pode corrigir e salvar.');
  }

  function rerenderFormSessao(L) {
    var alvo = document.getElementById('form-sessao');
    if (alvo) alvo.innerHTML = htmlFormSessao(L, D.lab(L)); else render(true);
  }

  function aoMudar(ev, tipoEvento) {
    var el = ev.target, L = labDoElemento(el);

    if (el.hasAttribute('data-q-campo')) {
      if (tipoEvento === 'input' && el.getAttribute('data-q-campo') !== 'justificativa') return;
      if (tipoEvento === 'change' && el.getAttribute('data-q-campo') === 'justificativa') return;
      atualizarRascunhoQuestao(el, L); return;
    }

    if (el.hasAttribute('data-rasc-concurso') && tipoEvento === 'change') {
      var lab = D.lab(L), id = el.value;
      if (rascunhoTemDados(lab.rascunho) && lab.rascunho.concursoId !== id && !confirm('Trocar de concurso apaga o rascunho atual. Continuar?')) { el.value = lab.rascunho.concursoId; return; }
      var c = concursoPorId(lab, id);
      lab.rascunho = c ? novoRascunho(c) : null;
      D.salvarLab(lab); T.pendencias = null; render(true); return;
    }

    if (el.hasAttribute('data-rasc')) {
      mutar(L, function (lab) { lab.rascunho[el.getAttribute('data-rasc')] = el.value; });
      if (el.getAttribute('data-rasc') === 'minutos' || el.getAttribute('data-rasc') === 'data') {
        var lb = D.lab(L), res = document.getElementById('resumo-rasc'), RR = N.regrasDoConcurso(concursoPorId(lb, lb.rascunho.concursoId));
        if (res) res.innerHTML = htmlResumoRascunho(lb.rascunho, RR);
        atualizarPendencias(lb.rascunho, RR);
      }
      return;
    }

    if (el.hasAttribute('data-sess')) {
      mutar(L, function (lab) { lab.rascunhoSessao = lab.rascunhoSessao || novaSessao(lab); lab.rascunhoSessao[el.getAttribute('data-sess')] = el.value; });
      return;
    }

    if (el.hasAttribute('data-item-campo')) {
      var i = +el.closest('[data-item]').getAttribute('data-item'), campo = el.getAttribute('data-item-campo');
      var it = mutar(L, function (lab) {
        lab.rascunhoSessao = lab.rascunhoSessao || novaSessao(lab);
        var x = lab.rascunhoSessao.itens[i];
        x[campo] = el.value;
        ajustarErros(x);
        return x;
      });
      if (campo === 'questoes' || campo === 'acertos') {
        var alvo = document.getElementById('erros-' + L + '-' + i);
        if (alvo) alvo.innerHTML = htmlErrosItem(L, it, i);
      }
      return;
    }

    if (el.hasAttribute('data-erro-campo')) {
      var ii = +el.closest('[data-item]').getAttribute('data-item'), j = +el.closest('[data-erro]').getAttribute('data-erro');
      mutar(L, function (lab) { lab.rascunhoSessao.itens[ii].erros[j][el.getAttribute('data-erro-campo')] = el.value; });
      if (el.getAttribute('data-erro-campo') === 'causa') {
        var lb2 = D.lab(L), al = document.getElementById('erros-' + L + '-' + ii);
        if (al) al.innerHTML = htmlErrosItem(L, lb2.rascunhoSessao.itens[ii], ii);
      }
      return;
    }

    if (el.hasAttribute('data-conc')) { T.concEdit[L][el.getAttribute('data-conc')] = el.value; return; }

    if (el.hasAttribute('data-bloco-campo')) {
      var bi = +el.closest('[data-bloco]').getAttribute('data-bloco');
      T.concEdit[L].blocos[bi][el.getAttribute('data-bloco-campo')] = el.value; return;
    }

    if (el.hasAttribute('data-grupo-campo')) {
      var gi = +el.closest('[data-grupo]').getAttribute('data-grupo');
      T.concEdit[L].grupos[gi][el.getAttribute('data-grupo-campo')] = el.value; return;
    }

    if (el.hasAttribute('data-grupo-bloco')) {
      var g = T.concEdit[L].grupos[+el.closest('[data-grupo]').getAttribute('data-grupo')], b = +el.getAttribute('data-grupo-bloco');
      g.blocos = g.blocos.filter(function (x) { return x !== b; });
      if (el.checked) g.blocos.push(b);
      return;
    }

    if (tipoEvento !== 'change') return;

    if (el.hasAttribute('data-filtro-a')) { T.filtroA = el.value; render(true); return; }
    if (el.hasAttribute('data-dia-drive')) { T.diaDrive[L] = el.value; render(true); return; }
    if (el.hasAttribute('data-importar')) { importar(el); return; }
  }

  function importar(input) {
    var arq = input.files && input.files[0];
    if (!arq) return;
    var leitor = new FileReader();
    leitor.onload = function () {
      var obj;
      try { obj = JSON.parse(leitor.result); } catch (e) { avisar('erro', 'O arquivo não é um JSON válido.'); render(true); return; }
      var erro = D.validarBackup(obj);
      if (erro) { avisar('erro', erro); render(true); return; }
      var msg = 'Importar o backup de ' + (obj.exportadoEm ? obj.exportadoEm.slice(0, 10).split('-').reverse().join('/') : 'data desconhecida') + '?\n\n' +
        'Laboratório A: ' + obj.labs.A.simulados.length + ' simulado(s), ' + obj.labs.A.sessoes.length + ' sessão(ões).\n' +
        'Laboratório B: ' + obj.labs.B.simulados.length + ' simulado(s), ' + obj.labs.B.sessoes.length + ' sessão(ões).\n\n' +
        'ATENÇÃO: isto SUBSTITUI todos os dados atuais deste navegador. Não dá para desfazer.';
      if (!confirm(msg)) { input.value = ''; return; }
      D.importarBackup(obj);
      T.concEdit = { A: null, B: null };
      avisar('ok', 'Backup importado. Os dados atuais foram substituídos.');
      render(true);
    };
    leitor.readAsText(arq);
  }

  /* ---------------------------------------------------------------
   * Montagem
   * ------------------------------------------------------------- */

  var raiz = null;

  function htmlAviso() {
    if (!T.aviso) return '';
    var a = T.aviso; T.aviso = null;
    return '<div class="alerta ' + (a.tipo === 'erro' ? 'vermelho' : 'verde') + ' aviso-topo" role="status">' + esc(a.texto) + '</div>';
  }

  function render(manterRolagem) {
    if (!raiz) return;
    var y = window.scrollY;
    var r = rota(location.hash);
    var aviso = htmlAviso();
    var html = htmlDaTela(location.hash);
    // aviso logo abaixo da faixa do laboratório, para ficar à vista
    raiz.innerHTML = aviso + html;
    document.querySelectorAll('nav.principal a').forEach(function (a) {
      var alvo = a.getAttribute('data-area');
      a.classList.toggle('ativo', alvo === r.area);
    });
    if (manterRolagem && !aviso) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
  }

  function iniciar() {
    raiz = document.getElementById('app');
    window.addEventListener('hashchange', function () { T.pendencias = null; render(false); });
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-acao]');
      if (!el) return;
      var f = acoes[el.getAttribute('data-acao')];
      if (f) { ev.preventDefault(); f(el, labDoElemento(el)); }
    });
    document.addEventListener('submit', function (ev) {
      var form = ev.target.closest('form[data-form]');
      if (!form) return;
      ev.preventDefault();
      var f = formularios[form.getAttribute('data-form')];
      if (f) f(form, labDoElemento(form));
    });
    document.addEventListener('change', function (ev) { aoMudar(ev, 'change'); });
    document.addEventListener('input', function (ev) {
      var el = ev.target;
      if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'date') return;
      aoMudar(ev, 'input');
    });
    render(false);
  }

  global.App = { iniciar: iniciar, htmlDaTela: htmlDaTela, rota: rota, novoRascunho: novoRascunho };
})(window);
