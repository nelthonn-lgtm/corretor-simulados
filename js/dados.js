/*
 * Corretor de Simulados A×B — armazenamento.
 * Cada laboratório fica numa chave própria do localStorage:
 *   corretorAB.v1.labA  → só dados do Método A
 *   corretorAB.v1.labB  → só dados do Método B
 *   corretorAB.v1.geral → só a data de início do placar
 */
(function (global) {
  'use strict';

  var PREFIXO = 'corretorAB.v1.';
  var APP = 'corretor-simulados-AxB';

  function backendMemoria() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }

  var backend, persistente = true;
  try {
    global.localStorage.setItem(PREFIXO + 'teste', '1');
    global.localStorage.removeItem(PREFIXO + 'teste');
    backend = global.localStorage;
  } catch (e) {
    backend = backendMemoria();
    persistente = false;
  }

  function usarBackend(b) { backend = b; }

  function labInicial(L) {
    var base = { versao: 1, lab: L, concursos: [], pares: [], simulados: [], sessoes: [], operacao: [], revisoes: [], rascunho: null, rascunhoSessao: null };
    if (L === 'A') {
      base.config = { intervalos: [0, 2, 7, 21], novoCicloAoErrar: true };
      base.concursos = [
        { id: 'seduc-ce', nome: 'SEDUC/CE', lab: 'A', banca: 'CEV/UECE', dataProva: '2026-11-22', numAlternativas: null, minimoPontos: null, zeroElimina: null, meta: null, alvo: 'CE', blocos: [] },
        { id: 'cruzeta-rn', nome: 'Cruzeta/RN', lab: 'A', banca: 'IDIB', dataProva: '2026-11-29', numAlternativas: null, minimoPontos: null, zeroElimina: null, meta: null, alvo: 'CRUZETA', blocos: [] }
      ];
    } else {
      base.config = { caixas: [1, 3, 7, 16, 35] };
      base.entradasCaixas = [];
      base.concursos = [
        { id: 'jucurutu-rn', nome: 'Jucurutu/RN', lab: 'B', banca: 'IGEDUC', dataProva: '2026-12-06', numAlternativas: 5, minimoPontos: 70, zeroElimina: true, meta: 80, alvo: '',
          blocos: [
            { nome: 'Língua Portuguesa', numQuestoes: 10, pontosPorQuestao: 1.1, assuntos: [] },
            { nome: 'Tecnologia na Educação', numQuestoes: 5, pontosPorQuestao: 1.1, assuntos: [] },
            { nome: 'Gestão Escolar', numQuestoes: 5, pontosPorQuestao: 1.1, assuntos: [] },
            { nome: 'Conhecimentos Profissionais (AEE)', numQuestoes: 15, pontosPorQuestao: 2.6, assuntos: [] },
            { nome: 'Conhecimentos Pedagógicos', numQuestoes: 15, pontosPorQuestao: 2.6,
              assuntos: ['Piaget', 'Vygotsky', 'Libâneo', 'Paulo Freire', 'Ivani Fazenda', 'Saviani', 'Emília Ferreiro', 'Jussara Hoffmann'] }
          ] }
      ];
      base.pares = ['Piaget × Vygotsky', 'Libâneo × Saviani', 'Hoffmann × avaliação classificatória', 'Ferreiro × método silábico'];
    }
    return base;
  }

  /* ---------------------------------------------------------------
   * Cadastro dos editais (botão "Carregar cadastro dos editais")
   * EM_BRANCO = o edital não traz o valor: o campo não é preenchido
   * (fica vazio, ou fica com o que o usuário já tiver digitado).
   * ------------------------------------------------------------- */

  var EM_BRANCO = { emBranco: true };

  var EDITAIS = {
    B: [
      { id: 'jucurutu-rn', modo: 'linhas', linhas: {
        "Língua Portuguesa": ["Acentuação gráfica", "Análise e interpretação de textos", "Coerência textual", "Coesão textual", "Concordância nominal", "Concordância verbal", "Emprego da crase", "Figuras de linguagem", "Ortografia oficial", "Pontuação", "Regência nominal", "Regência verbal", "Significação das palavras", "Tipos e gêneros textuais", "Uso e colocação dos pronomes"],
        "Tecnologia na Educação": ["Ambientes virtuais de aprendizagem (AVA)", "Avaliação mediada por tecnologia", "Competência digital docente", "Cultura digital na educação", "Ensino híbrido", "Ferramentas digitais educacionais", "Inclusão digital", "Metodologias ativas com tecnologia", "Plataformas educacionais digitais", "Políticas públicas de tecnologia educacional", "Recursos educacionais digitais", "Segurança e ética digital", "Tecnologias assistivas na educação", "TIC na educação", "Uso pedagógico das mídias digitais"],
        "Gestão Escolar": ["Conselho Escolar e Conselho Municipal de Educação", "CF art. 205 a 214", "ECA (Lei 8.069/1990)", "FUNDEB (Lei 14.113/2020)", "Gestão democrática do ensino público", "Gestão de patrimônio público escolar", "Lei de Acesso à Informação (Lei 12.527/2011)", "LDB (Lei 9.394/1996)", "PNE (Lei 13.005/2014)", "Regimento Escolar", "Responsabilidade administrativa do gestor"],
        "Conhecimentos Profissionais (AEE)": ["Atendimento Educacional Especializado", "Público-alvo da educação especial", "Acessibilidade e eliminação de barreiras", "Adaptação e flexibilização curricular", "Plano de AEE e estudo de caso", "Sala de recursos multifuncionais", "Tecnologia assistiva", "Comunicação alternativa e aumentativa", "Libras e educação bilíngue para surdos", "Sistema Braille e recursos táteis", "Deficiências física, intelectual, auditiva e visual", "TEA, TDAH, altas habilidades e superdotação", "Desenho Universal para a Aprendizagem", "Avaliação funcional e pedagógica", "Materiais adaptados e multissensoriais", "Autonomia e participação do estudante"],
        "Conhecimentos Pedagógicos": ["Avaliação da aprendizagem", "Currículo escolar", "Piaget", "Vygotsky", "Libâneo", "Paulo Freire", "Educação inclusiva e diversidade", "Gestão democrática da escola", "Ivani Fazenda", "Legislação educacional brasileira", "Planejamento de ensino", "Políticas públicas educacionais", "Projeto Político-Pedagógico", "Psicologia da educação", "Saviani", "Teorias da aprendizagem", "Tecnologias educacionais no ensino-aprendizagem", "Trabalho pedagógico e interdisciplinaridade", "Emília Ferreiro", "Jussara Hoffmann"]
      } }
    ],
    A: [
      { id: 'seduc-ce', modo: 'completo', dados: {
        nome: 'SEDUC/CE', banca: 'CEV/UECE', dataProva: '2026-11-22', numAlternativas: 4, minimoPontos: 40, zeroElimina: false, meta: EM_BRANCO, alvo: 'CE',
        blocos: [
          { nome: 'Educação Brasileira', numQuestoes: 8, pontosPorQuestao: 1, minimoAcertos: 3, assuntos: EM_BRANCO },
          { nome: 'Administração Pública', numQuestoes: 8, pontosPorQuestao: 1, minimoAcertos: 3, assuntos: EM_BRANCO },
          { nome: 'Língua Portuguesa', numQuestoes: 8, pontosPorQuestao: 1, minimoAcertos: 3, assuntos: EM_BRANCO },
          { nome: 'Leitura e Interpretação de Dados e Indicadores Educacionais', numQuestoes: 6, pontosPorQuestao: 1, minimoAcertos: 2, assuntos: EM_BRANCO },
          { nome: 'Conhecimentos Específicos (AEE)', numQuestoes: 50, pontosPorQuestao: 1, minimoAcertos: null,
            assuntos: ["Fundamentos legais e políticas da Educação Especial", "Educação inclusiva: fundamentos e paradigmas históricos", "Desenvolvimento humano, aprendizagem e diversidade", "Público-alvo: deficiências, TEA, altas habilidades, NEE", "AEE: conceitos, princípios, objetivos e organização", "Sala de Recursos Multifuncionais", "Prática pedagógica do professor no AEE", "PPP inclusivo e gestão da inclusão", "Currículo, avaliação e práticas inclusivas", "Plano de AEE: PAEE, PEI e PPI", "Desenho Universal para a Aprendizagem (DUA)", "Acessibilidade e Tecnologia Assistiva", "Trabalho colaborativo, família e rede de apoio"] }
        ],
        grupos: [{ nome: 'P1', blocos: [0, 1, 2, 3], minimoAcertos: 12 }, { nome: 'P2', blocos: [4], minimoAcertos: 20 }]
      } },
      { id: 'cruzeta-rn', modo: 'completo', dados: {
        nome: 'Cruzeta/RN', banca: 'IDIB', dataProva: '2026-11-29', numAlternativas: 5, minimoPontos: EM_BRANCO, zeroElimina: true, meta: EM_BRANCO, alvo: 'CRUZETA',
        blocos: [
          { nome: 'Conhecimentos Específicos', numQuestoes: 25, pontosPorQuestao: 2, minimoAcertos: null,
            assuntos: ["Fundamentos legais e políticas da Educação Especial", "Braille, Libras e Comunicação Alternativa (CAA)", "Público-alvo: deficiências, TEA, altas habilidades, NEE", "Desenvolvimento humano, aprendizagem e diversidade", "Acessibilidade e Tecnologia Assistiva", "AEE: conceitos, princípios, objetivos e organização", "Plano de AEE: PAEE, PEI e PPI", "Currículo, avaliação e práticas inclusivas", "Trabalho colaborativo, família e rede de apoio", "Educação inclusiva (fundamentos)", "Desenho Universal para a Aprendizagem (DUA)", "Mobilidade reduzida e acessibilidade física"] },
          { nome: 'Língua Portuguesa', numQuestoes: 15, pontosPorQuestao: 2, minimoAcertos: null, assuntos: EM_BRANCO },
          { nome: 'Raciocínio Lógico', numQuestoes: 5, pontosPorQuestao: 2, minimoAcertos: null, assuntos: EM_BRANCO },
          { nome: 'Informática', numQuestoes: 5, pontosPorQuestao: 2, minimoAcertos: null, assuntos: EM_BRANCO }
        ],
        grupos: []
      } }
    ]
  };

  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }

  /** Monta o concurso do edital a partir do cadastro atual (ou da semente, se o concurso tiver sido excluído). */
  function concursoDoEdital(ed, L, atual, semente) {
    var avisos = [];
    if (ed.modo === 'linhas') {
      var base = copia(atual || semente);
      Object.keys(ed.linhas).forEach(function (nomeBloco) {
        var b = null;
        base.blocos.forEach(function (x) { if (x.nome === nomeBloco) b = x; });
        if (!b) { avisos.push('Bloco "' + nomeBloco + '" não existe no cadastro atual: as linhas dele não foram carregadas.'); return; }
        var nova = ed.linhas[nomeBloco].slice();
        (b.assuntos || []).forEach(function (a) { if (nova.indexOf(a) < 0) nova.push(a); }); // mantém as linhas que o usuário já tinha
        b.assuntos = nova;
      });
      return { concurso: base, avisos: avisos };
    }
    var d = ed.dados, a = atual;
    function valor(v, campo) { return v === EM_BRANCO ? (a && a[campo] != null ? a[campo] : null) : v; }
    return { avisos: avisos, concurso: {
      id: ed.id, nome: a ? a.nome : d.nome, lab: L, banca: d.banca, dataProva: d.dataProva, numAlternativas: d.numAlternativas,
      minimoPontos: valor(d.minimoPontos, 'minimoPontos'), zeroElimina: d.zeroElimina, meta: valor(d.meta, 'meta'), alvo: d.alvo,
      blocos: d.blocos.map(function (b) {
        var antigo = null;
        if (a) a.blocos.forEach(function (x) { if (x.nome === b.nome) antigo = x; });
        return { nome: b.nome, numQuestoes: b.numQuestoes, pontosPorQuestao: b.pontosPorQuestao, minimoAcertos: b.minimoAcertos,
          assuntos: b.assuntos === EM_BRANCO ? (antigo ? (antigo.assuntos || []).slice() : []) : b.assuntos.slice() };
      }),
      grupos: copia(d.grupos)
    } };
  }

  /** O que o botão vai fazer em cada concurso pré-cadastrado deste laboratório. Não altera nada. */
  function planoEditais(labObj) {
    var L = labObj.lab, sementes = labInicial(L).concursos;
    return EDITAIS[L].map(function (ed) {
      var atual = porId(labObj.concursos, ed.id), semente = porId(sementes, ed.id);
      var r = concursoDoEdital(ed, L, atual, semente);
      return {
        id: ed.id, nome: r.concurso.nome, antes: atual ? copia(atual) : null, depois: r.concurso, avisos: r.avisos,
        editado: !!atual && !global.Nucleo.mesmoConcurso(atual, semente),
        mudancas: global.Nucleo.diferencasConcurso(atual, r.concurso)
      };
    });
  }

  /** Aplica o plano: troca só os concursos da lista. Simulados, sessões, revisões e caixas ficam como estão. */
  function aplicarPlanoEditais(labObj, plano) {
    plano.forEach(function (p) {
      if (!p.mudancas.length) return;
      var achou = false;
      labObj.concursos = labObj.concursos.map(function (c) { if (c.id === p.id) { achou = true; return copia(p.depois); } return c; });
      if (!achou) labObj.concursos.push(copia(p.depois));
    });
    return labObj;
  }

  function geralInicial() { return { versao: 1, primeiraSessaoB: '' }; }

  function chaveLab(L) { return PREFIXO + 'lab' + L; }

  function lab(L) {
    if (L !== 'A' && L !== 'B') throw new Error('Laboratório inválido: ' + L);
    var s = backend.getItem(chaveLab(L));
    if (!s) { var novo = labInicial(L); salvarLab(novo); return novo; }
    return JSON.parse(s);
  }

  function salvarLab(obj) {
    if (obj.lab !== 'A' && obj.lab !== 'B') throw new Error('Laboratório inválido');
    backend.setItem(chaveLab(obj.lab), JSON.stringify(obj));
  }

  function geral() {
    var s = backend.getItem(PREFIXO + 'geral');
    return s ? JSON.parse(s) : geralInicial();
  }

  function salvarGeral(g) { backend.setItem(PREFIXO + 'geral', JSON.stringify(g)); }

  function novoId(p) {
    return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function agora() { return new Date().toISOString(); }

  /** Estado completo (os dois laboratórios + geral), sem data de exportação. */
  function estadoCompleto() { return { geral: geral(), labs: { A: lab('A'), B: lab('B') } }; }

  function exportarBackup() {
    var e = estadoCompleto();
    return { app: APP, versao: 1, exportadoEm: agora(), geral: e.geral, labs: e.labs };
  }

  function validarBackup(obj) {
    if (!obj || typeof obj !== 'object') return 'O arquivo não é um backup válido.';
    if (obj.app !== APP) return 'Este arquivo não é um backup do Corretor de Simulados A×B.';
    if (!obj.labs || !obj.labs.A || !obj.labs.B) return 'O backup não tem os dois laboratórios.';
    if (obj.labs.A.lab !== 'A' || obj.labs.B.lab !== 'B') return 'Os laboratórios do backup estão trocados ou corrompidos.';
    var campos = ['concursos', 'simulados', 'sessoes', 'operacao', 'revisoes'];
    for (var i = 0; i < campos.length; i++) {
      if (!Array.isArray(obj.labs.A[campos[i]]) || !Array.isArray(obj.labs.B[campos[i]])) return 'O backup está incompleto (falta "' + campos[i] + '").';
    }
    return null;
  }

  /** Substitui TODOS os dados pelos do backup. Quem chama deve pedir confirmação antes. */
  function importarBackup(obj) {
    var erro = validarBackup(obj);
    if (erro) throw new Error(erro);
    salvarLab(obj.labs.A);
    salvarLab(obj.labs.B);
    salvarGeral(obj.geral || geralInicial());
  }

  function limparTudo() {
    backend.removeItem(chaveLab('A'));
    backend.removeItem(chaveLab('B'));
    backend.removeItem(PREFIXO + 'geral');
  }

  global.Dados = {
    PREFIXO: PREFIXO,
    persistente: function () { return persistente; },
    usarBackend: usarBackend, backendMemoria: backendMemoria,
    labInicial: labInicial, lab: lab, planoEditais: planoEditais, aplicarPlanoEditais: aplicarPlanoEditais, salvarLab: salvarLab, geral: geral, salvarGeral: salvarGeral,
    novoId: novoId, agora: agora, estadoCompleto: estadoCompleto,
    exportarBackup: exportarBackup, validarBackup: validarBackup, importarBackup: importarBackup, limparTudo: limparTudo
  };
})(typeof window !== 'undefined' ? window : globalThis);
