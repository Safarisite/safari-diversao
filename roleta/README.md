# Roleta Safári — V6 ADMIN LOCAL

Esta versão continua sendo de **teste local** e usa `localStorage`, mas agora possui
um painel administrativo para controlar a campanha sem editar o código.

## Abrir

- `index.html` → roleta do cliente
- `admin.html` → painel de administração

Use o VS Code + Live Server para que as duas páginas compartilhem o mesmo `localStorage`.

## O que o painel ADM permite

### Visão geral
- total de participações;
- total de códigos emitidos;
- quantidade de resultados;
- prêmios ativos;
- próximos prêmios controlados;
- códigos usados e restantes;
- liberar o próximo cliente no mesmo aparelho.

### Regras da roleta
Cada prêmio pode ser configurado como:

**Aleatório por peso**
- peso do sorteio;
- bloquear nas primeiras X participações;
- exigir um mínimo de clientes entre duas premiações iguais;
- permitir ou não no giro extra.

**Controlado por intervalo**
- exemplo: `10, 15, 20`;
- o sistema embaralha os intervalos e força o prêmio quando chega a rodada;
- o Passaporte Premiado vem configurado desta forma.

### Prêmios e textos
É possível:
- editar o texto dentro da roleta;
- editar título, mensagem e destaque do resultado;
- trocar cor;
- trocar ícone;
- ativar/desativar;
- duplicar;
- excluir;
- criar novos prêmios;
- definir quantos códigos cada ganhador recebe;
- editar os textos gerais da tela.

### Cupons
- total;
- emitidos;
- restantes;
- adicionar novos códigos pelo painel, um por linha.

Os códigos originais das quatro planilhas continuam carregados pelo `coupons.js`.
Códigos adicionados pelo painel ficam no `localStorage`.

### Histórico
Registra:
- data/hora;
- rodada;
- prêmio;
- código(s) liberado(s);
- se foi giro normal, giro extra ou teste forçado.

Também há botão para exportar o histórico em CSV.

## Configuração inicial mantida

- Não foi dessa vez: peso 0
- Tente outra vez: peso 10
- R$10 no balão: peso 10
- 50% na próxima visita: peso 30, bloqueado nas 2 primeiras participações e com intervalo mínimo de 2 clientes
- +20 minutos: peso 20
- Passaporte Premiado: controlado por intervalos 10, 15 e 20; libera 3 códigos

No giro extra, por padrão, somente:
- R$10 no balão
- +20 minutos

podem sair.

## Importante

Esta versão é ideal para testar regras e interface.

Ao publicar de verdade, o painel administrativo, cupons, histórico, trava por cliente
e contadores deverão ser migrados para banco/backend. Não publique os códigos reais
em GitHub Pages como solução final.


## V6.1 — painel simplificado

O painel `admin.html` foi reorganizado para ficar mais fácil de usar.

Agora existem somente quatro áreas principais:

1. **Resumo**
2. **Configurar roleta**
3. **Cupons**
4. **Histórico**

### Como cadastrar códigos no ADM

1. Abra `admin.html`.
2. Entre em **Cupons**.
3. Escolha o prêmio.
4. Depois:
   - importe um arquivo `.csv`; **ou**
   - cole os códigos no campo, um por linha.
5. O painel mostra:
   - quantos códigos encontrou;
   - quantos são novos;
   - quantos já estavam cadastrados.
6. Clique em **Cadastrar códigos**.

Para as planilhas no formato usado pela Safári, o importador procura automaticamente
a coluna chamada `cupom` e ignora o cabeçalho. Quando existir uma coluna `status`,
somente linhas válidas são consideradas.

Os códigos cadastrados pelo ADM continuam sendo salvos no `localStorage` durante
esta fase de testes.


## V6.3 — acabamento da roleta

- linhas divisórias das fatias agora usam exatamente o mesmo ângulo das cores;
- separadores ficaram mais nítidos, com linha escura + filete claro;
- ponteiro redesenhado e com batida mecânica mais natural;
- ao parar, a fatia vencedora acende exatamente no setor premiado;
- texto do prêmio vencedor pulsa;
- aro da roleta pisca em dourado;
- a roda faz um pequeno movimento de assentamento ao finalizar;
- todos os efeitos continuam responsivos no celular.


## V6.4 — novo visual com fundo enviado

- fundo principal trocado para a arte enviada pelo usuário;
- layout centralizado, com a roleta em destaque na frente;
- paleta ajustada para tons próximos da arte (azul profundo, vermelho, bege e dourado);
- roleta com mais lâmpadas e luzes mais fortes;
- botão principal redesenhado para combinar com o novo tema;
- mantida a lógica da roleta, cupons e painel administrativo.


## V6.5 — fundo exato do usuário
- substituído o fundo pela própria foto enviada pelo usuário, sem blur e sem alteração de imagem;
- mantido somente um overlay azul leve por cima para preservar a leitura da interface.


