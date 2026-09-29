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
    labInicial: labInicial, lab: lab, salvarLab: salvarLab, geral: geral, salvarGeral: salvarGeral,
    novoId: novoId, agora: agora, estadoCompleto: estadoCompleto,
    exportarBackup: exportarBackup, validarBackup: validarBackup, importarBackup: importarBackup, limparTudo: limparTudo
  };
})(typeof window !== 'undefined' ? window : globalThis);
