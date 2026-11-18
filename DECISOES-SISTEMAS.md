# Sistemas novos: decisões

Escolhas do usuário em questionário (combate, mesa, árvore). As Perícias estão em `PERICIAS.md`.
Regra geral: **cada mecânica ganha teste em `tools/test.js`; as de combate passam pelo `tools/sim.js` antes de entrar.**

## Combate (inspirado em JRPGs)
- **Barra de Quebra** (Octopath/FFXIII): só em **chefes e elites**. Fraquezas e golpes em partes do corpo derrubam o escudo; Quebrado perde o turno e leva +50%.
- **Fraqueza adianta o turno** (SMT): fraqueza ou crítico dá `haste` no próprio turno.
- **Ataque Total** (Persona): quando **todo inimigo vivo está Derrubado ou Quebrado**, o próximo herói pode chamar o golpe conjunto.
- **Passar a Vez** (Persona 5): depois de acertar uma fraqueza, entrega o turno a um aliado com bônus.
- **Pontos de Coragem** (Bravely): defender guarda 1 ponto (máx. 3); gastar pontos dá ações extras em sequência; ficar devendo atrasa o personagem na fila.
- **Tensão** (Dragon Quest): gastar o turno acumulando força, ×1,5 / ×2 / ×3 no próximo golpe.
- **Barra de Cadeia** (Xenoblade): fraquezas, críticos e dano em sequência enchem a barra; cheia, cada herói ataca em seguida com bônus crescente.
- **Expansão de Domínio** (Jujutsu): **nó final de cada Vínculo** (9), com o Despertar do patrono. Custa **toda a Aura**, dura 3 turnos e deixa o usuário **Exausto** ao acabar.
  **Choque:** disputa de Aura (INT ou SAB + Aura restante). O vencedor fica; o perdedor perde o Domínio e fica Exausto.
- **Clima** (Pokémon): a cena define o clima inicial (o mestre escolhe na janela Cena); skills de Vínculo trocam o clima por N turnos.
- **Reações elementais** (Genshin): **~8 reações-chave**, uma ou duas por Vínculo, com as condições novas Molhado e Oleado.
- **Técnicas em trio** (Chrono Trigger): **~12**, uma por trio temático.
- Ficam de fora: níveis de Limite, fileiras, aprender de inimigos, roubar, status clássicos novos.

## Mesa (RPGs de mesa)
- **Aflição/Virtude** (Darkest Dungeon): quando a **Sanidade chega a 0**, rola SAB. Falha = Aflição até o descanso longo; crítico = Virtude. Volta com 25% da Sanidade.
- **Vantagem/Desvantagem** (D&D): 2d100, fica com o melhor ou o pior. Vem do **mestre ao aprovar** (botão na faixa de pedidos) e de **condições** (Foco, Cego) fora de combate.
- **Laços entre personagens** (Persona/Fire Emblem): nível 0-5 por par. Sobe no "conversar" do acampamento escolhendo alguém. Os níveis destravam técnicas em dupla e passivas de vizinhança.
- Ficam de fora: traumas e manias, Barganha do Diabo, Aspectos, Concentração, tempo livre, **Origens**.

## Árvore
- **Nós de fronteira (fusão)** entre Vínculos vizinhos na grade (`cs: duplo`).
- **Nós-chave** (Path of Exile): **1 por setor (~12)**, passivas enormes com desvantagem forte, num ponto difícil de alcançar.
- **Sinergias Aura × Vínculo** e um **ramo-ponte Aura ↔ Ocultismo**.
- **Slots de passivas:** 4 + 1 a cada 100 XP gasto, trocados no acampamento.
- **Desaprender nós:** não é permitido. As escolhas são permanentes.
- **Interface:** busca por efeito e por função, caminho até um nó com o XP total, builds salvas e favoritos, "o que dá para aprender agora".

## Pendências
- **`tools/audit.js`:** acha poder/XP fora da curva, nomes que não cumprem o efeito e repetições nos ~600 nós não revisados; corrigir o que ele apontar.
- **Serafim Caído:** resolvido (lacaios da fúria sem suporte); ver o balanço abaixo.
- **Renomear o id `radiacao` → `hiruko`**, com migração das fichas salvas na inicialização.

