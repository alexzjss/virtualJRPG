// Temas (18/11/2026): cada Vínculo é dono de um elemento, e a árvore de outro só toca nele em técnica de combinação
// (`v2` do dono, reação `rs <dono>`, trio, ou descrição com "aliado"). Isso é regra: o build falha se um nome ou efeito escapar.
// Neutras (Marcial, Armas, Aura, Ocultismo) não têm elemento: só status físicos (sangramento, atordoar, derrubar, enraizar, expor,
// empurrar, marcar) e os debuffs genéricos. Exceções: o Fuhaku usa gelo (ar frio de altitude); a Aura manipula (confusão, possessão);
// o Ocultismo assusta, enlouquece e possui (medo, confusão, possessão, maldição).
// Roda antes de arvore/camadas.js: renomeia (RENOMES), troca o status estrangeiro pelo equivalente do setor e depois valida.

// palavras de nome que pertencem a cada dono (cor não é tema: rubro/escarlate ficam livres)
export const DONO = {
  kagutsuchi: /\b(fogo|fogos|chama|chamas|brasa|brasas|fumaça|ígne[oa]|incendi\w*|queim\w*|fornalha|labared\w*|magma|lava|cinzas?|ardente|ardida|fervura|ferve|escaldante|vapor|centelha|fagulha\w*)\b/i,
  susanoo: /\b(água|aquátic\w*|mar|maré|marés|chuva|torrente|dilúvio|gelo|gelad\w*|congel\w*|gélid\w*|neve|nevasca|tsunami|tempestade|tempestades)\b/i,
  atlas: /\b(terra|pedra|pedras|rocha|rochas|gravidade|sísmic\w*|terremoto|montanha|tectônic\w*|areia)\b/i,
  indra: /\b(trovão|trovões|trovejante|relâmpago|relâmpagos|elétric\w*|eletric\w*|choque|faísca|faíscas|voltaic\w*|plasma|estática|vajra)\b/i,
  fuhaku: /\b(vento|ventos|ventania|tornado|furacão|brisa|ciclone|vendaval|tufão)\b/i,
  amaterasu: /\b(sol|solar|luz|luminos\w*|sagrad\w*|purific\w*|aurora|alvorada|amanhecer)\b/i,
  tsukuyomi: /\b(lua|lunar|trevas|sombra|sombras|ilusão|ilusões|ilusóri\w*|pesadelo|pesadelos|escuridão|eclipse)\b/i,
  shukketsu: /\b(sangue|sanguíne\w*|hemorrág\w*|vampir\w*)\b/i,
  hiruko: /\b(doença|doent\w*|veneno|envenen\w*|tóxic\w*|toxina|radioativ\w*|radiação|mutaç\w*|mutante|ácid[oa]|corros\w*|praga|peste|isótopo\w*|atômic\w*)\b/i,
};
// palavras que mais de um dono usa: "tempestade" é tormenta (água, raio ou vento); gelo também é do Fuhaku
const PARTILHA = { indra: ['susanoo:tempestade'], fuhaku: ['susanoo:tempestade', 'susanoo:gelo'] };
const GELO = /^(gelo|gelad\w*|congel\w*|gélid\w*|neve|nevasca)$/i;
// nomes que usam a palavra como metáfora ou dentro do próprio tema (quantidade, golpe, idioma)
export const IDIOMA = new Set([
  'Chuva de Estojos', 'Meia-Lua de Frente', 'Fogo Cruzado: Abrir', 'Fogo Cruzado: Fechar', 'Mar de Chamas', 'Chuva de Fagulhas', 'Chuva de Meteoritos Rubros', 'Chuva de Cinzas',
  'Terra Calcinada', 'Faísca no Óleo', 'Sangue Fervente', 'Mar de Chamas Contido', 'Mar de Chamas Ventoso', 'Mar de Chamas da Terceira Vez', 'Chuva de Pedras', 'Chuva de Estilhaços',
  'Fio Terra', 'Raio Solar', 'Mais Rápido Que a Luz', 'Chuva de Raios', 'Chuva de Detritos', 'Chuva de Luz', 'Chuva de Pétalas Brancas', 'Luz que Consome o Veneno', 'Eclipse Inverso',
  'Chuva de Lampejos', 'Gelo na Espinha', 'Sangue Frio', 'Maré Vermelha', 'Chuva Rubra', 'Tempestade de Sangue', 'Mar de Sangue', 'Ritual: Maré Escarlate Eterna', 'Chuva Carmesim',
  'Sangue Inerte', 'Mutação: Sangue Ácido', 'Cérebro Queimado', 'Chuva de Esferas', 'Rocha Contra Rocha', 'Jan-Ken: Pedra!', 'Chuva de Armas', 'Chuva de Meteoros', 'Canhão de Aura Gélido',
  'Chuva de Lascas', 'Chuva de Lâminas', 'Chuva de Flechas', 'Chuva do Fim', 'Ritmo no Sangue', 'Forma Carmesim: Fornalha', 'Sangue Mutante', 'Faro de Tempestade',
]);
// [nome novo, descrição nova (opcional)]: a migração dá a quem tinha o nome antigo a técnica com o nome novo
export const RENOMES = {
  'Sangue por Fôlego': ['Vida por Fôlego', 'Sem aura, o golpe sai do próprio corpo.'],
  'Sombra Fugaz': ['Sumiço Fugaz'], 'Corte Purificador': ['Corte Herege'], 'Corte do Eclipse': ['Corte do Ponto Cego'], 'Golpe da Sombra': ['Golpe do Ponto Cego'],
  'Sombra Dupla': ['Duplo de Palha', 'Um boneco de palha e pano luta ao lado do ninja, até alguém perceber.'],
  'Bomba de Fumaça': ['Bomba de Pó', 'Uma lata que solta uma nuvem de pó cinza; o grupo some nela.'], 'Bomba de Fumaça Dupla': ['Bomba de Pó Dupla', 'Duas bombas, duas nuvens de pó.'],
  'Fumaça Ardida': ['Pó nos Olhos', 'O pó entra nos olhos dos inimigos.'], 'Fumaça e Marca': ['Pó e Marca', 'No meio do pó, o caçador marca a presa.'],
  'Pele Ardente': ['Músculos Despertos', 'A marca acorda os músculos.'], 'Dança do Sol Poente': ['Dança do Último Fôlego'],
  'Runa da Chama': ['Runa do Impacto', 'Um triângulo riscado no ar concentra a força do golpe no meio dele.'], 'Passo Relâmpago': ['Passo Instantâneo'], 'Papel ao Vento': ['Leve como Papel'],
  'Grito da Tempestade': ['Grito Ensurdecedor', 'Um grito que atordoa quem estiver perto.'],
  'Lança do Sol Rubro': ['Lança Incandescente', 'Uma lança de fogo branco, forjada no fogo do deus e arremessada de uma vez.'],
  'Tiro Solar': ['Tiro Incandescente', 'Um único tiro em brasa, que racha o ar e queima o alvo.'], 'Sol em Miniatura': ['Brasa Comprimida', 'A brasa é apertada na palma até virar uma bola branca de calor.'],
  'Sol de Kagutsuchi': ['Grande Fornalha de Kagutsuchi', 'Uma fornalha inteira desce sobre o campo e ninguém escapa do calor.'], 'Flecha do Sol Poente': ['Flecha de Brasa'],
  'Sol Negro Engolido': ['Fogo Negro Engolido'], 'Corpo de Sol': ['Corpo de Chama'], 'Segundo Sol': ['Céu em Chamas', 'Limite: o fogo do deus sobe ao céu e cai sobre todos.'],
  'Ritual: Sol Negro': ['Ritual: Fogueira Negra', 'Uma fogueira sem luz se acende no campo; queima e enche os corações de pavor.'],
  'Ritual: Pira de Purificação': ['Ritual: Pira do Exílio', 'Um fogo limpo que queima a doença e as maldições sem tocar a carne.'], 'Fogo Radioativo': ['Fogo Que Não Apaga', 'A chama que sai da carne não apaga.'],
  'Ciclone de Espada': ['Redemoinho de Espada'], 'Trovão do Mar': ['Rugido do Mar', 'O mar ruge e a onda congela quem pega.'],
  'Tempestade Eletrolítica': ['Tempestade Salgada', 'Uma tempestade de água salgada que gela até o osso.'],
  'Erupção Tectônica': ['Ruptura Tectônica', 'As placas do chão se abrem e rasgam quem está em cima.'], 'Fagulha Veloz': ['Faísca Veloz'], 'Sangue Elétrico': ['Nervos Elétricos', 'Os nervos correm em pulsos, sempre prontos para a próxima descarga.'],
  'Sombra do Vendaval': ['Vulto do Vendaval', 'Um golpe tão veloz que parece surgir do nada.'],
  'Faísca de Sol': ['Lampejo de Sol', 'Um lampejo de luz solar que ofusca.'], 'Faíscas de Sol': ['Lampejos de Sol', 'Três lampejos de luz.'], 'Chuva de Faíscas Solares': ['Chuva de Lampejos', 'Lampejos sobre todos.'],
  'Faísca de Sol Rubro': ['Lampejo Rubro', 'O lampejo vem vermelho do sol poente.'], 'Faísca que Marca': ['Lampejo que Marca'], 'Fagulhas de Luz': ['Pontos de Luz'],
  'Halo Ardente': ['Halo Purificador', 'Um anel de luz cai sobre o alvo e purifica o que ele carrega de ruim.'], 'Queimar a Marca': ['Iluminar a Marca'],
  'Maré da Noite': ['Vaivém da Noite'], 'Eco da Tempestade': ['Eco do Pesadelo', 'O pesadelo ecoa e o alvo dorme de novo.'], 'Voto da Última Chama': ['Voto do Último Fôlego', 'Quanto mais perto da morte, mais forte o sangue corre.'],
  'Lua Vermelha': ['Noite Vermelha', 'Limite: o céu fica vermelho e todo inimigo sangra pela pele.'], 'Lua de Sangue': ['Noite de Sangue', 'O céu fica vermelho e o ar cheira a ferro.'],
  'Lua Escarlate': ['Céu Escarlate', 'O sangue de todos sobe ao céu e cai de volta.'],
  'Chuva Ácida': ['Nuvem Ácida', 'Uma nuvem corrosiva desce e envenena todos os inimigos.'], 'Chuva Radioativa': ['Poeira Radioativa', 'Uma poeira de luz doentia cobre toda a linha inimiga.'],
  'Chuva Negra': ['Esporos Negros', 'Esporos escuros e espessos cobrem o campo e deixam as marcas.'], 'Chuva Radiante': ['Pó Radiante', 'Um pó sujo e brilhante, que queima onde cai.'],
  'Chuva Verde': ['Nuvem Verde', 'Uma nuvem verde que desce só sobre os inimigos.'], 'Chuva de Isótopos': ['Nuvem de Isótopos'],
  'Ritual: Luz Fantasma': ['Ritual: Brilho Fantasma', 'Um brilho verde que não vem de lugar nenhum e não sai mais da pele.'], 'Ritual: Sol Artificial': ['Ritual: Reator Artificial', 'Um reator de laboratório acende no meio do campo. Exige concentração.'],
  'Secreção Oleosa': ['Secreção Tóxica', 'A pele sua um líquido que envenena quem toca.'],
  'Luz Que Inverte': ['Aura Que Inverte'], 'Aura Elétrica': ['Aura de Navalha', 'A aura fica afiada na ponta dos dedos.'], 'Choque de Contato': ['Revide de Contato', 'Todo golpe recebido devolve um estalo de aura.'],
  'Faísca Escura': ['Estalo Escuro'], 'Fagulha Negra': ['Estalo Negro'], 'Faísca Concentrada': ['Golpe no Milionésimo'], 'Trovão Interno': ['Pulso Interno', 'Aura guardada nos músculos acha os pontos fracos.'],
  'Relâmpago Divino de Aura': ['Reflexo Divino de Aura', 'A aura envolve os nervos e o corpo reage sozinho, mais rápido que o pensamento.'], 'Tempestade Negra': ['Turbilhão Negro'],
  'Ritual: Armadura de Sangue': ['Ritual: Armadura de Ectoplasma', 'Uma camada de ectoplasma endurece sobre a pele como couro.'], 'Sangue Negro': ['Icor Negro', 'Um icor escuro fecha o corte sozinho.'],
  'Sangue de Ferro': ['Carne do Outro Lado', 'A carne engrossou depois do primeiro contato com o Outro Lado.'], 'Sangue Que Ferve': ['Fúria do Outro Lado', 'Perto da morte, algo do Outro Lado empurra o corpo.'],
  'Ritual: Sangue Firme': ['Ritual: Selar as Feridas', 'Um selo riscado sobre a ferida a fecha.'], 'Ritual: Chicote de Sangue': ['Ritual: Chicote de Ectoplasma', 'O ectoplasma do ritual vira chicote.'],
  'Ritual: Sangue em Brasa': ['Ritual: Alma em Agonia', 'A alma do alvo se contorce dentro do corpo.'], 'Ritual: Cálice de Sangue': ['Ritual: Cálice de Icor', 'Beber do cálice cura o corpo e enche a aura.'],
  'Contrato de Sangue': ['Contrato Selado', 'Assinado e selado: a entidade luta junto.'], 'Ritual: Gota Que Ferve': ['Ritual: Gota de Icor', 'Uma gota de icor no chão chia e corrói.'],
  'Ritual: Mar Vermelho': ['Ritual: Levante do Derramado', 'Tudo o que foi derramado na luta se levanta contra os inimigos.'], 'Ritual: Maré de Sangue': ['Ritual: Abismo Vermelho', 'O chão se abre vermelho sob os pés.'],
  'Ritual: Toque Gélido': ['Ritual: Toque da Morte', 'A mão da morte pousa no alvo e leva um pouco da vida dele.'],
  'Ritual: Eletrocussão': ['Ritual: Descarga Espiritual', 'Um arco de energia espiritual que trava o corpo.'], 'Ritual: Estática': ['Ritual: Arrepio', 'O ar gela e o cabelo de todos fica em pé.'],
  'Ritual: Tempestade de Estática': ['Ritual: Paredes que Gritam', 'As paredes gritam sem aviso.'], 'Ritual: Chama Fria': ['Ritual: Brilho do Além', 'Um brilho azul que não aquece e não apaga.'],
  'Ritual: Praga': ['Ritual: Maldição Contagiosa', 'Uma maldição velha, trazida de um túmulo, que pula de corpo em corpo.'], 'Espalhar a Praga': ['Espalhar a Maldição'],
  'Ritual: Ceifar a Sombra': ['Ritual: Ceifar a Alma', 'Corta a alma do alvo, e o corpo sente.'], 'As Sombras Dentro de Mim': ['A Coisa Dentro de Mim'],
  'Ritual: Cinzas no Olho': ['Ritual: Pó de Túmulo', 'Pó de túmulo nos olhos do inimigo.'], 'Ritual: Chuva de Cinzas': ['Ritual: Pó de Ossos', 'Pó de ossos cai de um céu sem nuvens.'], 'Ritual: Terra Rachada': ['Ritual: Chão Rachado'],
  'Corte do Relâmpago': ['Corte Que Some'], 'Saque Relâmpago': ['Saque Veloz'], 'Dança da Tempestade': ['Dança das Seis Lâminas'], 'Bastão do Vento': ['Bastão Borrão'],
  'Impacto Sísmico': ['Tremor do Impacto'], 'Chuva de Faíscas': ['Chuva de Lascas', 'O martelo bate no chão e solta lascas em todos.'], 'Martelo do Trovão': ['Martelo Estrondoso'],
  'Faísca Canalizada': ['Vontade Canalizada', 'O foco concentra a vontade num ponto que fere.'], 'Tempestade de Elos': ['Turbilhão de Elos'], 'Marca de Fogo': ['Marca do Chicote', 'Um estalo certeiro que deixa um risco vermelho no alvo.'],
  'Fumaça de Fuga': ['Pó de Fuga', 'Uma bolinha estoura no chão e o corpo some no pó.'], 'Passo de Sombra': ['Passo Mudo'], 'Kunai Envenenado': ['Kunai Serrilhado', 'A ponta serrilhada abre a carne.'],
  'Malabares em Chamas': ['Malabares de Lâminas', 'Lâminas voando por cima da cabeça de todos.'], 'Trovão de Tambores': ['Estrondo de Tambores'],
  'Cantiga de Ninar': ['Cantiga Entorpecente'], 'Canção de Ninar Vil': ['Canção Entorpecente'],
};
// descrições que falavam do elemento de outro dono (o nome fica)
export const DESCRICOES = {
  'Estalo de Dedos': 'Um estalo e uma centelha no rosto do inimigo.', 'Meio-Dia Escaldante': 'O ar vira forno: o calor sobe ao máximo e o fogo ganha força.',
  'Corpo de Tempestade': 'O corpo vira nuvem, chuva e névoa.', 'Geada Cortante': 'Um frio que corta como lâmina e prende os inimigos no lugar.',
  'Toque Solar': 'A mão quente de luz fecha a ferida e purifica a doença.', 'Febre Atômica': 'Uma febre que consome o corpo e esquenta o ar ao redor.',
  'Teia de Aura': 'Uma teia de Aura elástica que gruda no alvo; serve para puxar objetos leves ou se lançar até os pesados.',
  'Raio Negro': 'O golpe sai rodeado de estalos negros e trinca a guarda.', 'Punho Meteoro: Cometa': 'O punho cai de cima com uma cauda de aura.',
  'Presente do Caos': 'Energia: o caos escapa da pele em fios que escolhem sozinhos.', 'Página Marcada': 'Abre o grimório na página certa, e a página obedece.',
};
// na descrição, só as palavras que não têm uso comum viram regra (eletricidade e radiação)
const DESC = { indra: /\b(elétric\w*|eletricidade|trovão|trovões|relâmpago\w*|faíscas?)\b/i, hiruko: /\b(radiação|radioativ\w*)\b/i };
// combinações que já existiam sem marcar o Vínculo parceiro
const COMBINA = { 'Raio Solar': 'amaterasu', 'Vento Incendiário': 'kagutsuchi' };

