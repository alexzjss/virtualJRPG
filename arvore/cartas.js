// Cartas de habilidade portadas dos dois designs do Canva ("cartas de habilidades" e "skills"), agregadas e sem repetição.
// As versões da mesma carta em níveis diferentes viraram um nó base + nós de evolução (amp, `pre`). Dado, CD e custo da carta
// viram custo de Aura (c), poder (p ≈ dano da carta × 0,85) e tempo (ct); Reforço/Forma viram transformações (fm).
// Mecânicas novas no motor: `stack doenca` (estágios da Doença, acumulam em si) e `ret` (quem erra o transformado perde o ritmo).
// Notação: veja content.js e ARVORE-SISTEMAS.md. Cada entrada abaixo é um ramo novo do setor indicado.
//
// Não portado (não são técnicas de combate): Evolução, Desejo e Nova Carta (progressão: o próprio XP da árvore), Vínculo (as raízes
// de cada setor), "???" (Domínio) vira o Mundo do Tsukuyomi, e Pressão Interna/Kaiser/Sobrecarga (só citadas nas Formas, sem carta).

export const CARTAS = {
  // ---------- Marcial: cartas básicas, abertas a todos ----------
  marcial: [[
    { n: "Força", k: "dmg", d: "O Personagem usa sua força bruta.", xp: 10, a: "FOR", p: 14, c: 3 },
    { n: "Esquiva", k: "util", d: "Uma movimentação básica: o próximo golpe erra.", xp: 10, a: "DES", c: 2, ct: 40, tg: "self", fx: "st evade 1 self" },
    { n: "Bloqueio", k: "util", d: "O Personagem se defende do golpe recebido, firme e sem pressa.", xp: 10, a: "CON", c: 1, ct: 50, tg: "self", fx: "st defUp 2 self; shield 4 self" },
    { n: "Carregar", k: "util", d: "Absorve a energia concentrada do lugar: a cada turno parado, mais Aura.", xp: 15, a: "SAB", c: 0, ct: 100, tg: "self", fx: "gain aura 8" },
    { n: "Intuição", k: "util", d: "O Personagem busca dentro da consciência e enxerga o que o inimigo esconde.", xp: 15, a: "SAB", c: 2, ct: 60, tg: "self", fx: "st focus 3 self; st evade 1 self" },
    { n: "Segunda Chance", k: "util", d: "Rolar outra vez e ficar com o melhor resultado.", xp: 20, a: "SOR", c: 3, ct: 50, tg: "self", fx: "st focus 3 self; st atkUp 1 self" },
    { n: "Vitalidade", k: "passive", d: "O corpo aguenta um pouco mais.", xp: 15, bon: "hpMax 10" },
    { n: "Reserva de Aura", k: "passive", d: "Um pouco mais de fôlego espiritual.", xp: 15, bon: "auraMax 6" },
    { n: "Clareza", k: "form", d: "Um estado de combate em que a percepção chega ao extremo: postura, respiração, tensão e peso do adversário viram leitura.", xp: 30, a: "INT", c: 3, fm: "dur 3; hit 15; crit 15" },
    { n: "Cólera", k: "form", d: "Libera todo o potencial físico: o dano dobra, e o corpo paga metade do HP a cada rodada.", xp: 30, a: "FOR", c: 3, fm: "dur 3; atk 50; dr hp 12; end st exaus 2" },
    { n: "Kai", k: "form", d: "Libera todo o potencial espiritual: o dano de Aura dobra, mas custa toda a Aura e acaba em 3 rodadas.", xp: 35, a: "SAB", c: 3, fm: "dur 3; atkP 10; dr aura 5; end lose aura 99", rq: { SAB: 50 } },
    { n: "Inconsciência", k: "form", d: "Abandonar os sentidos naturais e viver só de vontade e brutalidade: enxerga rastros de Aura.", xp: 50, a: "FOR", c: 5, fm: "dur 9; atk 30; hit 15; crit 10; end st blind 3; end st exaus 2", rq: { FOR: 55 } },
    { n: "Esquiva Flanqueada", k: "dmg", d: "Dois Personagens esquivam do mesmo ataque e flanqueiam o alvo, abrindo um ataque vantajoso.", xp: 25, a: "DES", p: 15, c: 4, ct: 70, duo: "Esquiva Flanqueada", fx: "st exposed 1" },
    { n: "Soco da Dualidade", k: "dmg", d: "Dois Personagens reúnem a Aura do ambiente e socam juntos: duas mãos em uma só corrente de impacto.", xp: 50, a: "FOR", p: 46, c: 12, duo: "Soco da Dualidade", rq: { FOR: 55 } },
    { n: "Lâmina da Irmandade", k: "dmg", d: "Dois Personagens armados atacam em sincronia contra um único alvo.", xp: 40, a: "DES", p: 36, c: 9, duo: "Lâmina da Irmandade" },
    { n: "Ataque de Trio", k: "dmg", d: "Três Personagens atacam de forma sincronizada contra um único alvo.", xp: 70, a: "FOR", p: 52, c: 14, ct: 150, trio: "Ataque de Trio|Ataque de Trio" },
  ]],

  // ---------- Aura: disparos e reforços ----------
  aura: [[
    { n: "Shukoudan", k: "dmg", d: "Um disparo de energia pura em direção a um alvo.", xp: 10, a: "SAB", p: 9, c: 3, ct: 60, cat: "emi" },
    { n: "Força de Aura", k: "dmg", d: "A Aura reforça o corpo: a pancada sai com muito mais força.", xp: 10, a: "FOR", p: 12, c: 2, cat: "int", fx: "st atkUp 1 self" },
    { n: "Teia de Aura", k: "dmg", d: "Uma teia de Aura elétrica que gruda no alvo; serve para puxar objetos leves ou se lançar até os pesados.", xp: 15, a: "DES", p: 4, c: 3, cat: "tra", fx: "st root 2; push 20" },
    { n: "Canhão de Aura", k: "dmg", d: "A Aura se concentra entre as mãos numa esfera e sai como um canhão de energia.", xp: 25, a: "SAB", p: 34, c: 13, ct: 120, cat: "emi", rq: { SAB: 50 } },
    { n: "Canhão de Aura Gélido", k: "dmg", d: "O canhão ganha um sopro criogênico: o impacto vem junto de uma onda de frio que se espalha.", xp: 60, a: "SAB", p: 30, c: 15, area: true, ct: 140, cat: "emi", v2: "fuhaku", fx: "st frozen 1 40%; st wet 2", rq: { SAB: 55 } },
  ]],

  // ---------- Indra ----------
  indra: [
    [ // Cartas de Indra: ataques
      { n: "Tiro de Indra", k: "dmg", d: "Um disparo de energia pura carregado com Indra.", xp: 10, a: "INT", p: 6, c: 3, ct: 60 },
      { n: "Selo de Indra", k: "dmg", d: "Um selo de Indra no corpo do alvo, que descarrega depois.", xp: 10, a: "INT", p: 6, c: 2, fx: "seal 14 2" },
      { n: "Disparo Elétrico", k: "dmg", d: "Um disparo carregado eletricamente: perfura e espalha corrente na área afetada.", xp: 15, a: "INT", p: 17, c: 4, ct: 70, fx: "pierce 60; st para 1 30%" },
      { n: "Núcleo de Indra", k: "dmg", d: "Uma esfera de raio na palma da mão, disparada no primeiro contato com um condutor.", xp: 25, a: "INT", p: 22, c: 8, st: "para", rq: { INT: 50 } },
      { n: "Núcleo de Indra: Nível 2", k: "passive", d: "O núcleo agora explode em raios ao acertar e solta o Núcleo de Corte.", xp: 30, amp: "Núcleo de Indra", up: { p: 6, fx: "chain 1 .7" }, pre: "Núcleo de Indra" },
      { n: "Núcleo de Corte", k: "dmg", d: "Dano elétrico cortante rápido ao longo do trajeto traçado pelo Núcleo de Indra.", xp: 20, a: "INT", p: 9, c: 3, ct: 50, hits: 2, pre: "Núcleo de Indra: Nível 2" },
      { n: "Chave de Indra", k: "dmg", d: "O corpo coberto de Indra avança numa carga e descarrega em impacto elétrico, empurrando o alvo.", xp: 30, a: "AGI", p: 13, c: 5, fx: "push 40; chain 2 .6" },
      { n: "Chave de Indra: Nível 2", k: "passive", d: "O impacto empurra mais longe e a descarga atinge mais inimigos.", xp: 35, amp: "Chave de Indra", up: { p: 4, fx: "push 70; chain 4 .6" }, pre: "Chave de Indra" },
      { n: "Lâmina de Indra", k: "dmg", d: "Uma lâmina de eletricidade estável, extensível e transferível por todo o corpo.", xp: 35, a: "INT", p: 21, c: 7, ct: 70, st: "para", rq: { INT: 55 } },
      { n: "Tocar os Céus", k: "dmg", d: "A lâmina de Indra se estende até o céu e corta uma área inteira.", xp: 55, a: "INT", p: 26, c: 13, area: true, ct: 140, st: "para", pre: "Lâmina de Indra", rq: { INT: 62 } },
    ],
    [ // Cartas de Indra: reforços e reações
      { n: "Esquiva de Indra", k: "util", d: "Uma esquiva rápida, empurrada por uma descarga.", xp: 10, a: "AGI", c: 1, ct: 40, tg: "self", fx: "st evade 1 self" },
      { n: "Passo Trovejante", k: "util", d: "Uma Aura elétrica em volta do corpo: o personagem desliza e deixa corrente na área ao redor.", xp: 15, a: "AGI", c: 3, ct: 50, tg: "self", fx: "st evade 1 self; st para 1 foes 30%" },
      { n: "Impulso", k: "util", d: "Um impulso assistido por Indra: mais rápido e espalhando eletricidade por perto.", xp: 15, a: "AGI", c: 1, ct: 40, tg: "self", fx: "st evade 1 self; haste 40 self" },
      { n: "Energizar", k: "form", d: "Vincula o corpo a Indra: mais rápido e mais certeiro por um instante.", xp: 15, a: "INT", c: 2, fm: "dur 2; atk 10; agi 10" },
      { n: "Energizar ++", k: "form", d: "A corrente já corre controlada: dura mais e o efeito dobra.", xp: 30, a: "INT", c: 3, fm: "dur 3; atk 18; agi 15; hit 5", pre: "Energizar" },
      { n: "Conduzir", k: "util", d: "Transfere carga elétrica do próprio corpo para um aliado ou a espalha entre os que estão por perto.", xp: 20, a: "INT", c: 0, ct: 60, fx: "res aura 5" },
      { n: "Absorver Carga", k: "util", d: "Puxa para dentro a carga elétrica que toca o corpo e a guarda para o próximo golpe de Indra.", xp: 20, a: "INT", c: 0, ct: 40, tg: "self", fx: "gain aura 6; st atkUp 1 self" },
      { n: "Cintilação", k: "form", d: "Indra por dentro dos músculos: um reflexo ultraveloz.", xp: 25, a: "INT", c: 3, fm: "dur 2; agi 25; def 5" },
      { n: "Manto da Tempestade", k: "form", d: "O corpo envolto em Indra, energizado e difícil de acertar.", xp: 30, a: "INT", c: 4, fm: "dur 2; agi 25; def 10; ret 20" },
      { n: "Ketsujutsu", k: "form", d: "Imbuir a energia de Indra numa arma condutora: ela ganha precisão e libera técnicas derivadas.", xp: 35, a: "INT", c: 6, fm: "dur 5; atkP 5; hit 10", rq: { INT: 50 } },
      { n: "Forma Dourada: Tempestade", k: "form", d: "Shinkai quebra os limites: Corrente Contínua. O ataque básico dobra, e objetos condutores por perto recebem carga constante.", xp: 90, a: "INT", c: 12, aw: "indra", fm: "dur 4; atk 30; agi 20; hit 15; atkP 8; dr aura 5; end st exaus 3", rq: { INT: 62 } },
      { n: "Caça-Relâmpago", k: "dmg", d: "Um canhão de Aura dourada acumulada com Indra nas duas mãos, disparado como um raio único.", xp: 70, a: "INT", p: 38, c: 12, ct: 130, st: "para", nf: 1, pre: "Forma Dourada: Tempestade" },
      { n: "Azrael", k: "dmg", d: "O raio dourado liberado em plena Forma Dourada: o céu inteiro cai numa linha só.", xp: 90, a: "INT", p: 54, c: 16, area: true, ct: 150, st: "para", nf: 1, pre: "Caça-Relâmpago", rq: { INT: 62 } },
    ],
  ],

  // ---------- Fuhaku ----------
  fuhaku: [
    [ // Cartas de Fuhaku: ataques
      { n: "Pulso de Fuhaku", k: "dmg", d: "Um pulso curto de Fuhaku, capaz de ferir e mover objetos.", xp: 10, a: "DES", p: 6, c: 2, ct: 50, fx: "push 20" },
      { n: "Selo de Fuhaku", k: "dmg", d: "Um selo de vento comprimido no alvo, que estoura depois.", xp: 10, a: "DES", p: 6, c: 2, fx: "seal 14 2" },
      { n: "Corrente de Vento", k: "dmg", d: "Fuhaku entre as mãos, lançado como uma corrente veloz e de impacto.", xp: 15, a: "DES", p: 13, c: 3, ct: 70, fx: "push 25" },
      { n: "Empurrão", k: "dmg", d: "Um empurrão de vento direto à frente, que arrasta o alvo.", xp: 15, a: "DES", p: 9, c: 3, ct: 60, fx: "push 45" },
      { n: "Tentáculo de Vento", k: "dmg", d: "Uma corrente maleável e extensível, até 4 metros, até 3 vezes seguidas.", xp: 25, a: "DES", p: 5, c: 4, ct: 70, hits: 3 },
      { n: "Atirar Vento", k: "dmg", d: "Uma Aura de Fuhaku em torno de um objeto: ele é lançado com muito mais força e velocidade.", xp: 20, a: "DES", p: 10, c: 3, ct: 60, fx: "push 20" },
      { n: "Wakaze", k: "dmg", d: "Uma esfera de vento puro, cheia de energia cinética, que explode ao acertar.", xp: 30, a: "DES", p: 31, c: 10, fx: "push 30", rq: { DES: 50 } },
      { n: "Wakaze: Nível 2", k: "passive", d: "A esfera cresce e a explosão de vento se alarga.", xp: 35, amp: "Wakaze", up: { p: 7, area: true }, pre: "Wakaze" },
      { n: "Wakaze: Estilo Criogênico", k: "dmg", d: "A esfera ganha um frio rotacional e se estilhaça no impacto, espalhando o gelo.", xp: 60, a: "DES", p: 26, c: 12, ct: 130, fx: "st frozen 1 50%; st wet 2", pre: "Wakaze", rq: { DES: 55 } },
      { n: "Soco de Tornado", k: "dmg", d: "Um soco de altíssima velocidade que arremessa o alvo para longe, com dano de vento.", xp: 50, a: "DES", p: 30, c: 8, ct: 80, nf: 1, fx: "push 80" },
    ],
    [ // Cartas de Fuhaku: reforços e reações
      { n: "Salto de Ventania", k: "util", d: "Um salto no ar com Fuhaku, para o dobro da altura; combina com uma reação.", xp: 10, a: "AGI", c: 1, ct: 40, tg: "self", fx: "st evade 1 self; haste 30 self" },
      { n: "Asa-Branca", k: "util", d: "O personagem se encobre de vento e plana, mais rápido quanto mais o vento acelera.", xp: 20, a: "AGI", c: 2, ct: 60, tg: "self", fx: "st evade 2 self; st agiUp 3 self" },
      { n: "Ode ao Vento", k: "form", d: "Vincula o corpo a Fuhaku: leve, rápido, mais certeiro.", xp: 15, a: "DES", c: 2, fm: "dur 2; agi 12; hit 8" },
      { n: "Ode ao Vento ++", k: "form", d: "O vento já obedece: a área de efeito pode ser dirigida e o efeito dura mais.", xp: 30, a: "DES", c: 3, fm: "dur 3; agi 18; hit 10; crit 5", pre: "Ode ao Vento" },
      { n: "Dente-de-leão", k: "util", d: "Um campo de 10 metros de vento rotacional: os testes de Fuhaku ganham força e os dos outros Vínculos perdem.", xp: 100, a: "DES", c: 0, ct: 150, tg: "self", aw: "fuhaku", dom: "dur 3; ally agi 20; ally hit 10; foe hit -10" },
      { n: "Forma Prateada: Vendaval", k: "form", d: "Mikhail quebra os limites. Como o vento: o personagem atravessa terreno difícil, não é flanqueado e quem erra perde o ritmo.", xp: 90, a: "DES", c: 12, aw: "fuhaku", fm: "dur 4; agi 25; def 10; hit 10; ret 40; dr aura 4; end st exaus 3", rq: { DES: 62 } },
      { n: "Instinto do Vento", k: "util", d: "Esquiva na mesma velocidade do vento, reposicionando o personagem.", xp: 40, a: "AGI", c: 2, ct: 40, tg: "self", nf: 1, fx: "st evade 2 self; haste 50 self" },
      { n: "Alice", k: "util", d: "O vento muda a ordem dos turnos: os ataques contra você ficam em desvantagem, os aliados correm e os inimigos arrastam.", xp: 70, a: "DES", c: 9, ct: 80, nf: 1, fx: "st defUp 2 self; haste 50 ally; push 50 foes" },
    ],
  ],

  // ---------- Kagutsuchi ----------
  kagutsuchi: [[
    { n: "Forma Carmesim: Fornalha", k: "form", d: "Shinkai quebra os limites: uma Ameaça de Explosão. Quem está encostado sofre, e o frio não vinga perto dele.", xp: 90, a: "INT", c: 12, aw: "kagutsuchi", fm: "dur 3; atk 35; agi 15; def 10; dr aura 4; end st exaus 3", fx: "st burn 2 foes; cleanse self" },
  ]],

  // ---------- Tsukuyomi ----------
  tsukuyomi: [[
    { n: "Passo do Cão-de-Caça", k: "util", d: "Uma esquiva veloz que deixa um rastro de sombra para trás.", xp: 15, a: "AGI", c: 1, ct: 40, tg: "self", fx: "st evade 1 self; st stealth 1 self" },
    { n: "Verdade", k: "util", d: "Uma análise profunda de dentro da consciência. Quem olha demais para a verdade paga com a mente.", xp: 40, a: "INT", c: 3, ct: 70, tg: "self", pay: { san: 4 }, fx: "st focus 3 self; st atkUp 3 self" },
    { n: "Mundo do Tsukuyomi", k: "util", d: "Pela verdade do contrato de Azazel, o plano do Reino das Trevas se abre: o sobrenatural deixa rastro e luta em pé de igualdade.", xp: 100, a: "INT", c: 0, ct: 150, tg: "self", aw: "tsukuyomi", dom: "dur 4; ally hit 10; ally agi 10; foe hit -15; tick fear" },
  ]],

  // ---------- Hiruko: A Doença ----------
  hiruko: [[
    { n: "Pacto com A Doença", k: "passive", d: "Uma energia reativa, degradante e mortal passa a morar no corpo. Cada evolução permite mutar uma carta.", xp: 20, bon: "FOR 3; hpMax -10" },
    { n: "Suplex", k: "dmg", d: "Agarrar e arremessar com a violência de quem já não sente a própria dor. Cada uso avança um estágio da Doença.", xp: 15, a: "FOR", p: 14, c: 3, fx: "stack doenca 5 self" },
    { n: "Esquiva Doentia", k: "util", d: "Envenenar o próprio corpo para um salto aceleradíssimo. Cada uso avança um estágio da Doença.", xp: 20, a: "AGI", c: 2, ct: 40, tg: "self", fx: "st evade 1 self; haste 40 self; stack doenca 5 self" },
    { n: "Força Doentia", k: "dmg", d: "Uma violência muito além do comum, que desgasta os músculos. Cada uso avança um estágio da Doença.", xp: 30, a: "FOR", p: 26, c: 5, fx: "stack doenca 5 self", pre: "Pacto com A Doença" },
    { n: "Chute Doentio", k: "dmg", d: "Um chute agressivo de uma vez só, potencializado por uma energia estranha. Cada uso avança um estágio da Doença.", xp: 50, a: "FOR", p: 31, c: 7, st: "poison", fx: "stack doenca 5 self", pre: "Força Doentia", rq: { FOR: 55 } },
  ]],
};
