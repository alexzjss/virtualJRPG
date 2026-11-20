// Leva 12 (evolução lógica), setor marcial. Dois exports de dados, ligados ao build por arvore/leva12/index.js:
//  ESTENDER: { 'Base': [N(...), ...] }  nós novos no fim da linha de variação que já existe para a base (como arvore/leva10*.js)
//  ABRIR:    { 'Base': [N(...), ...] }  linha de variação nova para uma base que ainda não tem (como LINHAS11 em arvore/leva11b.js)
// Marcial é neutro: só status físicos. O elemento de outro Vínculo entra apenas em combinação (v2 do dono), como Giro em Chamas.
import { N } from '../l8.js';
export const ESTENDER = {
  // as bases ofensivas que só tinham uma variação elemental ganham as outras: cada Vínculo leva a lâmina para o seu lado
  'Golpe Giratório': [
    N('Giro Gélido', 'A volta arrasta o frio da água e deixa os pés presos.', 'd14/9 a', 'st frozen 1 40%', { v2: 'susanoo' }),
    N('Giro de Vento', 'O giro abre um vazio no ar e empurra todos para longe.', 'd14/9 a', 'push 40', { v2: 'fuhaku' }),
    N('Giro Rubro', 'A lâmina volta molhada: o giro arranca vida de quem atravessa.', 'd14/10 a', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Giro Pétreo', 'O peso da rocha entra na volta e quebra a guarda.', 'd16/10 a', 'brk 1; st down 1 40%', { v2: 'atlas' }),
  ],
  'Tiro Certeiro': [
    N('Tiro de Brasa', 'A bala sai incandescente e queima onde para.', 'd18/7', 'st burn 2', { req: 'dist', v2: 'kagutsuchi' }),
    N('Tiro Gélido', 'Uma bala fria que trava o alvo no lugar.', 'd18/7', 'st frozen 1 40%', { req: 'dist', v2: 'susanoo' }),
    N('Tiro Ofuscante', 'O clarão da bala cega quem olha de frente.', 'd18/7', 'st blind 2', { req: 'dist', v2: 'amaterasu' }),
    N('Tiro Rubro', 'A bala abre a veia e leva a vida pelo buraco.', 'd18/8', 'st bleed 2; drain hp 20', { req: 'dist', v2: 'shukketsu' }),
  ],
  'Grito de Guerra': [
    N('Grito Ardente', 'O grito incendeia o sangue dos aliados e arde nos inimigos.', 'u/7 a', 'st atkUp 2; st burn 1 foes', { v2: 'kagutsuchi' }),
    N('Grito Solar', 'O grito vem com a luz do dia e ofusca quem estiver na frente.', 'u/7 a', 'st atkUp 2; st blind 1 foes', { v2: 'amaterasu' }),
  ],
  'Riposte': [
    N('Riposte Gélida', 'A resposta vem fria e trava o braço de quem atacou.', 'd16/7', 'st frozen 1 40%', { v2: 'susanoo' }),
    N('Riposte Rubra', 'A resposta corta fundo e leva a vida de volta.', 'd16/7', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Riposte em Chamas', 'A lâmina responde em brasa.', 'd16/7', 'st burn 2', { v2: 'kagutsuchi' }),
  ],
  'Golpe do Caçador': [
    N('Golpe Rubro do Caçador', 'A estaca abre a veia da presa e a vida escorre para o caçador.', 'd20/8', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
    N('Golpe Peçonhento do Caçador', 'A lâmina vai untada de veneno de caça.', 'd18/8', 'st poison 2', { v2: 'hiruko' }),
    N('Golpe Ardente do Caçador', 'Lâmina em brasa, para quem se esconde na sombra.', 'd20/8', 'vs demon 1.5; st burn 1', { v2: 'kagutsuchi' }),
  ],
  'Granada de Mão': [
    N('Granada Incendiária', 'Estoura em labaredas e deixa tudo em brasa.', 'd12/8 a', 'st burn 2', { v2: 'kagutsuchi' }),
    N('Granada de Choque', 'A explosão solta uma descarga que trava os músculos.', 'd12/8 a', 'st para 1 40%', { v2: 'indra' }),
    N('Granada de Gelo Seco', 'Rebenta numa nuvem gelada que prende quem está dentro.', 'd10/8 a', 'st frozen 1 40%', { v2: 'susanoo' }),
  ],
  'Golpe Limite': [
    N('Limite Trovejante', 'O Limite cai com um estrondo que trava o campo todo.', 'L46', 'st para 1 50%', { v2: 'indra' }),
    N('Limite Rubro', 'O Limite abre todas as feridas ao mesmo tempo.', 'L46', 'st bleed 3; drain hp 15', { v2: 'shukketsu' }),
  ],
  'Golpe Quebra-Guarda': [
    N('Quebra-Guarda Detonador', 'Toda a pressão guardada vai num único golpe.', 'd20/9', 'burst impeto .4; brk 2'),
  ],
  'Dedo-Pistola': [
    N('Dedo-Pistola Que Acumula', 'Cada disparo afina o próximo.', 'd14/7', 'stack impeto 5; sure'),
    N('Dedo-Pistola Detonador', 'Todo o ímpeto guardado sai num disparo só.', 'd22/9', 'burst impeto .4'),
    N('Dedo-Pistola Rubro', 'A bala de dedo abre a veia e leva a vida junto.', 'd20/8', 'st bleed 2; drain hp 20', { v2: 'shukketsu' }),
  ],
};
export const ABRIR = {
  // Dinamite com Pavio (camada 4) → 6 nós
  'Dinamite com Pavio': [
    N('Dinamite Dupla', 'Dois bastões acesos na mesma mão.', 'd9/8 a x2', 'st stun 1 20%'),
    N('Dinamite de Pavio Curto', 'O pavio é tão curto que explode antes de cair.', 'd14/9 a', 'sure'),
    N('Dinamite de Estilhaços', 'Cada bastão se parte em lascas que cortam.', 'd14/10 a', 'st bleed 2'),
    N('Dinamite Retardada', 'Fica plantada no chão até o momento certo.', 'd10/9 a', 'seal 40 2'),
    N('Dinamite em Cadeia', 'Uma explosão acende a seguinte, e a seguinte.', 'd16/11 a', 'echo 60'),
    N('Dinamite Demolidora', 'Um feixe inteiro, de uma vez, no lugar certo.', 'd22/13 a', 'brk 2; st stun 1 40%'),
  ],
  // Mata-Leão (camada 5) → 5 nós
  'Mata-Leão': [
    N('Mata-Leão Firme', 'O braço aperta e não solta mais.', 'd12/8', 'st root 1 50%'),
    N('Mata-Leão Sufocante', 'Sem ar, o alvo apaga por um instante.', 'd14/9', 'st stun 1 40%'),
    N('Mata-Leão Que Acumula', 'Cada segundo de aperto pesa no próximo.', 'd10/9', 'stack impeto 5; st root 1'),
    N('Mata-Leão Detonador', 'Todo o aperto guardado solta num estalo.', 'd20/11', 'burst impeto .4; st stun 1'),
    N('Mata-Leão Definitivo', 'Quando o corpo cede, a luta termina.', 'd24/12', 'st stun 2; vs exposed 1.5'),
  ],
  // Estocada Precisa (camada 6) → 4 nós
  'Estocada Precisa': [
    N('Estocada Dupla', 'Duas pontas no mesmo vão da armadura.', 'd10/9 x2', 'pierce 30'),
    N('Estocada Que Fura', 'A ponta passa pela guarda como se não houvesse.', 'd18/10', 'pierce 60'),
    N('Estocada Que Acumula', 'Cada ponta afina a mão do próximo golpe.', 'd12/10', 'stack impeto 5; sure'),
    N('Estocada Detonadora', 'Toda a precisão guardada sai numa estocada só.', 'd24/12', 'burst impeto .4; pierce 60'),
  ],
  // Malho no Tempo (camada 5) → 5 nós
  'Malho no Tempo': [
    N('Malho Duplo', 'Dois golpes de malho no compasso certo.', 'd9/9 x2', ''),
    N('Malho Que Abala', 'O compasso bate no osso e atordoa.', 'd16/10', 'st stun 1 30%'),
    N('Malho Que Acumula', 'Cada batida deixa o próximo malho mais pesado.', 'd12/10', 'stack impeto 5; brk 1'),
    N('Malho Detonador', 'Todo o tempo guardado cai numa pancada só.', 'd22/12', 'burst impeto .4; brk 1'),
    N('Malho Final', 'A última batida do compasso, a que não se levanta.', 'd26/13', 'brk 2; st down 1 50%'),
  ],
};