// status → donos. Os demais (stun, down, root, exposed, marked, bleed, atkDn...) são de todos.
const DONO_ST = { burn: ['kagutsuchi'], oil: ['kagutsuchi'], wet: ['susanoo'], frozen: ['susanoo', 'fuhaku'], para: ['indra'], blind: ['amaterasu', 'tsukuyomi'], sleep: ['tsukuyomi'],
  confuse: ['tsukuyomi', 'aura', 'oculto'], fear: ['tsukuyomi', 'oculto'], dread: ['tsukuyomi', 'oculto'], possess: ['tsukuyomi', 'aura', 'oculto'], poison: ['hiruko'], rad: ['hiruko'] };
// o equivalente do setor: controle (para, sono, congelar...), dano contínuo (queimar, veneno...) e debuff (molhado, oleado, cego, medo)
const CTL = { kagutsuchi: 'stun', susanoo: 'frozen', atlas: 'down', indra: 'para', fuhaku: 'down', amaterasu: 'blind', tsukuyomi: 'sleep', shukketsu: 'root', hiruko: 'stun', marcial: 'stun', armas: 'stun', aura: 'stun', oculto: 'fear' };
const DOTD = { kagutsuchi: 'burn', susanoo: 'bleed', atlas: 'bleed', indra: 'exposed', fuhaku: 'bleed', amaterasu: 'exposed', tsukuyomi: 'fear', shukketsu: 'bleed', hiruko: 'poison', marcial: 'bleed', armas: 'bleed', aura: 'bleed', oculto: 'curse' };
const TIPO = { para: CTL, frozen: CTL, sleep: CTL, confuse: CTL, possess: CTL, burn: DOTD, poison: DOTD, rad: DOTD, wet: null, oil: null, blind: null, fear: null, dread: null };
const DEBUFF = { kagutsuchi: 'exposed', susanoo: 'wet', atlas: 'exposed', indra: 'exposed', fuhaku: 'exposed', amaterasu: 'blind', tsukuyomi: 'fear', shukketsu: 'exposed', hiruko: 'exposed', marcial: 'exposed', armas: 'exposed', aura: 'atkDn', oculto: 'fear' };

