# Próximos passos (instruções para o agente que continuar)

Leia primeiro: `README.md`, `ARVORE-SISTEMAS.md` (mecânicas e notação dos nós), `DECISOES-SISTEMAS.md` (o que o usuário decidiu), `PERICIAS.md` (ofícios) e `REVISAO-ARVORE.md`.
O usuário escreve em português; responda e comente o código em português, no estilo existente. Decisões já tomadas não se perguntam de novo: use `AskUserQuestion` só para decisões novas.

## Como trabalhar
- `npm install && npm test` (58 testes devem passar) · `npm run audit` (0 erros; 5 avisos conhecidos de nomes metafóricos) · `node tools/sim.js 60 enc` e `node tools/sim.js 80 boss` para equilíbrio.
- Compare sempre com a base: encontros (nível 0/1/2, fácil→mortal) estavam em ~90/77/93/73/42/23 e chefes entre 46% e 89%. Variação de ±10 pontos é ruído.
- Toda mecânica nova ganha teste em `tools/test.js`; as de combate passam pelo simulador antes de entrar.
- Mudou `tree.js` ou `arvore/`: a grade é refeita ao iniciar (skills ficam pelo nome). Nomes de nós precisam ser únicos (`npm run audit` confere).
- Arquivos: `server.js` (motor), `public/rules.js` e `public/oficios.js` (compartilhados com o navegador), `public/app.js` (interface), `content.js` (grade, itens, bestiário, cenas), `arvore/*.js` (nós).

## Pendências, em ordem sugerida
1. **Revisar os 154 nós novos** (`arvore/sistemas.js`) ramo por ramo com o usuário, como foi feito no Kagutsuchi: poder e XP, efeitos, nomes e descrições. Os nós 🆕 das expansões anteriores também continuam sem revisão nó a nó (`REVISAO-ARVORE.md`).
2. **Testar a interface na mesa de verdade** (só foram abertas a ficha do mestre, a grade e a aba Ofícios, sem erros). Conferir: tela de batalha do jogador (Defender, Concentrar, Coragem, Passar a vez, Ataque Total), faixa de clima/Cadeia/Domínio, barra de Quebra, aprovação de rolagem com Vantagem/Desvantagem, escolha de "conversar com" no acampamento, aba Ofícios do jogador. Ajustar o CSS (`public/style.css`, blocos no fim) em celular.
3. ✅ **IA dos inimigos** (feito): campo opt-in `ia` no bestiário (`dom`, `defend`, `focus`, `trio`); Domínio em 3 chefes, Defender/Concentrar em 3, trio da Tempestade Ígnea; Coragem **não** foi dada aos inimigos. Ver `DECISOES-SISTEMAS.md`. Pendente: `v2` (fusões) continua fora dos inimigos.
4. ✅ **Domínios e trios no bestiário** (feito); `solo` continua excluindo `dom`, `trio` e `v2` dos chefes comuns e dos gerados, só o campo `ia` os reabilita.
5. **Ofícios a refinar:** (feito na sessão `oficios-refino`, veja `PERICIAS.md`, seção "Refino")
   - [x] Ações `checar`: diário de testes na ficha, narração do mestre ao aprovar ou depois.
   - [x] Receitas: preços e custos equilibrados (teste de economia), runas viraram receitas da Forja, loja vende ingredientes básicos.
   - [x] `itemsPage` mostra têmpera, engastes, liga, assinatura e arma viva (Couraceiro/Ourives incluídos).
   - [x] Slot de munição (`mun`) na área de equipamentos.
   - [ ] Dívida de Coragem, Tensão e Cadeia não têm som nem animação (fica com a sessão de interface/sons).
6. **Itens para o mestre:** [x] janela **Catálogo de ofícios** (receitas, perícias, nós e nós novos, persistido em `S.ofiCfg`). Ideias que sobraram: editar runas e assinaturas, ligar uma receita nova a um nó específico, importar/exportar o catálogo.
7. ✅ **Limpeza** (feito): `README.md` descreve a Forja com Economia de Essência e os Ofícios; `docs/index.html` não menciona forja nem acesso novo, ficou como está.

## Armadilhas conhecidas
- `strike` e `doAct` em `server.js` concentram quase todos os efeitos; mudanças ali quebram testes de longe. Rode `npm test` a cada passo.
- Testes que usam `reset()` não reiniciam `S.camp` nem `S.known`: defina o que precisar no começo do teste.
- A Cadeia é só dos heróis (`addChain`); dar Cadeia aos inimigos deixou os encontros bem mais difíceis.
- `normSlots` roda a cada `push()`: passivas lidas na hora (mod, gatilho, voto, amplificação) só valem se estiverem nos slots; passivas de atributo e de `bon` valem sempre.
- O id do Vínculo de Hiruko é `hiruko`; estados salvos com `radiacao` são convertidos ao iniciar.
