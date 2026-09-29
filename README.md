# Corretor de Simulados A×B

Site simples para **calcular e registrar** simulados e revisões de dois métodos de estudo, lado a lado, sem misturar os dados:

- **Laboratório A (Método A):** SEDUC/CE e Cruzeta/RN — revisão D0/D2/D7/D21 — as linhas vão para o **CADERNO_DE_ERROS**.
- **Laboratório B (Método B):** Jucurutu/RN — revisão por caixas — os registros vão para o **11_ESTADO_B**.

> A fonte oficial é o seu **Google Drive**. Esta ferramenta não é uma segunda fonte: toda correção termina em texto pronto para colar no CADERNO_DE_ERROS (A) ou no 11_ESTADO_B (B).

A ferramenta não ensina, não gera questões e não substitui os mentores. Ela não guarda enunciados: só gabaritos, marcações e classificações que você digita. Todo percentual aparece com o denominador (ex.: `12/20 = 60%`).

**Endereço:** https://nelthonn-lgtm.github.io/corretor-simulados/
**Testes:** https://nelthonn-lgtm.github.io/corretor-simulados/tests.html

---

## Antes de tudo: complete os concursos do Laboratório A

SEDUC/CE e Cruzeta/RN vêm **em branco** de propósito (nenhum peso, número de alternativas ou regra foi inventado). Enquanto não tiverem blocos, o site mostra *"preencher pelo edital antes de lançar simulado"* e não deixa lançar.

1. Abra **Laboratório A → Concursos e pares → Editar**.
2. Pelo edital, preencha: número de alternativas, pontuação mínima, se zero em disciplina elimina, meta e os **blocos** (nome, nº de questões, pontos por questão, mínimo de acertos no bloco se o edital tiver, e as linhas do edital, uma por linha).
   Se o edital exigir mínimo numa parte da prova formada por vários blocos, crie um **grupo de blocos**: nome, os blocos que o compõem e o mínimo de acertos. Abaixo de qualquer mínimo sai o alerta vermelho "Eliminado: [bloco ou grupo] x/y, mínimo z", junto com os demais motivos.
3. Salve.

No Laboratório B, Jucurutu/RN já vem cadastrado (5 blocos, 100 pontos). Só as linhas de Conhecimentos Pedagógicos vieram preenchidas; complete as dos outros blocos quando quiser.

**Atalho: "Carregar cadastro dos editais".** Em **Configurações** de cada laboratório há esse botão:
- no Laboratório A, ele preenche SEDUC/CE e Cruzeta/RN com blocos, pesos, alternativas, mínimos e linhas dos editais;
- no Laboratório B, ele preenche as linhas de todos os blocos de Jucurutu/RN, mantendo o resto.

O botão pede confirmação. Se você já tiver editado algum desses concursos, ele mostra o que vai mudar e pede confirmação de novo. Simulados, sessões, revisões e caixas já registrados não mudam. Campos que o edital deixa em branco (meta, mínimo total de Cruzeta, algumas linhas) ficam para você preencher; se já tiver preenchido, o seu valor fica. Mínimo total ou meta em branco não impedem lançar: aparece um aviso amarelo "campo não preenchido".

## Lançar um simulado

1. Entre no laboratório certo e toque em **Lançar simulado**.
2. Escolha o concurso, a data e os minutos gastos na prova.
3. **Gabarito oficial:** cole as letras em sequência (ex.: `ABCDEABCDE...`). Use `*` para questão **anulada**.
   **Suas marcações:** cole do mesmo jeito. Use `-` (hífen) para questão **em branco**.
   Se preferir, preencha questão por questão.
4. Em cada questão, informe: assunto/linha (se o bloco tiver linhas), confiança (**C** certeza, **D** dúvida, **CH** chute), se fez **eliminação escrita** e, se for o caso, o **par vizinho**.
5. Em cada erro (ou questão em branco), escolha a **causa**. A contramedida aparece sozinha:
   - não sabia o conteúdo → reestudo do assunto
   - leu errado o enunciado → treino de leitura de comando
   - caiu no distrator → eliminação escrita na próxima
   - desatenção → bloco mais curto, na hora
   - chute → marcar para revisão em vez de adivinhar
6. Questão anulada precisa de justificativa e sai da conta (nem no total, nem no denominador).
7. Toque em **Corrigir e salvar**. Se faltar algo, o site lista o que falta.

Acerto com **CH** ou **sem eliminação escrita** conta ponto na nota, mas aparece como **RISCO** — nunca como domínio.

A correção mostra: acertos e pontos por bloco e no total, situação diante da eliminação (vermelho se ficou abaixo do mínimo ou zerou disciplina que elimina; amarelo se algum bloco ficou abaixo de 20%), distância até a meta, resultado por assunto (com quantos acertos foram RISCO), causas dos erros e acerto nos pares vizinhos.

O rascunho fica guardado enquanto você preenche; dá para fechar a página e continuar depois.

## Registrar uma sessão de estudo

1. **Sessões de estudo** → data e concurso.
2. Para cada assunto da sessão: **minutos**, questões feitas, acertos, **acertos com chute (CH)** e **acertos sem eliminação escrita** (sem contar os de chute; os dois somados não passam dos acertos). Para cada erro, confiança e causa.
   Use **+ Outro assunto nesta sessão** quando estudou mais de um assunto.
3. **Salvar sessão.** Sem minutos a sessão não é salva.

Os minutos gastos **operando o sistema** (colar prompt, imprimir, transferir, gravar) vão à parte, em **Minutos operando**, por dia.

## Fazer as revisões