const items = fx => String(fx || '').split(';').map(x => x.trim()).filter(Boolean);
const combo = (s, own) => s.v2 === own || new RegExp('\\brs ' + own + '\\b').test(s.fx || '') || !!s.trio || /aliad[oa]/i.test(s.d || '');
const pode = (el, st, s) => !DONO_ST[st] || DONO_ST[st].includes(el) || DONO_ST[st].some(o => combo(s, o));
const troca = (el, st) => { const t = TIPO[st]; const novo = t ? t[el] : DEBUFF[el]; return novo && pode(el, novo, {}) ? novo : 'exposed'; };
function limparFx(el, s, fx) {
  return items(fx).map(f => {
    const w = f.split(/\s+/);
    if (w[0] === 'st' && !pode(el, w[1], s)) w[1] = troca(el, w[1]);
    if (w[0] === 'drain' && el !== 'shukketsu' && !combo(s, 'shukketsu')) return 'st regen 2 self'; // dreno é de Shukketsu: fora dele, o golpe só ajuda o corpo a se refazer
    return w.join(' ');
  }).filter((f, i, a) => a.indexOf(f) === i).join('; ');
}

export function temas(TREE) {
  const todos = []; for (const [el, t] of Object.entries(TREE)) for (const b of t.branches) for (const s of b) todos.push([el, s, b]);
  const nomes = new Set(todos.map(([, s]) => s.n));
  for (const [velho, [novo]] of Object.entries(RENOMES)) { if (!nomes.has(velho)) throw new Error(`temas: "${velho}" não existe na árvore`); if (nomes.has(novo)) throw new Error(`temas: "${novo}" já existe`); }
  const ren = n => RENOMES[n]?.[0] || n, renL = v => v && String(v).split('|').map(ren).join('|');
  for (const [el, s, b] of todos) {
    const r = RENOMES[s.n]; if (r) { s.n = r[0]; if (r[1]) s.d = r[1]; }
    for (const k of ['pre', 'combo', 'duo', 'amp']) if (s[k]) s[k] = renL(s[k]);
    if (b.de) b.de = ren(b.de);
    if (COMBINA[s.n]) s.v2 = COMBINA[s.n];
    if (DESCRICOES[s.n]) s.d = DESCRICOES[s.n];
    const casa = el === 'armas' ? 'armas' : el;
    if (s.fx) s.fx = limparFx(casa, s, s.fx); if (s.rx && !/\brs\b/.test(s.fx || '')) s.rx = limparFx(casa, s, s.rx);
    if (s.st && !pode(casa, s.st, s)) s.st = troca(casa, s.st);
    if (s.dom) s.dom = s.dom.replace(/\btick (\w+)/, (m, k) => pode(casa, k, s) ? m : 'tick ' + troca(casa, k));
  }
  const erros = validar(TREE);
  if (erros.length) throw new Error('temas: fora do dono\n' + erros.join('\n'));
}