## V6.6 — correção definitiva do fundo
- corrigido o z-index que escondia a foto atrás do fundo do body;
- a foto enviada agora é exibida em uma camada fixa visível;
- sem blur, sem filtro e com apenas 10% de película azul para manter leitura.


## V7 — alterações solicitadas
- “Não foi dessa vez” agora aparece duas vezes na roleta;
- “Passaporte Premiado” removido;
- novo prêmio “Tempo em dobro” adicionado;
- visual revisado para valorizar melhor a foto de fundo, com roleta centralizada e acabamento mais limpo;
- chaves de localStorage atualizadas para abrir com a configuração nova sem herdar testes antigos.


## V7.1 — ajuste visual da roleta
- corrigido o visual dos nomes nas fatias para não ficarem tão de lado;
- rótulos reposicionados um pouco mais para dentro;
- tipografia e tamanho dos textos refinados para mobile e desktop;
- leve limpeza no bloco visual atrás da roleta.


## V7.2 — ajustes pedidos
- ponteiro superior colocado na frente da roleta;
- adicionadas pequenas luzes internas, uma para cada fatia;
- todas as fatias foram duplicadas visualmente para dar mais volume;
- os duplicados foram distribuídos ao longo da roleta, sem ficar lado a lado;
- textos das fatias reduzidos para caber melhor com o aumento de quantidade.


## V7.3 — refinamento visual das fatias
- nomes das fatias recentralizados;
- tipografia das fatias ficou mais encorpada e com cara mais de jogo/roleta;
- luzes internas agora correm em sequência durante o giro, acompanhando a sensação de roleta manual;
- resposta visual das lâmpadas reforçada.


## V7.4 — correção do texto nas fatias
- textos reposicionados mais para fora, dentro de cada setor;
- largura dos rótulos reduzida para evitar invasão entre fatias;
- tipografia trocada por uma opção mais limpa e legível;
- ícones reduzidos para dar mais espaço ao texto.


## V7.5 — rótulos refeitos
- rótulos das fatias refeitos com textos mais curtos e limpos;
- ícones removidos das fatias para abrir espaço;
- posição dos rótulos ajustada para ficar dentro dos setores;
- tipografia simplificada para melhorar a leitura.


## V7.6 — leitura das fatias melhorada
- rótulos encurtados para caber melhor nas fatias duplicadas;
- fonte trocada para uma opção mais arredondada e mais compatível com o visual da roleta;
- textos aumentados para facilitar leitura;
- posição dos rótulos ajustada um pouco mais para fora.


## V7.7 — ajustes finos pedidos
- textos das fatias voltaram com os mesmos nomes, porém com quebras melhores;
- textos maiores e com fonte serifada/premium;
- rótulos podem ficar de lado para aproveitar melhor a largura da fatia;
- luz das fatias movida para perto da borda superior;
- animação de luz agora aciona o ponteiro e o som de tec-tec durante o giro;
- lâmpadas da borda ganharam nova cor;
- fundo reposicionado para a placa superior não ficar cortada.


## V7.8 — ajuste leve nos nomes
- nomes das fatias aumentados mais um pouco;
- mantidos próximos do limite da fatia, mas sem invadir o setor vizinho;
- responsivo refinado para celular e desktop.


## V7.9 — nomes maiores e mais grossos
- nomes aumentados novamente, quase ocupando a largura útil da fatia;
- peso da fonte aumentado para 900;
- espaçamento e altura de linha ajustados para crescer sem invadir a fatia vizinha;
- responsividade mantida em telas menores.


## V7.10 — tamanho das letras corrigido na lógica
- corrigido o JavaScript que estava sobrescrevendo o tamanho maior definido no CSS;
- textos agora realmente aumentam quase até o limite seguro de cada fatia;
- largura do texto passa a ser calculada pelo tamanho real da roleta;
- fonte mais grossa e contrastada para melhorar a leitura.


## V7.11 — letras das fatias maiores
- aumentei novamente o cálculo automático do tamanho das letras;
- ampliei também a largura útil do rótulo para o texto ocupar mais a fatia;
- mantive o peso forte e a leitura em mobile e desktop.


## V7.12 — correções marcadas
- fatias duplicadas agora são embaralhadas para não ficarem lado a lado;
- rótulos voltaram com os mesmos textos, só com quebras melhores;
- letras aumentadas mais um pouco, mantendo leitura sem invadir tanto a fatia vizinha.


## V7.13 — ajuste dos nomes das fatias
- “50% na próxima visita” alterado para “50% de desconto na próxima visita”;
- “Espere 2h e ganhe +20 min” alterado para “Volte daqui 2h e ganhe 20 min grátis”.


## V7.14 — textos corrigidos de verdade
- atualizados os textos visíveis nas fatias;
- atualizados também os textos internos de configuração, resultado e admin para manter tudo igual.
