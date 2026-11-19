# Cenários em cel shading: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** aplicar o estilo cel aprovado na demo do Bosque aos 10 cenários.
**Architecture:** tudo em `public/js/terreno3d.js`. A flag `CEL` (padrão ligada) troca a arte na montagem, e os helpers da demo viram globais.
**Spec:** `docs/superpowers/specs/2026-11-19-cenarios-cel-design.md`

## Global Constraints
- Contorno `INK = '#1c3038'`; nada de clip-path/máscara em camadas 3D; peças em high de cada tema ≤ 1,25 × as da floresta.
- `vj_terr_estilo = simples` volta ao estilo antigo.

## Review Focus
- Filtro de contorno cortado na borda do viewBox (recorte encostado na borda perde metade da linha).
- Noite: o contorno escuro sobre o fundo escuro some, mas a leitura precisa continuar.
- Ids SVG repetidos entre recortes (`clipPath`/`filter`) quando a mesma página tem vários data URLs: cada SVG é um documento próprio, então não colidem.

### Task 1: estilo cel como padrão e testes
- [ ] Teste em `tools/test-terreno.js`: `construir('campo',2,'dia').html` não contém `class="tb"` (sem bolinhas), e contém `feMorphology` (há contorno nos recortes); `construir('floresta',2,'dia','simples').html` contém `class="tb"`.
- [ ] Rodar: falha.
- [ ] Implementar: `estilo` padrão `cel`, `simples` desliga. `olSvg(w,h,body,r)` envolve o corpo num filtro de contorno. `B.blob` em CEL vira um recorte de tufo (memo por paleta e variante). Os cogumelos passam `{round:true}`. `bumps` desenha contorno numa cor mais escura. `ridge` deixa névoa. Nuvens viram `celCloud`. Saturação ×0,9 em `grade`. As árvores do Campo usam a `celTreeSvg`. Feixes em high nos temas listados no spec.
- [ ] Rodar `node --test tools/test-terreno.js`: passa. Commit.

### Task 2: verificação
- [ ] Navegador: os 10 temas em dia e alguns em tarde e noite, sem erro no console dos cenários, com capturas.
- [ ] Commit e memória.
