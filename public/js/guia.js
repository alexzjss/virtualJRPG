// Consulta local. Os nomes e efeitos compartilhados continuam em RULES.
{
  const categories = { all: 'Tudo', actions: 'Ações', commands: 'Comandos', effects: 'Efeitos', system: 'Sistema', keys: 'Atalhos' };
  const kindHelp = {
    dmg: 'Reduz o HP. Em Skills, escolha a técnica, selecione o inimigo e confirme. Armadura, elemento, crítico e efeitos da técnica podem alterar o dano.',
    mental: 'Reduz a Sanidade e ignora a armadura. Em Skills, escolha a técnica, selecione o inimigo e confirme.',
    heal: 'Recupera HP e ajuda a tratar ferimentos. Em Skills, escolha a cura e mire no aliado. Para levantar alguém com 0 HP, procure uma técnica ou item com Reerguer.',
    passive: 'Bônus ou efeito automático de uma técnica aprendida. No acampamento, abra Habilidades → Passivas ativas para equipar as que exigem vaga. Você começa com 4 vagas e ganha mais 1 a cada 100 XP gastos em técnicas.',
    form: 'Ative em Skills para assumir uma forma. Leia os bônus, a duração, os recursos drenados por turno e a sequela, se houver. A forma pode acabar se faltar recurso.',
    util: 'Aplica efeitos como escudo, purificação ou invocação. Em Skills, confira a descrição para saber quem recebe o efeito e escolha o alvo quando houver.',
  };
  const actions = [
    ['Ataque básico', 'Escolha Atacar, mire em um inimigo e confirme. O ataque usa a arma equipada ou os punhos e não gasta Aura. A arma define atributo, poder, tempo e outros efeitos.', 'atacar arma punho'],
    ['Usar uma técnica', 'Abra Skills ou Arma no menu da batalha, selecione a técnica, confira o alvo e confirme. O painel mostra custo, condições de uso e efeitos. No PC, técnicas da arma aparecem em Skills.', 'habilidade skill agir'],
    ['Usar um item', 'Em batalha, abra Itens, escolha um consumível, selecione o alvo e confirme. Fora de batalha, abra Itens na ficha. A descrição indica se o item restaura recursos, purifica, trata ferimentos, reergue ou causa dano.', 'inventário poção bomba consumível'],
    ['Defender', 'Na sua vez, escolha Defender. Recebe DEF↑ (25% a menos de dano de golpes) e ganha 1 Coragem, até 3. A ação usa 70% do tempo normal do turno.', 'guarda defesa proteger redução'],
    ['Concentrar', 'Na sua vez, escolha Concentrar na Tática ou na lista de comandos. Usa 70% do tempo normal e acumula Tensão. Com 1, 2 ou 3 cargas, a próxima ação ofensiva tem dano ×1,5, ×2 ou ×3, respectivamente.', 'tensão carregar multiplicador'],
    ['Coragem', 'Ative Coragem antes de confirmar uma ação. Se ela não conceder outra vez por si só, você gasta 1 ponto e age de novo. Dá para chegar a −2 pontos. A dívida atrasa o próximo turno que você encerrar.', 'brave turno extra dívida'],
    ['Passar', 'Escolha Passar para encerrar o turno gastando metade do tempo normal.', 'pular vez tática'],
    ['Passar a vez a um aliado', 'Durante a mira, selecione o aliado que receberá sua vez se você derrubar um inimigo por fraqueza. O aliado é adiantado na fila e recebe ATQ↑.', 'passar bastão fraqueza baton pass'],
    ['Ataque Total', 'Escolha Ataque Total quando todos os inimigos de pé estiverem Derrubados ou Quebrados. Os aliados disponíveis atacam em sequência.', 'tática all-out ação em grupo'],
    ['Mirar em parte do corpo', 'Na mira de um ataque compatível, abra a seleção de partes e escolha cabeça, torso, braço ou perna. O painel indica a penalidade de acerto. Ferimentos graves reduzem atributos e podem gerar condições.', 'mira no corpo ferimento localização'],
    ['Rolagem de atributo', 'Clique na sigla do atributo na ficha ou no botão correspondente em Rolar atributo. Um d100 igual ou abaixo da chance é sucesso. Com vantagem, vale o menor de dois dados. Com desvantagem, vale o maior. O mestre pode ajustar a chance ao aprovar.', 'dado teste perícia vantagem desvantagem'],
    ['Aprender habilidades', 'Na página Habilidades, selecione um nó da árvore e leia o custo em XP e os requisitos. O painel indica se falta uma técnica vizinha, um atributo, um Vínculo ou um Despertar. Use Aprender quando estiver disponível.', 'árvore mandala xp progressão'],
    ['Equipar armas e armaduras', 'Abra Itens e selecione a peça para equipar. A arma muda o ataque básico e pode habilitar técnicas próprias. Arcos usam flechas e armas de fogo usam balas. Confira a descrição da arma e da munição.', 'equipamento inventário acessório'],
    ['Ofícios', 'Abra Ofícios na ficha para usar perícias, receitas e ações de exploração. O mestre concede a Iniciação. Sucessos podem render Pontos de Ofício, usados para aprender novos nós.', 'perícias coleta receita alquimia forja culinária'],
    ['Descanso e acampamento', 'Fora de batalha, o mestre pode iniciar um descanso. O curto repõe Aura, recupera parte do HP e reduz ferimentos. O longo restaura HP e Aura e limpa ferimentos, condições, Aflições e Virtudes. Com acampamento aberto, escolha uma atividade antes do descanso longo.', 'descanso curto longo conversar vigiar treinar meditar cozinhar'],
    ...Object.entries(KIND).map(([key, name]) => [name, kindHelp[key]]),
  ];
  const commands = [
    ['Comandos de ataque', 'Algumas técnicas abrem um desafio ao confirmar. A técnica define o que cada nota melhora, como dano, número de golpes, cura ou duração. Use Pular, Esc ou deixe o tempo acabar para executar a técnica normalmente. Errar uma tentativa pode reduzir o efeito.', 'minigame ação cinemática qte bom ótimo perfeito'],
    ['Golpe no tempo', 'Aperte Espaço ou toque quando o anel encostar no centro. Quanto mais preciso, maior o bônus. Em técnicas compatíveis, Perfeito ativa Black Flash, com dano ×2,5 e recuperação de Aura.', 'tempo timing black flash anel'],
    ['Martelar', 'Aperte Espaço ou toque repetidamente. Você tem 2 segundos a partir do primeiro aperto para chegar à meta e ganhar golpes extras.', 'mash apertar spam contador'],
    ['Segurar e soltar', 'Segure Espaço ou mantenha o toque e solte quando a barra chegar à faixa dourada. Ultrapassar o topo estoura a carga e deixa você Exposto.', 'carga segurar barra'],
    ['Sequência', 'Aperte as setas ou WASD na ordem indicada, quando cada anel fechar. No celular, toque nas setas da tela. Cada acerto contribui para o combo. Acertar todas ativa o golpe final.', 'combo sequência direções'],
    ['Ritmo', 'Aperte Espaço ou toque quando cada nota cruzar a linha. Cada acerto pode aumentar dano, cura ou duração, conforme a técnica.', 'música nota batida'],
    ['Mira do comando', 'Aperte Espaço, clique ou toque na silhueta quando a mira móvel passar sobre o ponto fraco. Acertar dá bônus de crítico e tira 2 pontos da barra de Quebra, quando o alvo tem uma.', 'precisão apontar qte'],
    ['Runa', 'Desenhe com o mouse ou o dedo o símbolo indicado. A nota depende de quanto o desenho se parece com o símbolo. A descrição da técnica detalha os bônus.', 'desenho círculo triangulo ritual símbolo'],
    ['Aparar', 'Quando a janela de defesa abrir, aperte Espaço ou toque no botão quando o anel fechar. Exige uma técnica de aparar disponível e Aura para pagar o custo. No acerto, anula o golpe e deixa o atacante Exposto.', 'parry defesa anel reação'],
    ['Esquivar', 'Contra um golpe anunciado, aperte Espaço ou toque um pouco antes de o anel fechar. Quando aparecer uma direção, use a seta indicada ou o botão correspondente. Uma esquiva bem-sucedida reduz o impacto e atrasa um pouco sua próxima vez.', 'esquiva defesa anel desvio'],
    ['Choque de poderes', 'Se tiver uma técnica de Choque disponível e for alvo de um golpe anunciado de alvo único, aperte C ou toque em Choque. Depois, martele C, Espaço ou o botão para alcançar a meta. Vencer devolve um golpe reforçado e deixa o inimigo Exposto. Perder aumenta o dano sofrido.', 'clash minigame defesa cabo de guerra'],
  ];
  const statusAliases = { burn: 'queimado fogo brasa', bleed: 'sangrar sangrando', poison: 'envenenado', rad: 'radioativo', root: 'raiz enraizamento', focus: 'focado furtividade', stun: 'atordoamento', para: 'paralisado', atkUp: 'ataque aumentado ataque up', atkDn: 'ataque reduzido ataque down', defUp: 'defesa aumentada defesa up', defDn: 'defesa reduzida defesa down', agiUp: 'agilidade aumentada velocidade up', agiDn: 'agilidade reduzida velocidade down', mark: 'marca do caçador' };
  const effects = [
    ['Aplicar condições', 'Confira na descrição da técnica, item ou munição qual condição pode aplicar, a chance e a duração em turnos. Em Habilidades, use a busca da árvore para encontrar técnicas pelo nome da condição. As condições ativas aparecem nos cartões do combate.', 'status debuff buff duração técnica'],
    ...Object.entries(RULES.ST).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([key, name]) =>
      [name, RULES.STD[key], `${key} condição status ${statusAliases[key] || ''}`]),
    ['Dano contínuo', 'Queimadura, Sangramento, Veneno e Radiação tiram HP no início de cada turno. Reaplicar a mesma condição aumenta a duração. Condições diferentes somam dano. Algumas técnicas detonam o dano contínuo para adiantar parte do efeito.', 'dot dano por turno'],
    ['Controle', 'Atordoado, Sono e Congelado fazem perder o turno. Paralisia tem 50% de chance de causar isso. Após perder a vez por controle, o alvo ganha imunidade temporária. Chefes sofrem condições de controle por um turno.', RULES.CTRL.map(key => RULES.ST[key]).join(' ')],
    ['Purificar', 'Remove condições negativas. Leia a descrição da técnica ou item para ver em quem ela funciona. Para tirar bônus de inimigos, procure efeitos de remover ou roubar bônus.', 'cleanse dissipar cura condição remover debuff'],
    ['Reerguer', 'Restaura parte do HP de um alvo caído. Escolha uma técnica ou item com esse efeito e mire no aliado antes que a contagem de morte termine.', 'reviver reanimar caído nocaute'],
    ['Reação automática', 'Uma técnica aprendida com reação pode esquivar, bloquear, absorver ou revidar durante a ação do inimigo. Ela consome o recurso da técnica quando dispara e volta a ficar disponível no seu turno.', 'passiva reação defensiva bloquear absorver esquivar contra ataque'],
    ['Acumular e consumir cargas', 'Algumas técnicas acumulam cargas no próprio personagem, como Brasa, Maré ou Carga Elétrica. O bônus e o limite aparecem na descrição. Técnicas que consomem cargas gastam todas as daquele tipo para aumentar o resultado.', Object.values(RULES.STK).map(([name]) => name).join(' ')],
    ['Reação elemental', 'Um golpe do elemento certo em um alvo com a condição correspondente consome a condição e pode multiplicar o dano ou aplicar outro efeito. Consulte cada combinação pelo nome, elemento ou condição.', 'combinação sinergia elemento'],
    ...RULES.REACT.map(({ n, el, on, m, a }) => [n,
      `Acerte com ${el.map(key => EL[key].replace('·', ' / ')).join(' ou ')} em um alvo com ${on.map(key => RULES.ST[key]).join(' ou ')}. A reação consome a condição${m !== 1 ? ` e multiplica o dano por ${m.toLocaleString('pt-BR')}` : ''}.${a ? ` Aplica ${RULES.ST[a[0]]} por ${a[1]} ${a[1] === 1 ? 'turno' : 'turnos'} antes de ajustes de imunidade ou duração.` : ''}`, 'reação elemental']),
    ...Object.values(RULES.AFL).map(([name, desc]) => [`Aflição · ${name}`, desc, 'sanidade colapso descanso longo']),
    ...Object.values(RULES.VIR).map(([name, desc]) => [`Virtude · ${name}`, desc, 'sanidade colapso descanso longo']),
  ];
  const system = [
    ['Ordem de turnos', 'A fila indica quem age em seguida. Mais Agilidade encurta a espera. Uma técnica com Tempo 70% cobra 70% da espera normal. A fila pode mudar com bônus, penalidades, Coragem e turnos extras.', 'iniciativa ctb velocidade vez'],
    ['HP e queda', 'HP representa a vida. Ao chegar a 0, um herói cai e precisa ser reerguido. A contagem de morte diminui nas vezes dele enquanto estiver caído. Ao zerar, o personagem morre.', 'vida saúde morte nocaute revive'],
    ['Aura', 'Recurso gasto na maioria das técnicas. Você recupera parte da Aura máxima no início dos seus turnos. Confira o custo no painel da técnica antes de confirmar.', 'energia mana custo recurso'],
    ['Sanidade', 'Dano mental e algumas técnicas reduzem a Sanidade. Com 50% ou menos, ela penaliza rolagens. Ao chegar a zero, heróis testam SAB e voltam com 25% da Sanidade máxima. Um crítico gera Virtude e uma falha gera Aflição, ambas até o descanso longo.', 'san dano mental colapso sabedoria'],
    ['Limite', 'A barra pode subir ao sofrer dano, ver um aliado cair ou aparar um golpe. Com 100%, use uma técnica de Limite aprendida. A técnica zera a barra.', 'limit especial ultimate'],
    ['Fraqueza e resistência', 'Um acerto em fraqueza causa 50% a mais de dano. Se o alvo ainda não estiver Derrubado, pode derrubá-lo e dar outra vez ou permitir passar a vez a um aliado. Resistência ao elemento corta o dano pela metade. O grupo descobre afinidades ao acertar.', 'elemento turno extra vulnerável'],
    ['Quebra', 'Chefes e elites podem ter uma barra de Quebra. Explore fraquezas, apare ou use técnicas que tirem pontos da barra. Ao esvaziar, o alvo fica Quebrado e perde a vez enquanto recebe dano aumentado.', 'chefe elite broken stagger'],
    ['Cadeia', 'O grupo acumula Cadeia durante o combate, por exemplo ao quebrar um inimigo. Com a barra cheia e pelo menos dois aliados disponíveis, eles atacam em sequência automaticamente.', 'combo golpe grupo'],
    ['Clima de batalha', 'O clima altera dano elemental ou acerto. O mestre pode definir o clima na cena e algumas técnicas mudam o clima durante a batalha.', 'tempo sol chuva névoa tempestade eclipse'],
    ['Rituais', 'Técnicas de Ocultismo podem exigir componentes ou cobrar Sanidade além do custo principal. Leia a ficha da técnica para saber o círculo, o preparo, o custo e a sequela.', 'oculto componente magia'],
    ['Técnicas em dupla e trio', 'Exigem aliados que conheçam as técnicas indicadas e possam participar. Ao executar, os parceiros contribuem com poder, pagam seus custos e têm os próximos turnos adiados.', 'duo trio combinado laço cooperação'],
    ['Expansão de Domínio', 'Use a técnica de Domínio aprendida para gastar a Aura restante e criar um efeito de campo temporário. Outro Domínio pode disputar o campo. Quando o seu acaba, você fica Exausto.', 'dom exaus campo'],
    ['Vínculos e Despertares', 'O Vínculo dá acesso aos ramos do patrono na árvore. O mestre concede Despertares que desbloqueiam nós específicos, como a entrada de Ocultismo.', 'patrono afinidade aprender'],
    ['Afinidade de Aura', 'Sua categoria de Aura influencia o custo em XP e a eficácia das técnicas de outras categorias. Veja a afinidade e os requisitos no nó da árvore.', 'nen hexágono especialização'],
    ['Pedidos ao mestre', 'Ações como rolar atributo, aprender técnica, usar um item e agir em combate podem pedir aprovação. O jogador acompanha ou cancela na barra do pedido. O mestre abre Pedidos para aprovar, negar ou ajustar a rolagem e pode configurar aprovação automática.', 'fila aguardar aprovar recusar'],
    ...Object.values(RULES.VOW),
  ];
  const shortcuts = [
    ['Abrir o guia', 'Clique em Regras ou pressione ? com o foco fora de um campo de edição. Esc fecha o guia.', '? ajuda pesquisa consulta'],
    ['Comandos no palco do PC', 'Use 1 para Atacar, 2 para Skills, 3 para Itens, 4 para Defender, 5 para Concentrar, 6 para Coragem, 7 para Passar e 8 para Ataque Total quando disponível. No painel compacto, siga os números mostrados.', 'atalho batalha leque tática'],
    ['Navegar e mirar no palco', 'Use ↑/↓ para navegar, ←/→ para escolher o alvo, Tab para Tática ou trocar de lado durante a mira, Enter para confirmar e Esc para voltar. No celular, toque na ação e no alvo.', 'setas tecla alvo turno'],
    ['Mover e medir no mapa', 'Use a roda do mouse para ajustar o zoom, Espaço e arraste ou o botão do meio para mover e 0 para enquadrar. Alt + arrastar mede a distância. Alt + Shift + arrastar mede uma área.', 'régua zoom mapa'],
    ['Sinalizar e abrir o menu do token', 'Dê duplo clique no mapa para sinalizar. No token, dê duplo clique para abrir a ficha ou clique com o botão direito para abrir o menu.', 'ping ficha contexto'],
    ...(gm ? [
      ['Busca rápida do mestre', 'Pressione Ctrl + K para buscar painéis, cenas, fichas, ações e sons. Use ↑/↓ para escolher e Enter para executar. Também fica em Ferramentas → Buscar.', 'paleta comando'],
      ['Vistas e painéis do mestre', 'Q abre Mesa, M abre Mapa e P abre Palco. Use [ para alternar o painel de ferramentas e ] para alternar o de acompanhamento.', 'docas teclado'],
      ['Aprovar ou negar um pedido', 'Com o foco na mesa e fora de campos de edição, use Enter para aprovar ou Delete para negar o primeiro pedido.', 'pedido aprovação mestre'],
      ['Edição rápida do mestre', 'Clique num número da ficha para editar. Aceita alterações como +5 ou -12. Ctrl + clique no mapa fixa um marcador. Com Shift, ele só aparece para você.', 'ficha marcador mapa'],
      ['Arrastar arquivos na tela do mestre', 'Solte uma imagem no mapa para usar como fundo ou sobre uma ficha para usar como retrato. Solte um áudio para usar como trilha.', 'imagem áudio enviar upload'],
    ] : []),
  ];

  const entries = Object.entries({ actions, commands, effects, system, keys: shortcuts }).flatMap(([category, items]) =>
    items.map(([name, description, aliases = '']) => ({
      category, name, description, title: norm(name), aliases: norm(aliases), search: norm(`${name} ${description} ${aliases}`),
    })));

  window.openRulesGuide = (category = 'all') => {
    if (document.querySelector('.regras[open],.dlg-bg,.stage-cmd:not(.out),.qte3d:not(.out)')) return;
    const opener = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'regras';
    dialog.setAttribute('aria-labelledby', 'regras-title');
    dialog.innerHTML = `<div class="regras-body">
      <header class="regras-head"><h2 id="regras-title">Guia de regras</h2><button type="button" data-regras-close>Fechar <kbd>Esc</kbd></button></header>
      <div class="regras-controls">
        <label for="regras-query">Buscar no guia</label>
        <div class="regras-search"><input type="search" id="regras-query" autocomplete="off" placeholder="Queimadura, foco, aparar…"><button type="button" data-regras-clear hidden>Limpar</button></div>
        <div class="regras-filters" role="group" aria-label="Categorias">${Object.entries(categories).map(([key, name]) => `<button type="button" data-regras-filter="${key}" aria-pressed="${key === category}">${name}</button>`).join('')}</div>
      </div>
      <div class="regras-content" role="region" aria-label="Verbetes" tabindex="0"><p class="regras-count" role="status"></p><div class="regras-results"></div></div>
    </div>`;
    const input = dialog.querySelector('input');
    const clear = dialog.querySelector('[data-regras-clear]');
    const content = dialog.querySelector('.regras-content');
    const count = content.querySelector('.regras-count');
    const results = content.querySelector('.regras-results');
    const buttons = [...dialog.querySelectorAll('[data-regras-filter]')];
    const firstFocus = matchMedia('(pointer: coarse)').matches ? dialog.querySelector('[data-regras-close]') : input;
    firstFocus.autofocus = true;

    const draw = () => {
      const query = norm(input.value.trim());
      const words = query.split(/\s+/).filter(Boolean);
      const rank = entry => entry.title === query ? 0 : words.every(word => entry.title.includes(word)) ? 1
        : words.every(word => `${entry.title} ${entry.aliases}`.includes(word)) ? 2 : 3;
      const found = entries.filter(entry => (category === 'all' || entry.category === category) && words.every(word => entry.search.includes(word)));
      if (query) found.sort((a, b) => rank(a) - rank(b));
      clear.hidden = !input.value;
      count.textContent = `${found.length} ${found.length === 1 ? 'verbete' : 'verbetes'}`;
      results.innerHTML = found.length ? found.map(entry => `<article>${category === 'all' ? `<small>${categories[entry.category]}</small>` : ''}<h3>${esc(entry.name)}</h3><p>${esc(entry.description)}</p></article>`).join('')
        : '<p class="regras-empty">Nenhum verbete encontrado. Tente outro termo ou selecione Tudo.</p>';
      content.scrollTop = 0;
    };

    input.addEventListener('input', draw);
    dialog.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.closest('[data-regras-close]')) return dialog.close();
      if (e.target === clear) { input.value = ''; draw(); input.focus(); }
      const filter = e.target.closest('[data-regras-filter]');
      if (!filter) return;
      category = filter.dataset.regrasFilter;
      buttons.forEach(button => button.setAttribute('aria-pressed', button === filter));
      draw();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (!opener?.isConnected) app.querySelector('[data-regras]')?.focus({ preventScroll: true });
    });
    document.body.append(dialog);
    draw();
    dialog.showModal();
  };

  app.addEventListener('click', e => { if (e.target.closest('[data-regras]')) openRulesGuide(); });
}