**Laboratório A — Revisões D0–D21**
- Cada erro (de simulado ou de sessão) vira um item com D0 (mesmo dia), D2 (+2 dias), D7 (+7) e D21 (+21).
- Em **Vencidas hoje**, registre o resultado da etapa. No D2, confirme que foi em item novo ou estruturalmente diferente; no D7 e no D21, que foi em questão nova. Se acertou, informe a confiança (C, D ou CH) e se fez eliminação escrita.
- O erro só **fecha** com o D21 acertado em questão nova — e acerto com chute (CH) no D21 **não** fecha.
- Errou em qualquer etapa: abre novo ciclo com D0 na data desse erro (dá para mudar essa regra e os intervalos em **Configurações**).
- Revisão vencida não some da lista até ser registrada. **Próximos 7 dias** mostra o que vem aí.

**Laboratório B — Caixas**
- Caixas de 1, 3, 7, 16 e 35 dias (editáveis em **Configurações**).
- Errar uma linha (em simulado, sessão ou revisão) leva a linha para a **caixa 1**.
- Acertou sem ser chute → sobe uma caixa. Acerto com **CH** não sobe.
- Toda revisão é registrada como feita em questão nova. Se acertou, informe a confiança e se fez eliminação escrita.

## Levar as linhas para o Drive

- **Método A:** em cada erro há o botão **Linha para o CADERNO_DE_ERROS**. A aba **Drive e exportar** junta todas as linhas de uma vez. Formato:
  `data | alvo (CE ou CRUZETA) | assunto | item do edital | o que marcou | gabarito | causa | contramedida | D2 | D7 | D21 | status`
- **Método B:** use **Registro para o 11_ESTADO_B** (nas caixas, nas sessões e na correção do simulado) ou escolha o dia em **Drive e exportar**. Cada registro traz: data, linha, questões, acertos, causa de cada erro, caixa atual e minutos.

Toque em **Copiar** e cole no arquivo do Drive. Sempre que registrar uma revisão, atualize a linha no Drive.

Arquivos para baixar (aba **Drive e exportar** de cada laboratório):
- **Relatório do simulado (.md)** — `AAAA-MM-DD_[concurso]_[laboratório]_simulado.md`
- **Estado do laboratório (.md)** — revisões/caixas, números do placar e sessões
- **Planilha (.csv)** — uma linha por questão de simulado (abre no Excel/Planilhas; separador `;`)

## Ler o placar A×B

O placar é a **única** tela que lê os dois laboratórios. No topo fica sempre a ressalva: *um candidato só, em concursos, bancas, assuntos e tempos diferentes; é uma impressão medida, com denominador e data.*

- **Ponto por hora (principal), por assunto:** pontos no simulado naquele assunto ÷ horas de estudo registradas naquele assunto no mesmo período. Assunto sem minutos aparece como **sem medição**, nunca como zero. A tela mostra a tabela por assunto com A e B lado a lado (numerador e denominador em cada linha); a última linha soma os assuntos medidos e é o número usado no veredito.
- **Retenção aos 21 dias:** acerto em questão nova de um assunto 21 dias ou mais depois do primeiro contato com ele. Acerto com confiança **CH não conta** (entra como erro no denominador). Acerto sem eliminação escrita (e sem CH) é RISCO: conta e aparece à parte, `x/y, dos quais z RISCO`. A regra é a mesma em simulados, sessões, revisões do A e revisões do B. Registros antigos, feitos antes desses campos existirem, ficam como **não informado**: não entram na conta, e o placar mostra quantos são.
- **Migração da causa do erro:** as cinco causas por semana; destaca se "leu errado" + "distrator" estão diminuindo em proporção a "não sabia o conteúdo".
- **Discriminação entre vizinhos:** acerto nas questões marcadas com par vizinho, por semana.
- **Custo de operação:** minutos por semana operando o sistema.

Janelas (contadas da primeira sessão de B; a data pode ser mudada em **Laboratório B → Configurações**):
- **Janela 1 (4 semanas):** só mostra se o teste está de pé (B com minutos registrados e caixas funcionando). Sem vencedor.
- **Janela 2 (8 semanas):** mostra os cinco números de cada método e libera o veredito.
- Antes da janela 2: *"semana ruim não muda método: aguarde a janela 2"*.

Veredito: um método só **vence** se ganhar em ponto por hora **e** em retenção aos 21 dias. Ganhar só em ponto por hora é *"ganho de curto prazo, não é vitória"*. Fora isso: *"EMPATE — fique com o mais barato de operar"*.

O botão **Placar A×B (.md)** baixa tudo isso em um arquivo.

## Backup (importante)

Os dados ficam **só no navegador** deste aparelho (localStorage).

> **Limpar os dados do navegador (histórico, cookies, dados de sites), usar aba anônima ou trocar de aparelho apaga tudo o que não foi exportado.**

- **Backup → Backup completo (.json)** baixa os dois laboratórios num arquivo. Guarde no Drive com frequência.
- **Backup → Importar backup** lê esse arquivo e **substitui** todos os dados atuais (o site pede confirmação antes).
- Para usar em outro aparelho: exporte num, importe no outro.

## Testes

Abra `tests.html` no navegador. Ele roda os 10 testes pedidos (e alguns extras) usando um armazenamento temporário na memória — não toca nos seus dados.

## Como é feito

HTML, CSS e JavaScript puro. Sem servidor, sem etapa de build, sem dependências externas, sem nenhuma API de IA.

```
index.html      página do site
tests.html      testes automáticos no navegador
css/estilo.css  aparência (letras e botões grandes, celular primeiro)
js/nucleo.js    todas as contas (funções puras)
js/dados.js     armazenamento: uma chave por laboratório + backup
js/app.js       telas
```

Para rodar no computador: abra `index.html` direto no navegador, ou sirva a pasta com qualquer servidor estático.