// a regra: nome com palavra de outro dono (fora das combinações e dos idiomas) ou status de outro dono é erro
export function validar(TREE) {
  const erros = [];
  for (const [el, t] of Object.entries(TREE)) for (const b of t.branches) for (const s of b) {
    const casa = el;
    for (const [own, re] of Object.entries(DONO)) {
      if (own === casa || combo(s, own) || IDIOMA.has(s.n)) continue;
      const m = s.n.match(re); if (!m) continue;
      const w = m[0].toLowerCase();
      if ((PARTILHA[casa] || []).some(p => p === own + ':' + w || (p === own + ':gelo' && GELO.test(w)))) continue;
      erros.push(`${el} · ${s.n}: "${m[0]}" é de ${own}`);
    }
    for (const [own, re] of Object.entries(DESC)) if (own !== casa && !combo(s, own) && !IDIOMA.has(s.n) && re.test(s.d || '')) erros.push(`${el} · ${s.n}: descrição fala de ${own} ("${(s.d || '').match(re)[0]}")`);
    const sts = [...items(s.fx), ...items(s.rx && !/\brs\b/.test(s.fx || '') ? s.rx : '')].filter(f => f.startsWith('st ')).map(f => f.split(/\s+/)[1]);
    if (s.st) sts.push(s.st);
    for (const k of sts) if (!pode(casa, k, s)) erros.push(`${el} · ${s.n}: status ${k} é de ${DONO_ST[k].join('/')}`);
    if (/\bdrain\b/.test(s.fx || '') && casa !== 'shukketsu' && !combo(s, 'shukketsu')) erros.push(`${el} · ${s.n}: dreno é de shukketsu`);
  }
  return erros;
}
