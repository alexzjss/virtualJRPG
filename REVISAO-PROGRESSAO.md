# Revisão da progressão de skills

## Escopo

A revisão cobre todos os setores montados em `tree.js`: Marcial, os nove Vínculos, Aura, Ocultismo e a Árvore de Armas. A árvore carregada contém 3.745 nós. A separação temática existente em `arvore/ordem.js` continua definindo os grandes grupos; esta revisão ajusta a ordem dentro de cada ramo na etapa de camadas (`arvore/camadas.js`).

## Regra de organização

Cada nó recebe uma impressão de família com base em:

- tipo da skill e operações de `fx` (dano, cura, escudo, controle, reação, invocação, entre outras);
- condição aplicada (`st`), categoria de Aura, tipo de arma e requisito de reação;
- variações de forma, domínio, invocação, dupla/trio, área e multi-golpe;
- palavras temáticas do nome e da descrição, para reconhecer famílias como fogo, água, sangue, sombra, defesa, mobilidade, ritual e suporte.

Ao preencher as posições de um ramo, a ordenação considera primeiro o grupo de custo próximo (faixa de 15 XP) e então escolhe o nó mais parecido com o anterior. Assim, a progressão tende a manter uma técnica básica e suas melhorias lado a lado, sem ignorar a curva de custo. Skills do kit atual, Limites, conceitos fortes, âncoras e pré-requisitos ainda obedecem às regras próprias de camada.

Ramos de variação com `de` seguem ligados à técnica-base como evoluções alternativas. Suas linhas não são misturadas com ramos temáticos. Ramos de armas continuam separados por tipo de arma. A função roda sobre toda a árvore, incluindo nós adicionados por futuras levas.

## Correção de efeito

`Secreção Tóxica` agora aplica veneno e exposição aos inimigos. Antes, a descrição prometia toxicidade, mas o nó apenas expunha os alvos.

## Verificação

`npm run audit` carrega e percorre a árvore: 3.745 nós, zero erros e cinco avisos de nome/efeito. Os avisos restantes são `Quebra-Escudo`, `Escudo e Espada`, `Postura de Bastião`, `Arremesso de Escudo` e `Cerco do Escudo`; a auditoria usa uma regra geral para palavras como “escudo”, que também aparece em técnicas ofensivas ou formas. Eles permanecem visíveis para revisão editorial posterior, sem bloquear a árvore.

## Limite da revisão

A afinidade automática é um critério consistente de agrupamento, não uma substituição para julgamento de design. Descrições ambíguas e mecânicas excepcionais continuam podendo pedir um ajuste manual; novos casos podem ser refinados nos dicionários temáticos e nas regras de `temaNo`.
