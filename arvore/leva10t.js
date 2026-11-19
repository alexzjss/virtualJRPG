// Leva 10: Tsukuyomi (lua, trevas, ilusão, sono, medo).
import { N } from './l8.js';

export const LEVA10T = {
  'Passo do Cão-de-Caça': [
    N('Faro Apurado', 'O faro aguça, e o caçador sente quem se esconde.', 'u/4 s', 'st focus 2'),
    N('Faro de Pesadelo', 'O cão fareja o medo mais antigo do alvo.', 'm10/5', 'st fear 1 40%'),
    N('Rastro na Escuridão', 'O rastro marca o alvo mesmo no escuro.', 'm8/4', 'st marked 2'),
    N('Faro Que Acumula Sombras', 'Cada rastro guarda uma sombra para a próxima caçada.', 'u/6 s', 'stack sombra 5; st focus 1'),
    N('Faro Que Cobra o Medo', 'O cão cobra o medo de quem já está assustado.', 'm14/8', 'vs fear 1.5; st fear 2'),
    N('Faro de Trevas', 'Todos os inimigos ficam marcados, mesmo os que se escondem.', 'u/10 a', 'st marked 2 foes'),
    N('Faro do Cão do Eclipse', 'O cão do eclipse não perde o rastro de quem tem medo.', 'm36/14', 'st fear 3; vs marked 1.6'),
  ],
  'Mundo do Tsukuyomi': [
    N('Mundo em Penumbra', 'O mundo escurece um pouco, o bastante para sumir.', 'u/4 s', 'st stealth 1'),
    N('Mundo de Névoa Escura', 'Uma névoa escura cobre os olhos do alvo.', 'm8/5', 'st blind 1 40%'),
    N('Mundo de Sono Leve', 'Um sono leve desce sobre todos os inimigos.', 'm8/8 a', 'st sleep 1 30%'),
    N('Mundo dos Pesadelos', 'Cada inimigo vê o que mais teme.', 'm12/10 a', 'st fear 2'),
    N('Mundo Que Acumula Sombras', 'Cada visita ao mundo deixa uma sombra no caçador.', 'u/8 s', 'stack sombra 5; st focus 1'),
    N('Mundo de Portas Falsas', 'Um mundo sem portas: quem entra confunde o caminho e o medo.', 'm18/12 a', 'st confuse 2; st fear 1'),
    N('Mundo Que Adormece o Medo', 'O medo vira sono, e o sono não acorda tão cedo.', 'm20/12', 'conv fear sleep'),
    N('Mundo de Lua Eterna', 'A lua nunca se põe: todos dormem e quem teme dorme mais.', 'm40/20 a', 'st sleep 2; vs fear 1.6'),
  ],
  'Sussurro Sombrio': [
    N('Sussurro Que Se Acumula', 'Cada sussurro empilha uma sombra na mente do caçador.', 'm10/6', 'stack sombra 5; st fear 1'),
    N('Sussurros em Coro Escuro', 'Vozes no escuro sussurram para todos de uma vez.', 'm12/10 a', 'st fear 2'),
    N('Sussurro Cobrador', 'O sussurro cobra o medo que já estava lá.', 'm14/9', 'vs fear 1.5; st fear 2'),
    N('Sussurro Detonador', 'Toda a sombra guardada grita ao mesmo tempo.', 'm16/11', 'burst sombra .4; det fear 6'),
    N('Sussurro do Pesadelo Eterno', 'Um sussurro que nunca termina e que ninguém esquece.', 'm38/18 a', 'st fear 3; vs fear 1.6'),
  ],
  'Eco Distante': [
    N('Eco Que Acumula Pesadelos', 'Cada eco volta mais sombrio.', 'm16/9', 'stack sombra 5; st fear 1'),
    N('Eco do Fim dos Sonhos', 'O último eco, que só ouve quem ficou sozinho.', 'm36/16', 'st fear 3; solo 1.6'),
  ],
};
