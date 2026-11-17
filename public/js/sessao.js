// ===== janela Sessão (mestre): internet, convite, contas e passo a passo =====
const sess = { n: '', p: '', ch: '', last: null };
const heroes = () => Object.values(S.chars).filter(c => !c.enemy);
const genPass = () => Array.from(crypto.getRandomValues(new Uint32Array(6)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
const inviteUrl = () => !S.net.code ? '' : S.net.portal ? S.net.portal + '?c=' + S.net.code : S.net.url + '/player'; // sem página de entrada configurada, o convite é o link direto do túnel
const inviteText = () => `Mesa aberta! Para entrar na sessão de hoje:\n1. Abra ${inviteUrl()}\n2. Digite seu login e sua senha e clique em Entrar.\n${S.net.portal ? `(Se pedir o código da sessão: ${S.net.code})\nO código` : 'O link'} muda a cada sessão; o login e a senha continuam os mesmos.`;
const accessText = a => `Seu acesso ao virtualJRPG\nLogin: ${a.n}\nSenha: ${a.p}\nNo dia da sessão eu mando o link de entrada. Você pode trocar a senha depois, no botão Senha, no alto da tela.`;
const copy = (t, ok) => navigator.clipboard?.writeText(t).then(() => toast(ok, 'ok'), () => prompt('Copie o texto:', t)) ?? prompt('Copie o texto:', t);
function sessWin() {
  const n = S.net, st = { ok: 'Aberta', abrindo: 'Abrindo…', baixando: 'Preparando…', erro: 'Com problema', off: 'Desligada' }[n.status] || n.status;
  const net = `<h4>Internet <span class="net ${esc(n.status)}">${st}</span></h4>
    ${n.status === 'ok' ? `<div class="invite"><small>Código da sessão</small><b>${esc(n.code)}</b><small>${esc(inviteUrl())}</small></div><div class="row"><button class="own" data-a="copy" data-k="invite">Copiar convite</button></div>`
      : `<p><small>${esc(n.msg)}</small></p>`}
    ${n.lan.length ? `<p><small>Mesma rede Wi-Fi (sem internet): ${n.lan.map(u => esc(u) + '/player').join(' · ')}</small></p>` : ''}`;
  const acc = S.accounts.map(a => { const own = heroes().filter(c => c.owner === a);
    return `<div class="acct"><b>${esc(a)}</b><span class="chips">${own.map(c => `<span data-a="freeChar" data-id="${c.id}" title="Tirar este personagem da conta">${esc(c.name)} ×</span>`).join('') || '<small>sem personagem</small>'}</span>
      <span class="row"><button data-a="peek" data-k="${esc(a)}" title="Abre a tela deste jogador em outra aba, só para olhar">Ver como</button><button data-a="peek" data-v="1" data-k="${esc(a)}" title="Abre a tela deste jogador em outra aba para você jogar por ele">Assumir</button><button data-a="giveChar" data-k="${esc(a)}">+ Personagem</button><button data-a="userPass" data-k="${esc(a)}">Nova senha</button><button data-a="userDel" data-k="${esc(a)}">Apagar</button></span></div>`; }).join('') || '<p><small>Nenhuma conta ainda. Crie uma para cada jogador.</small></p>';
  const opts = heroes().map(c => `<option value="${c.id}" ${sess.ch === c.id ? 'selected' : ''}>${esc(c.name)}${c.owner ? ' (de ' + esc(c.owner) + ')' : ''}</option>`).join('');
  const form = `<div class="row"><input data-sess="n" aria-label="Login do jogador" placeholder="Login (sem espaços)" value="${esc(sess.n)}"><input data-sess="p" aria-label="Senha" placeholder="Senha (vazio = gerar)" value="${esc(sess.p)}"></div>
    <div class="row"><select data-sess="ch" aria-label="Personagem da conta"><option value="">Sem personagem por enquanto</option>${opts}</select><button class="own" data-a="userAdd">Criar conta</button></div>
    ${sess.last ? `<div class="invite"><small>Passe só para esse jogador</small><b>${esc(sess.last.n)} · ${esc(sess.last.p)}</b></div><div class="row"><button data-a="copy" data-k="acc">Copiar acesso</button></div>` : ''}`;
  const guide = `<details><summary>Passo a passo do mestre</summary><ol>
    <li><b>Antes da 1ª sessão:</b> crie aqui uma conta para cada jogador e escolha o personagem dela. Copie o acesso e mande para cada um em particular.</li>
    <li><b>No dia:</b> abra o programa e espere "Internet: Aberta" (na 1ª vez ele baixa o cloudflared, leva um minuto).</li>
    <li>Clique em <b>Copiar convite</b> e cole no grupo. O código muda a cada vez que você abre o programa.</li>
    <li>Durante o jogo, os pedidos dos jogadores aparecem na faixa <b>Pedidos</b>, no alto: Enter aprova, Delete nega. Em "Aprovar sozinho" você libera um tipo de ação sem passar por você.</li>
    <li>Na TV, abra <b>/table</b> e entre com o login <b>mestre</b> e a sua chave.</li>
    <li>Ao fim, feche a janela do programa: o link para de funcionar e tudo fica salvo na pasta <b>data</b>. Faça cópia dessa pasta de vez em quando.</li>
    <li>Jogador esqueceu a senha: <b>Nova senha</b>. Quem estiver conectado com a senha antiga é desconectado.</li></ol></details>`;
  return net + `<h4>Contas dos jogadores</h4>${acc}<h4>Nova conta</h4>${form}${guide}`;
}