## Divisão de trabalho
Tudo foi feito numa só sessão (a sessão separada de Perícias foi interrompida antes de começar).

## Estado
Tudo acima foi implementado nesta sessão. Detalhes e arquivos: `ARVORE-SISTEMAS.md` (mecânicas), `PERICIAS.md` (ofícios), `tools/audit.js` e `tools/test.js`.
- Fraqueza que adianta o turno: derrubar já dava um turno extra; agora acertar fraqueza em quem já está Derrubado reduz a ação em 25%.
- Passar a Vez e Coragem vão na própria ação (`pass`, `brave`); Defender, Concentrar e Ataque Total são comandos novos.
- Os nós-chave somam bônus permanentes (`bon`) mesmo que a passiva saia dos slots.

## IA dos inimigos: Domínio, Defender, Concentrar e trio (decisões desta frente, escolhidas pela opção mais conservadora)
- **Opt-in por entrada do bestiário:** campo `ia` ausente = comportamento antigo. `dom: 1`, `defend: p`, `focus: p`, `trio: 1`. O interruptor geral é `R.iaExtra` (`VJ_RULES='{"iaExtra":false}'`).
- **Domínio:** só chefes, **no máximo 1 por combate** (`domUsed`), com o mesmo custo/duração/Choque dos heróis. Abre com a vida < 75% ou na fúria, ou na hora se um Domínio dos heróis está aberto (para o Choque). Só entra na lista de skills do chefe se o grupo é veterano (`domCap` 35 ≈ poder 64+); com grupos novos o chefe não leva o Domínio. Escolhidos: **Leviatã do Porto** (Mar Sem Fim), **Condessa Escarlate** (Banquete Rubro), **Filho de Hiruko** (Reator Aberrante). Ifrit, Senhor dos Pesadelos e Serafim ficaram sem (já estavam no limite baixo ou, no caso do Serafim, a luta já é longa e o Domínio defensivo a levava a ~94%).
- **Defender** (vida < 40%) e **Concentrar** (vida > 50%): intervalo de 3 turnos entre os dois, chance `p` por turno. Leviatã e Condessa concentram (.15), Serafim defende (.2). Coragem (ação extra) **não** foi dada aos inimigos.
- **Trio:** o Oni de Brasa, o Tengu do Vendaval e o Raijū trazem a técnica "Tempestade Ígnea" (só sai com os três de pé). Comuns gerados (`genFoe`) e encontros automáticos continuam sem Domínio nem trio.
- **Cadeia** segue só dos heróis.
- **Ajustes de equilíbrio:** Leviatã `hp 1,4` e Condessa `hp 1,2` (o Domínio os deixava ~96% / 91%); Serafim voltou a `arma -4 / hp 0,6` (com `hp 0,7-0,8` o nível 0 caía sem o nível 2 mudar).
- **Medições** (`sim.js 80 boss`, 4 heróis, nível 0 / nível 2; antes → depois): Leviatã 88/91 → 78/93 · Condessa 80/88 → 74/86 · Filho de Hiruko 68/66 → 66/77 · Serafim 80/80 → 76/89 (agora dentro da faixa; ainda alto no nível 2, anotado) · Ifrit 56/49 → 53/55 · Colosso 71/71 → 83/80 · Arconte 75/81 → 78/72 · Rainha 66/71 → 72/64 · Senhor dos Pesadelos 51/51 → 50/58 (os sem `ia` variam só por ruído).
- **Encontros** (`sim.js 60 enc`, fácil→mortal; antes → depois, 4 heróis nível 0: 88/75/57/32 → 95/72/50/37; nível 1: 100/95/92/77 → 100/95/88/83; nível 2: 97/80/58/25 → 100/73/45/23). Inalterados (os encontros gerados não usam `ia`), tudo dentro do ruído de ±10.
- `tools/sim.js` ganhou `SIMDOM=1` (conta Domínios abertos) e `SIMDBG=1` (vida/Aura do chefe a cada turno).

