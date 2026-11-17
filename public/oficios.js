// Ofícios (perícias): catálogo compartilhado entre o servidor e o navegador (globalThis.OFI). Script comum, sem import/export.
// Cada perícia tem 3 graus (Aprendiz, Oficial, Mestre) de ~5 nós. O mestre concede a Iniciação na ficha; os nós custam Pontos de Ofício (PO).
// Campos do nó: n nome · d descrição · t grau (1-3) · po custo · r bônus nas rolagens da perícia · act ação liberada · camp ação de acampamento
// rec receitas liberadas · hk gancho passivo (com v) · ex escolha excludente · fg ajuste da Forja · comp companheiro em batalha.
(g => {
  const GRAU = ['', 'Aprendiz', 'Oficial', 'Mestre'], BONUS = [0, 10, 20, 30]; // bônus de rolagem por grau
  const N = (n, d, t, o = {}) => ({ n, d, t, po: [0, 2, 4, 7][t], ...o });
  const P = {};
  const add = (id, n, a, d, nodes) => { P[id] = { id, n, a, d, nodes: nodes.map((x, i) => ({ ...x, id: id + '.' + i })) }; };

  add('forja', 'Forja', ['FOR', 'INT'], 'Têmpera, engastes e armas vivas: o martelo e a bigorna da caçada.', [
    N('Olho de Ferreiro', 'Enxerga o poder real, o elemento e o preço de qualquer peça.', 1, { act: 'avaliar', r: 5 }),
    N('Reciclar Sucata', 'Desmonta um item velho e salva o que presta: Sucata de Ferro.', 1, { act: 'reciclar' }),
    N('Afiar a Lâmina', 'Na noite do acampamento, afia a arma: ataque básico mais forte na próxima batalha.', 1, { camp: 'afiar' }),
    N('Têmpera I', 'Refina uma arma até +1 (+2 de poder).', 1, { act: 'temperar', fg: 'temp', v: 1 }),
    N('Engaste I', 'Abre um engaste numa arma para receber uma runa. Ensina a entalhar as runas de Precisão e de Força.', 1, { act: 'engastar', fg: 'slot', v: 1, rec: ['runaPrecisao', 'runaForca'] }),
    N('Têmpera II', 'Refina até +2.', 2, { fg: 'temp', v: 2 }),
    N('Engaste II', 'Abre o segundo engaste. Ensina as runas de Brasa e de Veneno.', 2, { fg: 'slot', v: 2, rec: ['runaBrasa', 'runaVeneno'] }),
    N('Economia de Essência', 'Forja elemental com 2 essências em vez de 3.', 2, { hk: 'essencia', v: 2 }),
    N('Armeiro', 'Especialista em armas: cada nível de têmpera rende +3 de poder em vez de +2.', 2, { ex: 'forja-esp', hk: 'esp', v: 'armeiro' }),
    N('Couraceiro', 'Especialista em armaduras: pode temperar armaduras (+1 de armadura por nível).', 2, { ex: 'forja-esp', hk: 'esp', v: 'couraceiro' }),
    N('Ourives', 'Especialista em acessórios: pode temperar amuletos e relíquias (+2 no atributo por nível).', 2, { ex: 'forja-esp', hk: 'esp', v: 'ourives' }),
    N('Têmpera III', 'Refina até +3.', 3, { fg: 'temp', v: 3 }),
    N('Engaste III', 'Abre o terceiro engaste. Ensina as runas de Trovão e de Sangue.', 3, { fg: 'slot', v: 3, rec: ['runaTrovao', 'runaSangue'] }),
    N('Liga de Essências', 'Funde duas essências numa arma: ganha um segundo elemento.', 3, { act: 'ligar' }),
    N('Assinatura do Ferreiro', 'Marca uma peça com nome próprio e um bônus raro do catálogo.', 3, { act: 'assinar' }),
    N('Arma Viva', 'A arma evolui com os abates e, no último estágio, ganha o gume dos grandes.', 3, { act: 'vivo' }),
    N('Olho Treinado', 'Vê a armadura inimiga: o primeiro golpe de cada batalha ignora 30% dela.', 3, { hk: 'olho', v: 30 }),
  ]);
  add('alquimia', 'Alquimia', ['INT', 'SAB'], 'Poções, venenos e o pouco de química que a magia permite.', [
    N('Colher Ervas', 'Reconhece e colhe ervas nas cenas.', 1, { act: 'coletar', tag: 'erva', r: 5 }),
    N('Tônico Caseiro', 'Prepara Tônicos com ervas.', 1, { rec: ['tonico'] }),
    N('Antídoto', 'Prepara Antídotos com raízes.', 1, { rec: ['antidoto'] }),
    N('Calmante', 'Prepara Calmantes que acalmam a mente.', 1, { rec: ['calmante'] }),
    N('Frasco de Óleo', 'Óleo de lamparina em frasco: molha o inimigo para o fogo.', 1, { rec: ['oleo'] }),
    N('Tônico Forte', 'Poções que curam de verdade.', 2, { rec: ['tonicof'] }),
    N('Éter Caseiro', 'Éter de Aura destilado de cogumelos.', 2, { rec: ['eter'] }),
    N('Fogo e Ácido', 'Coquetéis incendiários e frascos de ácido.', 2, { rec: ['coquetel', 'acido'] }),
    N('Mão Leve', 'Mais ervas em cada colheita.', 2, { hk: 'yield', v: 1 }),
    N('Destilar Componente', 'Destila Componente Ritualístico: corta a Sanidade dos rituais.', 2, { rec: ['componente'] }),
    N('Elixir Vital', 'O elixir que traz de volta quem estava no chão.', 3, { rec: ['elixir'] }),
    N('Sais Aromáticos', 'Sais que trazem o desmaiado de volta.', 3, { rec: ['sais'] }),
    N('Granadas', 'Explosivos de pólvora e sucata.', 3, { rec: ['granada'] }),
    N('Mestre das Ervas', 'Reconhece até as ervas que só crescem onde há maldição.', 3, { r: 10 }),
    N('Alquimista Completo', 'Cada receita rende uma unidade extra.', 3, { hk: 'rende', v: 1 }),
  ]);
  add('culinaria', 'Culinária', ['SAB', 'CAR'], 'Refeições de acampamento que dão força para a próxima luta.', [
    N('Cozinhar no Fogo', 'Aprende a cozinhar de verdade: Ensopado de Caça.', 1, { rec: ['ensopado'] }),
    N('Sopa de Ervas', 'Uma sopa que deixa o corpo mais firme.', 1, { rec: ['sopa'] }),
    N('Chá de Raiz', 'Um chá que desperta os reflexos.', 1, { rec: ['cha'] }),
    N('Temperos', 'Reconhece temperos e ervas de cozinha nas cenas.', 1, { act: 'coletar', tag: 'tempero' }),
    N('Faca Afiada', 'Cozinhar rende mais: +5 em rolagens de Culinária.', 1, { r: 5 }),
    N('Churrasco do Caçador', 'Carne grelhada que firma a mira e o braço.', 2, { rec: ['churrasco'] }),
    N('Caldo Reforçado', 'Um caldo que protege e acelera.', 2, { rec: ['caldo'] }),
    N('Porção Extra', 'Cada refeição serve mais: +4 de Sanidade para todos ao comer.', 2, { hk: 'sanRef', v: 4 }),
    N('Doces de Festa', 'Pequenos luxos que levantam o ânimo de qualquer um.', 2, { rec: ['doce'] }),
    N('Receita da Avó', 'Um segredo de família: +10 em rolagens de Culinária.', 2, { r: 10 }),
    N('Banquete', 'Uma mesa farta que muda a noite e a luta.', 3, { rec: ['banquete'] }),
    N('Prato de Demônio', 'Carne de demônio bem temperada: força demais, mas custa Sanidade.', 3, { rec: ['pratoDemonio'] }),
    N('Cozinheiro de Guerra', 'Cozinha rápido: ensopado e sopa rendem o dobro.', 3, { hk: 'dobro', v: 1 }),
    N('Paladar Absoluto', 'Sente venenos e maldições na comida: +10 em rolagens.', 3, { r: 10 }),
    N('Mestre-Cuca', 'A refeição dura até a segunda batalha.', 3, { hk: 'refDupla', v: 1 }),
  ]);
  add('medicina', 'Medicina', ['INT', 'DES'], 'Tratar o corpo ferido onde ele dói, fora de combate.', [
    N('Primeiros Socorros', 'Trata uma parte do corpo ferida: metade do dano some.', 1, { act: 'tratar', v: 1, r: 5 }),
    N('Bandagem Limpa', 'Prepara Ataduras com tecido e ervas.', 1, { rec: ['atadura'] }),
    N('Diagnóstico', 'Descobre quais condições aflingem alguém.', 1, { act: 'checar', g: 0 }),
    N('Ervas que Curam', 'Colhe ervas medicinais nas cenas.', 1, { act: 'coletar', tag: 'erva' }),
    N('Mão Firme', '+5 em rolagens de Medicina.', 1, { r: 5 }),
    N('Sutura', 'Trata uma parte do corpo ferida por completo.', 2, { act: 'tratar', v: 2 }),
    N('Estabilizar', 'Quem está caído e morrendo para de piorar.', 2, { act: 'estabilizar' }),
    N('Antídoto Clínico', 'Prepara Antídotos com mais eficácia.', 2, { rec: ['antidoto'] }),
    N('Triagem', 'Trata duas partes do corpo numa mesma ação.', 2, { hk: 'duas', v: 1 }),
    N('Estudo de Anatomia', '+10 em rolagens de Medicina.', 2, { r: 10 }),
    N('Cirurgia', 'Trata o corpo inteiro de uma vez e devolve 30% do HP.', 3, { act: 'tratar', v: 3 }),
    N('Cuidados Intensivos', 'Cada tratamento devolve também Aura.', 3, { hk: 'auraTrat', v: 5 }),
    N('Anestesia', 'Quem é tratado não sofre penalidade de corpo na próxima luta.', 3, { hk: 'anest', v: 1 }),
    N('Médico de Campanha', '+10 em rolagens de Medicina.', 3, { r: 10 }),
    N('Mão de Santo', 'Um crítico em tratamento devolve 50% do HP.', 3, { hk: 'santo', v: 50 }),
  ]);
  add('caca', 'Caça', ['DES', 'SAB'], 'Rastrear, emboscar e aproveitar o que a presa deixa.', [
    N('Rastrear', 'Lê pegadas, galhos quebrados e cheiro: pista narrativa para o mestre.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Colher Carne e Couro', 'Aproveita carne e couro de animais nas cenas.', 1, { act: 'coletar', tag: 'carne' }),
    N('Passos Leves', '+5 em rolagens de Caça.', 1, { r: 5 }),
    N('Armadilha Simples', 'Na noite do acampamento, arma uma armadilha: um inimigo começa a próxima luta Enraizado.', 1, { camp: 'armadilha', v: 'root' }),
    N('Faro de Caçador', 'Mais carne e couro por colheita.', 1, { hk: 'yield', v: 1 }),
    N('Emboscada', 'O grupo começa a luta um pouco à frente na fila.', 2, { hk: 'emb', v: 20 }),
    N('Armadilha de Aço', 'A armadilha também causa Sangramento.', 2, { hk: 'trapSang', v: 1 }),
    N('Esfolar Demônio', 'Aproveita demônios abatidos: Carne de Demônio e Garras.', 2, { act: 'esfolar' }),
    N('Visão Noturna', '+10 em rolagens de Caça.', 2, { r: 10 }),
    N('Isca', 'Prepara iscas que atraem a presa.', 2, { rec: ['isca'] }),
    N('Mestre da Emboscada', 'O grupo começa ainda mais à frente na fila.', 3, { hk: 'emb', v: 35 }),
    N('Predador', '+10 em rolagens de Caça.', 3, { r: 10 }),
    N('Armadilha Mortal', 'A armadilha deixa o inimigo Atordoado por um turno.', 3, { hk: 'trapStun', v: 1 }),
    N('Cão de Caça', 'Um cão adestrado acompanha o grupo nas lutas.', 3, { comp: 'Lobo Adestrado' }),
    N('Rei da Mata', 'Colheitas de caça rendem o dobro.', 3, { hk: 'yield', v: 2 }),
  ]);
  add('investigacao', 'Investigação', ['INT', 'SAB'], 'Ler o inimigo, decifrar selos e juntar pistas.', [
    N('Olhar Atento', 'Repara no que os outros deixam passar: pista para o mestre.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Identificar Demônio', 'Revela as fraquezas de um demônio a todo o grupo.', 1, { act: 'identificar', v: 1 }),
    N('Arquivo de Campo', 'Anota o que já viu: identificações ficam salvas no bestiário.', 1, { hk: 'arquivo', v: 1 }),
    N('Decifrar Selo', 'Lê selos, inscrições e círculos rituais.', 1, { act: 'checar', g: 0 }),
    N('Memória Treinada', '+5 em rolagens de Investigação.', 1, { r: 5 }),
    N('Estudo de Resistências', 'A identificação também revela as resistências.', 2, { act: 'identificar', v: 2 }),
    N('Interrogar Testemunhas', 'Arranca detalhes de quem viu algo.', 2, { act: 'checar', g: 0 }),
    N('Bestiário Pessoal', '+10 em rolagens de Investigação.', 2, { r: 10 }),
    N('Cruzar Pistas', 'Liga fatos distantes: pista maior para o mestre.', 2, { act: 'checar', g: 0, r: 5 }),
    N('Pesquisa Ocultista', 'Reconhece rituais e círculos em uso.', 2, { act: 'checar', g: 0 }),
    N('Anatomia Demoníaca', 'A identificação revela também o ponto fraco do corpo.', 3, { act: 'identificar', v: 3 }),
    N('Dedução', '+10 em rolagens de Investigação.', 3, { r: 10 }),
    N('Mente Metódica', 'A primeira identificação de cada luta não custa o turno.', 3, { hk: 'rapida', v: 1 }),
    N('Caso Encerrado', 'Quando tudo se encaixa, o mestre revela a verdade escondida.', 3, { act: 'checar', g: 0, r: 10 }),
    N('Olho Clínico', 'Identificar um chefe pede apenas um sucesso simples.', 3, { hk: 'chefe', v: 1 }),
  ]);
  add('labia', 'Lábia', ['CAR', 'SAB'], 'Conversa, barganha e jeito de fazer as pessoas falarem.', [
    N('Papo Afiado', 'Convence quem está disposto a ouvir.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Regatear', '5% de desconto nas compras e 5% a mais nas vendas.', 1, { hk: 'desc', v: 5 }),
    N('Informantes', 'Conhece quem sabe das coisas na cidade.', 1, { act: 'checar', g: 0 }),
    N('Sorriso Fácil', '+5 em rolagens de Lábia.', 1, { r: 5 }),
    N('Boa Aparência', 'Abre portas que só abrem para quem parece confiável.', 1, { act: 'checar', g: 0 }),
    N('Barganha Dura', '10% de desconto e 10% a mais nas vendas.', 2, { hk: 'desc', v: 10 }),
    N('Intimidar', 'Faz o outro se arrepender de ter dito não.', 2, { act: 'checar', g: 0 }),
    N('Interrogatório', 'Extrai informação de quem não queria dar.', 2, { act: 'checar', g: 0 }),
    N('Rede de Contatos', '+10 em rolagens de Lábia.', 2, { r: 10 }),
    N('Renda de Contatos', 'Contatos rendem ouro: ação de rolagem que paga em caso de sucesso.', 2, { act: 'checar', g: 12 }),
    N('Mestre da Barganha', '15% de desconto e 15% a mais nas vendas.', 3, { hk: 'desc', v: 15 }),
    N('Voz de Comando', '+10 em rolagens de Lábia.', 3, { r: 10 }),
    N('Negócio Fechado', 'Um grande negócio: rola para ganhar bastante ouro.', 3, { act: 'checar', g: 30 }),
    N('Diplomata', 'Resolve conflitos antes que virem luta.', 3, { act: 'checar', g: 0, r: 10 }),
    N('Língua de Ouro', 'Os descontos passam a valer em dobro nas lojas escolhidas pelo mestre.', 3, { hk: 'desc', v: 20 }),
  ]);
  add('pilotagem', 'Pilotagem', ['DES', 'AGI'], 'Automóveis, motocicletas e o que mais tiver rodas.', [
    N('Mão no Volante', '+3 na rolagem de condução nas perseguições.', 1, { hk: 'chase', v: 3 }),
    N('Conhecer o Motor', 'Sente quando algo está errado com o veículo.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Mapa de Cabeça', 'Conhece as ruas: pista para o mestre.', 1, { act: 'checar', g: 0 }),
    N('Reflexo no Pedal', '+5 em rolagens de Pilotagem.', 1, { r: 5 }),
    N('Conserto de Estrada', 'Conserta o veículo com o que tiver à mão.', 1, { act: 'checar', g: 0 }),
    N('Curva Fechada', '+6 na rolagem de condução nas perseguições.', 2, { hk: 'chase', v: 6 }),
    N('Atalho', 'Corta caminho: +10 em rolagens de Pilotagem.', 2, { r: 10 }),
    N('Pé Pesado', 'Aceleração extra: +9 na condução.', 2, { hk: 'chase', v: 9 }),
    N('Rota de Fuga', 'Sempre sabe por onde sair.', 2, { act: 'checar', g: 0 }),
    N('Oficina Móvel', 'Conserto completo no meio do caminho.', 2, { act: 'checar', g: 0 }),
    N('Piloto de Guerra', '+12 na rolagem de condução.', 3, { hk: 'chase', v: 12 }),
    N('Drift', '+10 em rolagens de Pilotagem.', 3, { r: 10 }),
    N('Veículo Próprio', 'Tem o seu veículo: conserto e rolagens de Pilotagem ficam mais fáceis.', 3, { r: 10 }),
    N('Derrapagem Controlada', '+15 na rolagem de condução.', 3, { hk: 'chase', v: 15 }),
    N('Lenda da Estrada', 'O desastre numa rolagem de condução vira falha comum.', 3, { hk: 'semAcidente', v: 1 }),
  ]);
  add('engenharia', 'Engenharia', ['INT', 'DES'], 'Munições, engenhocas e ferros-velhos que funcionam.', [
    N('Ferramentas de Bolso', 'Improvisa ferramentas e consertos.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Pólvora Seca', 'Produz munição de prata contra o que não é humano.', 1, { rec: ['municaoPrata'] }),
    N('Munição Incendiária', 'Balas que acendem o que acertam.', 1, { rec: ['municaoFogo'] }),
    N('Reciclar Sucata', 'Aproveita sucata de ferro.', 1, { act: 'reciclar' }),
    N('Olho de Engenheiro', '+5 em rolagens de Engenharia.', 1, { r: 5 }),
    N('Munição de Sal', 'Sal sagrado em cartucho: golpes que purificam.', 2, { rec: ['municaoSal'] }),
    N('Granadas Melhores', 'Granadas de pólvora e sucata.', 2, { rec: ['granada'] }),
    N('Carga Dupla', 'Cada pacote de munição rende mais tiros.', 2, { hk: 'tiros', v: 3 }),
    N('Mecânico de Campo', '+10 em rolagens de Engenharia.', 2, { r: 10 }),
    N('Cão Mecânico', 'Um autômato canino acompanha o grupo em batalha.', 2, { comp: 'Cão Mecânico' }),
    N('Autômato de Latão', 'Um autômato pesado luta ao seu lado.', 3, { comp: 'Autômato de Latão' }),
    N('Munição Perfeita', 'Munições rendem ainda mais tiros.', 3, { hk: 'tiros', v: 6 }),
    N('Gênio da Gambiarra', '+10 em rolagens de Engenharia.', 3, { r: 10 }),
    N('Armeiro de Rua', 'Munições custam menos materiais.', 3, { hk: 'barato', v: 1 }),
    N('Invenção', 'Uma geringonça única, criada com o mestre.', 3, { act: 'checar', g: 0, r: 10 }),
  ]);
  add('ladinagem', 'Ladinagem', ['DES', 'AGI'], 'Fechaduras, bolsos alheios e passos que ninguém ouve.', [
    N('Arrombar', 'Abre fechaduras simples.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Passo Silencioso', 'Move-se sem ser ouvido.', 1, { act: 'checar', g: 0 }),
    N('Punga', 'Rouba uma bolsa descuidada: rola e ganha ouro em caso de sucesso.', 1, { act: 'checar', g: 8 }),
    N('Dedos Ágeis', '+5 em rolagens de Ladinagem.', 1, { r: 5 }),
    N('Disfarce', 'Muda de aparência com poucos recursos.', 1, { act: 'checar', g: 0 }),
    N('Desarmar Armadilha', 'Desarma mecanismos e armadilhas.', 2, { act: 'checar', g: 0 }),
    N('Fechadura Complexa', 'Abre cofres e portas reforçadas.', 2, { act: 'checar', g: 0 }),
    N('Sombra', '+10 em rolagens de Ladinagem.', 2, { r: 10 }),
    N('Golpe Sujo', 'Começa a luta com o primeiro golpe mais fácil de acertar.', 2, { hk: 'sujo', v: 15 }),
    N('Contrabando', 'Vende itens roubados: +10% nas vendas.', 2, { hk: 'desc', v: 5 }),
    N('Mestre Arrombador', 'Abre qualquer coisa que tenha fechadura.', 3, { act: 'checar', g: 0, r: 10 }),
    N('Furto Perfeito', 'Um furto de grande valor: rola para ganhar muito ouro.', 3, { act: 'checar', g: 25 }),
    N('Identidade Falsa', 'Vive com outro nome por um tempo.', 3, { act: 'checar', g: 0 }),
    N('Fantasma', '+10 em rolagens de Ladinagem.', 3, { r: 10 }),
    N('Último Truque', 'Escapa de qualquer prisão.', 3, { act: 'checar', g: 0, r: 10 }),
  ]);
  add('sobrevivencia', 'Sobrevivência', ['SAB', 'CON'], 'Dormir ao relento, achar água e não morrer de bobagem.', [
    N('Acender Fogueira', 'O descanso curto devolve mais HP: 60% em vez de 50%.', 1, { hk: 'curto', v: 10 }),
    N('Água e Abrigo', 'Acha água e abrigo onde parece não haver.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Colher o Que Dá', 'Colhe ervas, carne e temperos nas cenas.', 1, { act: 'coletar', tag: '' }),
    N('Fôlego de Marcha', '+5 em rolagens de Sobrevivência.', 1, { r: 5 }),
    N('Nós e Cordas', 'Amarra, prende e escala.', 1, { act: 'checar', g: 0 }),
    N('Vigia Atenta', 'A vigia do acampamento dá Agilidade e Foco.', 2, { hk: 'vigia', v: 1 }),
    N('Abrigo Seguro', 'O descanso curto devolve 70% do HP.', 2, { hk: 'curto', v: 20 }),
    N('Olhos no Clima', 'Prevê o clima e se prepara para ele.', 2, { act: 'checar', g: 0 }),
    N('Rações Duráveis', 'Cada colheita rende mais.', 2, { hk: 'yield', v: 1 }),
    N('Pé na Estrada', '+10 em rolagens de Sobrevivência.', 2, { r: 10 }),
    N('Sono Reparador', 'No descanso longo, recupera também 5 de Sanidade.', 3, { hk: 'sonoSan', v: 5 }),
    N('Mestre do Abrigo', 'O descanso curto devolve 80% do HP.', 3, { hk: 'curto', v: 30 }),
    N('Instinto de Sobrevivência', '+10 em rolagens de Sobrevivência.', 3, { r: 10 }),
    N('Caminho Seguro', 'Evita encontros desnecessários: pista para o mestre.', 3, { act: 'checar', g: 0 }),
    N('Nunca Perdido', 'Sempre acha o caminho de volta.', 3, { act: 'checar', g: 0, r: 10 }),
  ]);
  add('talismas', 'Talismãs', ['SAB', 'INT'], 'Selos de papel e sal que prendem um pouco de Aura para depois.', [
    N('Papel e Tinta', 'Prepara ofudas de cura com papel de arroz.', 1, { rec: ['ofudaCura'] }),
    N('Selo de Purificação', 'Ofuda que limpa condições ruins.', 1, { rec: ['ofudaPura'] }),
    N('Traço Firme', '+5 em rolagens de Talismãs.', 1, { r: 5 }),
    N('Coletar Papel', 'Acha papel, sal e tinta nas cenas.', 1, { act: 'coletar', tag: 'papel' }),
    N('Ler Selos', 'Lê o que os selos dizem.', 1, { act: 'checar', g: 0 }),
    N('Ofuda de Fogo', 'Selo que explode em fogo.', 2, { rec: ['ofudaFogo'] }),
    N('Ofuda de Selo', 'Selo de luz contra o que é demônio.', 2, { rec: ['ofudaSelo'] }),
    N('Tinta Boa', '+10 em rolagens de Talismãs.', 2, { r: 10 }),
    N('Ofuda de Retorno', 'Um selo que traz de volta quem caiu.', 2, { rec: ['ofudaRet'] }),
    N('Prender Aura', 'Cada ofuda rende uma unidade extra.', 2, { hk: 'rende', v: 1 }),
    N('Selos em Série', 'Prepara várias ofudas de uma vez.', 3, { hk: 'rende', v: 2 }),
    N('Mestre dos Selos', '+10 em rolagens de Talismãs.', 3, { r: 10 }),
    N('Selo Maior', 'Ofudas mais fortes.', 3, { hk: 'ofudaForte', v: 1 }),
    N('Barreira de Papel', 'Prende uma barreira no acampamento: todos dormem sem o Pavor.', 3, { act: 'checar', g: 0 }),
    N('Selo Eterno', 'O selo dura até alguém romper.', 3, { act: 'checar', g: 0, r: 10 }),
  ]);
  add('adestramento', 'Adestramento', ['CAR', 'SAB'], 'Um bicho, uma confiança e um laço que vale mais que um golpe.', [
    N('Chamar Bichos', 'Atrai animais dispostos a ouvir.', 1, { act: 'checar', g: 0, r: 5 }),
    N('Mão Calma', '+5 em rolagens de Adestramento.', 1, { r: 5 }),
    N('Lobo Adestrado', 'Um lobo acompanha o grupo nas lutas.', 1, { comp: 'Lobo Adestrado' }),
    N('Alimentar', 'Colhe carne e comida para o companheiro.', 1, { act: 'coletar', tag: 'carne' }),
    N('Assobio', 'Chama o bicho de longe.', 1, { act: 'checar', g: 0 }),
    N('Falcão de Caça', 'Um falcão atira-se sobre os inimigos.', 2, { comp: 'Falcão de Caça', ex: 'adest' }),
    N('Urso Pardo', 'Um urso gigante luta ao seu lado.', 2, { comp: 'Urso Pardo', ex: 'adest' }),
    N('Treino Duro', '+10 em rolagens de Adestramento.', 2, { r: 10 }),
    N('Cuidar das Feridas', 'Trata os ferimentos do companheiro: 5 de HP a mais.', 2, { hk: 'compHp', v: 5 }),
    N('Laço Animal', 'O companheiro ataca com mais força.', 2, { hk: 'compAtk', v: 15 }),
    N('Matilha', 'Dois companheiros acompanham o grupo.', 3, { hk: 'matilha', v: 1 }),
    N('Voz de Alfa', '+10 em rolagens de Adestramento.', 3, { r: 10 }),
    N('Besta Maior', 'O companheiro aguenta mais castigo: +15 de HP.', 3, { hk: 'compHp', v: 15 }),
    N('Olhar Compartilhado', 'Vê pelos olhos do bicho: pista para o mestre.', 3, { act: 'checar', g: 0 }),
    N('Rei dos Bichos', 'O companheiro nunca cai: volta com 50% do HP.', 3, { hk: 'compRev', v: 1 }),
  ]);
  add('musica', 'Música', ['CAR', 'SAB'], 'Canto de acampamento, sopros e violões que levantam o ânimo.', [
    N('Cantar', 'Uma cantiga de acampamento recupera 3 de Sanidade de todos.', 1, { camp: 'cantar', hk: 'cantar', v: 3 }),
    N('Ouvido Fino', '+5 em rolagens de Música.', 1, { r: 5 }),
    N('Tocar na Praça', 'Apresenta-se por ouro: rola e ganha em caso de sucesso.', 1, { act: 'checar', g: 8 }),
    N('Repertório', 'Conhece as canções que cada cidade quer ouvir.', 1, { act: 'checar', g: 0 }),
    N('Afinar', '+5 em rolagens de Música.', 1, { r: 5 }),
    N('Canção de Ninar', 'A cantiga recupera 5 de Sanidade.', 2, { hk: 'cantar', v: 5 }),
    N('Show de Rua', 'Apresentações rendem mais.', 2, { act: 'checar', g: 18 }),
    N('Voz Cheia', '+10 em rolagens de Música.', 2, { r: 10 }),
    N('Marcha de Guerra', 'Depois de uma canção, o grupo começa a luta com Foco.', 2, { hk: 'marcha', v: 1 }),
    N('Instrumento Raro', 'Um instrumento que ninguém tem: +5 em rolagens.', 2, { r: 5 }),
    N('Hino do Caçador', 'A cantiga recupera 8 de Sanidade.', 3, { hk: 'cantar', v: 8 }),
    N('Grande Apresentação', 'Uma noite de gala paga muito bem.', 3, { act: 'checar', g: 35 }),
    N('Mestre Músico', '+10 em rolagens de Música.', 3, { r: 10 }),
    N('Canção Proibida', 'Uma melodia que o Outro Lado conhece: o grupo ganha Tenacidade na próxima luta.', 3, { hk: 'tenac', v: 1 }),
    N('Sinfonia', 'A cantiga também restaura 10% do HP de todos.', 3, { hk: 'sinfonia', v: 10 }),
  ]);
  add('jogos', 'Jogos de Azar', ['SOR', 'CAR'], 'Dados, cartas e a coragem de apostar quando a sorte não está.', [
    N('Rolar de Novo', 'Uma vez por sessão, repete uma rolagem própria.', 1, { hk: 'rr', v: 1 }),
    N('Cara ou Coroa', 'Apostas pequenas: rola e ganha ou perde ouro.', 1, { act: 'checar', g: 6 }),
    N('Cartas na Manga', '+5 em rolagens de Jogos de Azar.', 1, { r: 5 }),
    N('Ler o Adversário', 'Percebe quando alguém está blefando.', 1, { act: 'checar', g: 0 }),
    N('Baralho Marcado', 'Um baralho que só você conhece.', 1, { r: 5 }),
    N('Mesa de Carteado', 'Apostas médias: ganha mais quando acerta.', 2, { act: 'checar', g: 16 }),
    N('Sorte de Principiante', '+10 em rolagens de Jogos de Azar.', 2, { r: 10 }),
    N('Dados Viciados', 'Rola de novo também as rolagens de SOR.', 2, { hk: 'rrSor', v: 1 }),
    N('Blefe', 'Faz o outro desistir do que tinha.', 2, { act: 'checar', g: 0 }),
    N('Aposta Alta', 'Apostas grandes: muito ouro, muito risco.', 2, { act: 'checar', g: 28 }),
    N('Segunda Chance', 'Duas rolagens novas por sessão.', 3, { hk: 'rr', v: 2 }),
    N('Fortuna', '+10 em rolagens de Jogos de Azar.', 3, { r: 10 }),
    N('Rei do Cassino', 'Uma noite de cassino: grande risco, enorme ganho.', 3, { act: 'checar', g: 50 }),
    N('Número da Sorte', 'Seu número da sorte nunca é um desastre.', 3, { hk: 'semDesastre', v: 1 }),
    N('Mão de Ouro', '+10 em rolagens de Jogos de Azar.', 3, { r: 10 }),
  ]);

  // receitas: ingredientes (nomes de itens) → item. dc = ajuste na rolagem (negativo = mais difícil)
  const R = (id, n, per, t, out, mats, o = {}) => ({ id, n, per, t, out, mats, dc: 0, qty: 1, ...o });
  const REC = {};
  [
    R('tonico', 'Tônico', 'alquimia', 1, 'Tônico', { 'Erva Medicinal': 2 }), R('tonicof', 'Tônico Forte', 'alquimia', 2, 'Tônico Forte', { 'Erva Medicinal': 3, 'Raiz Amarga': 1 }, { dc: -5 }),
    R('antidoto', 'Antídoto', 'alquimia', 1, 'Antídoto', { 'Raiz Amarga': 2 }), R('calmante', 'Calmante', 'alquimia', 1, 'Calmante', { 'Erva Medicinal': 2, 'Cogumelo Pálido': 1 }),
    R('eter', 'Éter de Aura', 'alquimia', 2, 'Éter de Aura', { 'Cogumelo Pálido': 1, 'Sal Sagrado': 1 }, { dc: -5 }), R('oleo', 'Frasco de Óleo', 'alquimia', 1, 'Frasco de Óleo', { 'Óleo de Lamparina': 1, 'Frasco Vazio': 1 }),
    R('coquetel', 'Coquetel Incendiário', 'alquimia', 2, 'Coquetel Incendiário', { 'Óleo de Lamparina': 2, 'Frasco Vazio': 1 }, { dc: -5 }), R('acido', 'Frasco de Ácido', 'alquimia', 2, 'Frasco de Ácido', { 'Raiz Amarga': 2, 'Frasco Vazio': 1 }, { dc: -5 }),
    R('componente', 'Componente Ritualístico', 'alquimia', 2, 'Componente Ritualístico', { 'Sal Sagrado': 2, 'Cogumelo Pálido': 1 }, { dc: -10 }), R('elixir', 'Elixir Vital', 'alquimia', 3, 'Elixir Vital', { 'Erva Medicinal': 4, 'Raiz Amarga': 3, 'Cogumelo Pálido': 2 }, { dc: -15 }),
    R('sais', 'Sais Aromáticos', 'alquimia', 3, 'Sais Aromáticos', { 'Sal Sagrado': 3, 'Erva Medicinal': 2, 'Cogumelo Pálido': 1 }, { dc: -10 }), R('granada', 'Granada', 'alquimia', 3, 'Granada', { 'Pólvora': 2, 'Sucata de Ferro': 1 }, { dc: -5 }),
    R('atadura', 'Atadura', 'medicina', 1, 'Atadura', { 'Erva Medicinal': 1, 'Papel de Arroz': 1 }), R('isca', 'Isca', 'caca', 2, 'Isca', { 'Carne de Caça': 1, 'Erva Medicinal': 1 }, { qty: 2 }),
    R('municaoPrata', 'Munição de Prata', 'engenharia', 1, 'Munição de Prata', { 'Pólvora': 1, 'Sucata de Ferro': 2 }, { dc: -5 }), R('municaoFogo', 'Munição Incendiária', 'engenharia', 1, 'Munição Incendiária', { 'Pólvora': 1, 'Óleo de Lamparina': 1 }, { dc: -5 }),
    R('municaoSal', 'Munição de Sal', 'engenharia', 2, 'Munição de Sal', { 'Pólvora': 1, 'Sal Sagrado': 2 }, { dc: -5 }),
    R('ofudaCura', 'Ofuda de Cura', 'talismas', 1, 'Ofuda de Cura', { 'Papel de Arroz': 2, 'Sal Sagrado': 2 }), R('ofudaPura', 'Ofuda Purificadora', 'talismas', 1, 'Ofuda Purificadora', { 'Papel de Arroz': 2, 'Sal Sagrado': 1 }),
    R('ofudaFogo', 'Ofuda de Fogo', 'talismas', 2, 'Ofuda de Fogo', { 'Papel de Arroz': 2, 'Óleo de Lamparina': 2 }, { dc: -5 }), R('ofudaSelo', 'Ofuda de Selo', 'talismas', 2, 'Ofuda de Selo', { 'Papel de Arroz': 2, 'Sal Sagrado': 2 }, { dc: -5 }),
    R('ofudaRet', 'Ofuda de Retorno', 'talismas', 2, 'Ofuda de Retorno', { 'Papel de Arroz': 3, 'Sal Sagrado': 3, 'Cogumelo Pálido': 1 }, { dc: -10 }),
    // runas da Forja: 1 essência do elemento + sucata (+ um extra nas mais fortes); o preço da runa fica em ~1,7× o custo
    R('runaPrecisao', 'Runa de Precisão', 'forja', 1, 'Runa de Precisão', { 'Essência de Amaterasu': 1, 'Sucata de Ferro': 2 }, { dc: -5 }), R('runaForca', 'Runa de Força', 'forja', 1, 'Runa de Força', { 'Essência de Atlas': 1, 'Sucata de Ferro': 2 }, { dc: -5 }),
    R('runaBrasa', 'Runa de Brasa', 'forja', 2, 'Runa de Brasa', { 'Essência de Kagutsuchi': 1, 'Sucata de Ferro': 2, 'Óleo de Lamparina': 1 }, { dc: -10 }), R('runaVeneno', 'Runa de Veneno', 'forja', 2, 'Runa de Veneno', { 'Essência de Hiruko': 1, 'Sucata de Ferro': 2, 'Raiz Amarga': 1 }, { dc: -10 }),
    R('runaTrovao', 'Runa de Trovão', 'forja', 3, 'Runa de Trovão', { 'Essência de Indra': 1, 'Sucata de Ferro': 2, 'Pólvora': 1 }, { dc: -15 }), R('runaSangue', 'Runa de Sangue', 'forja', 3, 'Runa de Sangue', { 'Essência de Shukketsu': 1, 'Sucata de Ferro': 2, 'Sal Sagrado': 1 }, { dc: -15 }),
    // refeições: viram o bônus do grupo na próxima batalha (m = modificadores)
    R('ensopado', 'Ensopado de Caça', 'culinaria', 1, '', { 'Carne de Caça': 2, 'Ervas de Cozinha': 1 }, { meal: { atk: 8 }, mealD: '+8% de dano' }), R('sopa', 'Sopa de Ervas', 'culinaria', 1, '', { 'Ervas de Cozinha': 2, 'Erva Medicinal': 1 }, { meal: { def: 8 }, mealD: '+8% de defesa' }),
    R('cha', 'Chá de Raiz', 'culinaria', 1, '', { 'Raiz Amarga': 1, 'Ervas de Cozinha': 1 }, { meal: { agi: 10 }, mealD: '+10% de velocidade' }), R('churrasco', 'Churrasco do Caçador', 'culinaria', 2, '', { 'Carne de Caça': 3, 'Ervas de Cozinha': 1 }, { meal: { hit: 10, atk: 5 }, mealD: '+10% de acerto e +5% de dano', dc: -5 }),
    R('caldo', 'Caldo Reforçado', 'culinaria', 2, '', { 'Carne de Caça': 2, 'Ervas de Cozinha': 2 }, { meal: { def: 10, agi: 5 }, mealD: '+10% de defesa e +5% de velocidade', dc: -5 }), R('doce', 'Doces de Festa', 'culinaria', 2, '', { 'Ervas de Cozinha': 2, 'Papel de Arroz': 1 }, { meal: { crit: 8 }, mealD: '+8% de crítico', dc: -5 }),
    R('banquete', 'Banquete', 'culinaria', 3, '', { 'Carne de Caça': 4, 'Ervas de Cozinha': 2, 'Sal Sagrado': 1 }, { meal: { atk: 10, def: 10, hit: 5 }, mealD: '+10% de dano, +10% de defesa e +5% de acerto', dc: -15 }),
    R('pratoDemonio', 'Prato de Demônio', 'culinaria', 3, '', { 'Carne de Demônio': 2, 'Ervas de Cozinha': 2 }, { meal: { atk: 20, agi: 10 }, mealD: '+20% de dano e +10% de velocidade (cada herói perde 3 de Sanidade ao comer)', san: 3, dc: -15 }),
  ].forEach(r => { REC[r.id] = r; });

  // runas de engaste, bônus de Assinatura e efeitos do segundo elemento das ligas
  const RUNAS = {
    'Runa de Brasa': { d: 'Ataques têm 25% de chance de queimar', st: ['burn', 2, 25] }, 'Runa de Veneno': { d: 'Ataques têm 25% de chance de envenenar', st: ['poison', 2, 25] },
    'Runa de Sangue': { d: 'Rouba 10% do dano como HP', drain: 10 }, 'Runa de Trovão': { d: 'Ataques têm 15% de chance de paralisar', st: ['para', 1, 15] },
    'Runa de Precisão': { d: '+5% de acerto', mod: { hit: 5 } }, 'Runa de Força': { d: '+5% de dano', mod: { atk: 5 } },
  };
  const SIG = [
    ['Fúria Contida', { atk: 10 }], ['Olho de Águia', { hit: 12 }], ['Sorte do Ferreiro', { crit: 12 }], ['Guarda de Ferro', { def: 10 }], ['Leveza', { agi: 12 }], ['Cura Silenciosa', { heal: 15 }],
    ['Gume Perfeito', { atkP: 3 }], ['Equilíbrio', { atk: 6, hit: 6 }], ['Peso Morto', { atk: 14, agi: -6 }], ['Vidro e Aço', { atk: 14, def: -8 }], ['Sentinela', { def: 6, hit: 6 }], ['Aurora', { crit: 8, agi: 8 }],
  ].map(([n, m]) => ({ n, m }));
  const ELST = { kagutsuchi: ['burn', 2], susanoo: ['wet', 2], atlas: ['root', 1], indra: ['para', 1], fuhaku: ['bleed', 2], amaterasu: ['blind', 1], tsukuyomi: ['fear', 2], shukketsu: ['bleed', 2], hiruko: ['rad', 2] };

  // helpers de ficha: nós aprendidos (ch.pof), Iniciações (ch.ofi), grau e bônus
  const learned = (ch, per) => (ch.pof || []).filter(id => id.startsWith(per + '.')).map(id => P[per]?.nodes.find(n => n.id === id)).filter(Boolean);
  const grau = (ch, per) => Math.max(0, ...learned(ch, per).map(n => n.t));
  const rollBonus = (ch, per) => BONUS[grau(ch, per)] + learned(ch, per).reduce((a, n) => a + (n.r || 0), 0);
  const hook = (ch, hk, how = 'max') => { const l = (ch.pof || []).map(id => P[id.split('.')[0]]?.nodes.find(n => n.id === id)).filter(n => n?.hk === hk).map(n => n.v); return how === 'sum' ? l.reduce((a, b) => a + b, 0) : l.length ? Math.max(...l.filter(v => typeof v === 'number')) || l[0] : 0; };
  const temp = (ch, per = 'forja') => Math.max(0, ...learned(ch, per).filter(n => n.fg === 'temp').map(n => n.v));
  const slots = ch => Math.max(0, ...learned(ch, 'forja').filter(n => n.fg === 'slot').map(n => n.v));
  const esp = ch => learned(ch, 'forja').find(n => n.hk === 'esp')?.v || '';
  // motivo para não poder aprender o nó (id "per.i") agora; '' = pode
  function whyNot(ch, id) {
    const [per, i] = id.split('.'), p = P[per], n = p?.nodes[+i];
    if (!n) return 'Nó inexistente.';
    if (ch.enemy) return 'Inimigos não têm ofícios.';
    if (!(ch.ofi || []).includes(per)) return `Exige a Iniciação em ${p.n} (dada pelo mestre).`;
    if ((ch.pof || []).includes(id)) return 'Já aprendido.';
    if (n.off) return 'Desativado pelo mestre.';
    const mine = learned(ch, per);
    if (n.ex && mine.some(o => o.ex === n.ex)) return 'Trancado: você escolheu outra especialização.';
    if (n.t > 1) { const prev = mine.filter(o => o.t === n.t - 1).length; if (prev < 4) return `Exige 4 nós do grau ${GRAU[n.t - 1]} (tem ${prev}).`; }
    if ((ch.po || 0) < n.po) return `Faltam ${n.po - (ch.po || 0)} PO.`;
    return '';
  }
  // receitas liberadas para o personagem na perícia: as dos nós aprendidos e as criadas pelo mestre (valem a partir do grau t)
  const recipes = (ch, per) => { const ids = new Set(learned(ch, per).flatMap(n => n.rec || [])); for (const r of Object.values(REC)) if (r.per === per && r.custom && grau(ch, per) >= r.t) ids.add(r.id); return [...ids].map(i => REC[i]).filter(r => r && !r.off); };
  // catálogo editável: o mestre guarda só as diferenças (cfg) e elas são mescladas sobre o catálogo acima; apply(null) volta ao padrão.
  // cfg = { per: {id: {n,d,a}}, node: {"per.i": {n,d,po,r,g,off}}, nodeNew: {per: [{n,d,t,po,r,g,chk,rec,off}]}, rec: {id: patch ou receita nova (custom)} }
  const SNAP = structuredClone({ P, REC });
  const apply = cfg => {
    cfg ||= {};
    for (const k of Object.keys(P)) delete P[k]; for (const k of Object.keys(REC)) delete REC[k];
    Object.assign(P, structuredClone(SNAP.P)); Object.assign(REC, structuredClone(SNAP.REC));
    for (const [id, o] of Object.entries(cfg.per || {})) if (P[id]) Object.assign(P[id], o);
    for (const [id, o] of Object.entries(cfg.node || {})) { const [per, i] = id.split('.'), n = P[per]?.nodes[+i]; if (n) Object.assign(n, o); }
    for (const [per, L] of Object.entries(cfg.nodeNew || {})) if (P[per]) L.forEach(o => { const { chk, ...x } = o, i = P[per].nodes.length; P[per].nodes.push({ po: [0, 2, 4, 7][o.t] ?? 2, ...x, t: o.t, ...(chk ? { act: 'checar', g: o.g || 0 } : {}), id: per + '.' + i, custom: true }); });
    for (const [id, o] of Object.entries(cfg.rec || {})) REC[id] = REC[id] && !o.custom ? { ...REC[id], ...o } : { dc: 0, qty: 1, mats: {}, ...o, id };
  };
  g.OFI = { PER: P, REC, RUNAS, SIG, ELST, GRAU, BONUS, apply, recipes, learned, grau, rollBonus, hook, temp, slots, esp, whyNot, order: Object.keys(P) };
})(globalThis);
