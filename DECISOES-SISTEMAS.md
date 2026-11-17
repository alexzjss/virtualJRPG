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