## Armas: expansão (questionário desta frente)
- Tipos novos: **corrente**, **arremesso**, **arco e besta**; armas em par são um **traço** (`dupla`, 2º golpe a 50% no mesmo alvo, só em golpe único), não um tipo.
- 4 a 6 modelos novos por tipo (71 no total), com o tom misto atual (caçadores de 1910-1920 + folclore japonês). **Só na Forja**: catálogo e lojas ficam para depois.
- Armas de distância (fogo, corrente, arremesso, arco) **não sofrem contra-ataque**; nenhuma outra regra de distância.
- **Flechas** no slot de munição (prata, incendiária, envenenada, ponta de aço, corda, sinal), no catálogo e com receita na Caça; arremesso não usa munição.
- Arremesso usa DES (bumerangue e chakram: média DES/AGI). Os tipos novos ganham golpe supremo de lendária.
- Pistolas Gêmeas viram arma em par.
- **Trilhas de 10 nós** no tronco Marcial para pesada, foco, corrente, arremesso e arco, com postura, reação, passiva de maestria e golpe final com requisito 55 do atributo do tipo.

## Armas: escopo maior (questionário desta frente)
- **Básicas:** uma básica Comum por modelo, com o nome do modelo; modelos que já tinham básica não duplicam. **Lojas por cena** com tema (Beco, Santuário, Estação, Mansão), cada arma em 1 ou 2.
- **Tipos novos:** escudos e instrumentos musicais; trilha de 10 nós na árvore para os dois. Só esses dois (não os 18 modelos extras nos tipos antigos, nem explosivos nem armas naturais).
- **Escudo:** arma de mão que é ele mesmo (sem slot extra). Regras: defesa fixa (`mod def`), **bloqueio de golpe** (chance fixa, −60% e sem condições), guarda-costas (`guard`) e ataque de borda.
- **Instrumento:** arma de foco com buffs de grupo (sem regra de "canto contínuo"); CAR, e SAB nos sopros.
- **Criar a partir das básicas:** duplicar e editar, variantes elementais com 1 clique (os 9 elementos), **pacotes de traços** (elemento, status e qualidade; empilham até 3), exportar/importar `.json` e colar texto. Tudo dentro da Forja de armas, na lista lateral.
- Bestiário com armas: fora do escopo.

## Leva 3 (questionário de 2026-11-17) — implementada (116 nós, ver ARVORE-SISTEMAS.md)
Revisão antes: `tools/revisao-efeitos.js` (estática) e `tools/revisao-uso.js` (usa cada uma das 1390 ativas em batalha real):
0 erros, 0 recusas, 0 nós sem efeito; os 7 apontamentos estáticos são custos intencionais (Exposto/Enraizado em si, Pavor no reerguido).
- **Tamanho:** ~120 nós.
- **Fora:** Haki, Bankai/formas em 2 estágios. Sem preferência (não entram por ora): Estresse, Fabula, Zero, BP, Postura, Magia Azul, Manifestações, ampliações de horror.
- **Aparar (Expedition 33):** botão com janela curta na tela do jogador alvo. Só contra golpe **físico** de alvo único (não área nem mental);
  só quem tem um nó de Aparar vê o botão (nós melhores alargam a janela); cada tentativa custa Aura; limite de tentativas por rodada;
  errar o tempo = golpe +50% e Exposto. Acertar: anula dano e condição, dá recurso (Aura/Limite/carga) e tira ponto da Barra de Quebra.
  **Chefes e elites** também aparam golpes físicos dos jogadores por chance (log avisa; quem foi aparado fica Exposto).
- **Black Flash (JJK):** crítico especial raro só em técnicas marcadas: faixa no d100 (01-05, cresce com nós) → ×2,5 e devolve Aura.
- **Técnica Reversa (JJK):** converter Aura em cura de si. **Marcas (Caçador):** despertam sozinhas ao cair abaixo de 30% de HP (1×/batalha).
  Preço dos dois: HP máximo e Sanidade, que voltam no **descanso longo**.
- **Clones:** fichas reais na fila (como invocações), nascem com uma fração do HP atual do dono (que perde esse HP) e causam 50% do dano.
  Ramos: Tsukuyomi (sombras), Fuhaku (imagens residuais), Hiruko (brotos de carne) e Aura/Conjuração (aberto a todos).

## Leva 4 (questionário de 2026-11-17) — comandos de ação, implementada (ver ARVORE-SISTEMAS.md e o spec)
Inspirações: Mario RPG, Dragon Ball Legends, Clair Obscur. 10 mecânicas numa leva só: Aparar e Esquiva (uma tecla, o tempo decide), Golpe no tempo,
Martelar, Segurar e soltar, Sequência, Ritmo do instrumento, Mira em ponto fraco, Desenhar runa e Choque de poderes.
- **Janela só em golpes anunciados** (⚠, `tel`) e em golpes físicos de alvo único contra quem tem Aparar; só o alvo vê o anel. Esquiva de graça e sem limite; Aparar custa Aura, rende recurso e **expõe o inimigo**.
- **Ignorar nunca pune** nos comandos de ataque; exceções: o estouro do Segurar e o Aparar, que é aposta. Sem modo assistido.
- **Black Flash** deixou de ser sorte no d100: só o Perfeito do Golpe no tempo dispara. Chefes têm 20% de golpe anunciado Perfeito.
- **Aparar todas as batidas** de um golpe de vários golpes devolve um contra-ataque automático (básico ×1,5).
- Decisões minhas conferidas no spec §11: alvo escolhido antes da janela; Exposto no atacante dura 2 (1 se gasta no próprio fim de turno); Choque só em alvo único; `telK` calculado uma vez; `pre` dos nós novos = primeiro nó do ramo temático.

## Comandos cinemáticos — Leva 1 (questionário de 2026-11-17; spec `2026-11-17-comandos-cinematicos-design.md`)
- **Palco de tela cheia** (`public/js/palco-cmd.js`, estilo QTE de anime) para os 7 comandos de ataque e para a defesa/Choque: faixas de cinema, retratos, linhas de velocidade, faíscas por toque, tremor, hit-stop, sons sintetizados, vibração e tela de resultado com "o que rendeu".
- **Graus:** `'' | erro | bom | otimo | perf`. Pular, Esc e prazo sem toque = normal (sem punição); só **tentar e errar feio** (`erro`) custa ×0,85. Ótimo (×1,3 no Tempo, ×1,45 no Segurar) não dá `pf`. Mecânicas de contagem: ≥100% Perfeito, ≥75% Ótimo, ≥35% Bom, abaixo disso Erro.
- **Dificuldade pelo requisito do nó** (`RULES.CMD.tier`): fácil < 20, médio 20–49, difícil ≥ 50; janelas menores, fintas (anel que acelera e freia, anel falso, mira que muda de direção e ponto que se move, notas coladas no Ritmo, batidas irregulares na Sequência) e Perfeito ×1,5 (Segurar ×1,7) no difícil. A nota vem do navegador; o servidor só limita o teto (confiança numa mesa de amigos).
- **Fintas na defesa** (servidor: `finPlan`, `C.fin` paralelo a `C.beats`): só elites (30% das batidas) e chefes (todas; combos irregulares e direção ←/→ da esquiva em golpe anunciado). Anel falso = apertar ali é "cedo"; o tempo do impacto é sempre o do servidor.
- `C.beats` continuou `number[]`; as fintas ficam em `C.fin` para não quebrar o resto.
- Adiado para as próximas levas: QTE/Girar/Corte, Limite em 3 fases, série de Perfeitos, comandos em centenas de nós, filtro/ícone na mandala, Praticar e painel da mesa.
- (2026-11-18) A janela de defesa também abre quando o mestre escolhe o golpe do inimigo à mão, e o **ataque básico** abre Esquiva para todo alvo (antes só o golpe anunciado). Choque e Perfeito de chefe seguem só no anunciado.
