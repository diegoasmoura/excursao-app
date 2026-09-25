# Regras de negócio — Excursões

Este arquivo é o combinado do produto. O README tem o mesmo texto com o passo a passo para rodar.

## Produto

Painel interno para controlar ônibus Uberlândia ↔ Pirapora. Leitor mais velho: texto grande, poucas telas, confirmação no centro. **Sem preço.** Só pago ou pendente.

O painel pede login. Usuário: `Gomoura`. Senha: `Gomoura#`. Dá para ver a senha ao digitar. **Lembrar neste computador** mantém logado até clicar em **Sair**. Sem isso, fecha o navegador e precisa entrar de novo.

Barra: **Viagens**, **Pessoas**, Ajustes (WhatsApp) e **Sair**.

Dá para **instalar no celular** (PWA): ícone na tela inicial, abre em tela cheia. No iPhone: Compartilhar → Adicionar à Tela de Início. No Android: Instalar app (Chrome pede conexão segura). No NAS o app sobe com Docker; os dados ficam em `data/database.sqlite` e não vão para o Git.

## Viagem

- Uma viagem = data + rota + vagas.
- Cria **uma de cada vez** (Nova viagem). Não cria o par ida+volta sozinho.
- Rotas: **Uberlândia → Pirapora** ou **Pirapora → Uberlândia**. Um campo só (Rota). Mesma cidade nos dois lados não existe.
- Sugestão de dia: terça para Uberlândia→Pirapora, quinta para o inverso. É só ajuda ao abrir o popup; a data pode ser qualquer uma.
- Alterar e excluir ficam na **lista** (ícones com título). Na tela da viagem só há **Voltar** (volta para a lista). Sem Alterar nem Excluir ali.
- Alterar muda só aquela viagem. Excluir pede confirmação no centro. Pessoas da viagem **não são apagadas**.
- Abas **Próximas** / **Realizadas**: a viagem muda sozinha quando a data passa (hoje ainda é próxima).
- Colunas: Data, Origem, Destino, Lotação (`ocupados / vagas`), Pagos, Baixar, Abrir, Alterar, Excluir. Sem Pendentes. Sem R$.
- A lista mostra só as linhas que cabem na tela. **Anterior** e **Próxima** aparecem quando passa disso.
- Clicar na linha abre os passageiros. No celular, Voltar e a rota ficam na mesma faixa; a busca e Nova pessoa ficam lado a lado.

## Pessoa

- Cadastro geral. Quem entra numa viagem também entra nesta lista.
- Campos: Nome (obrigatório), Telefone, Tipo de documento (CPF por padrão, RG, Certidão, Outro), Número, Ponto de referência. Tipo e número são separados. Telefone usa máscara `(34) 98886-1577`. O número segue o tipo: CPF `000.000.000-00`, RG `00.000.000-0`, Certidão em blocos de 32 dígitos. O ponto de referência ocupa a linha inteira do formulário.
- Na lista, o ponto de referência aparece como **Ref.** No desktop a tabela cabe na largura da tela (sem rolar para o lado). No celular, a grade rola para o lado e o texto não quebra.
- A lista mostra só as linhas que cabem na tela. **Anterior** e **Próxima** aparecem quando passa disso.
- Nova pessoa e Editar: **popup no centro**, iguais em Pessoas e dentro da viagem.
- O **Nome** sai em maiúsculas ao digitar. Com 2 letras, aparecem até 8 cadastros parecidos (nome e telefone em duas linhas). Texto da lista: **Já cadastrada — escolher para usar**. Escolher preenche o form. Na viagem o botão vira **Colocar nesta viagem**. Quem já está no ônibus aparece como **Já nesta viagem**.
- Editar atualiza o cadastro em **todas** as viagens daquela pessoa.
- Excluir fica na lista (ícone, ao lado de Editar), com confirmação no centro. A pessoa sai da lista e de **todas** as viagens.
- **Viagens**: quantas viagens a pessoa está **vinculada** (próximas e realizadas). Número > 0 abre o histórico (popup).
- **Última**: data da viagem mais recente (também vale a que ainda vai acontecer). Clique abre a viagem e **destaca** a pessoa na tabela.
- No histórico, clique numa linha abre a viagem com o mesmo destaque. Próximas também listam.
- Clicar na linha **não** abre painel. O número em **Viagens** abre o histórico; **Última** abre a viagem; Editar e Excluir são os ícones. O filtro usa a largura da tabela.

## Passageiro

- Busca filtra quem já está na viagem. Se não achar, oferece Colocar da lista geral ou cadastrar com o nome digitado.
- Cadastro novo já senta nesta viagem como **Pendente**.
- Tirar tira só desta viagem (confirmação no centro). A pessoa continua na lista geral.
- Colunas: Nome, Tipo, Número, Ref., Telefone, Pagamento, Editar, Tirar. A altura da linha é a mesma da lista de viagens.
- Pagamento: botão Pago (verde) ou Pendente (âmbar). Um clique troca. Sem valor.
- Editar e Tirar na tabela são ícones (lápis / tirar), com título.
- Não cabe mais gente que as vagas.

## Popups e campos

Tudo que cria, altera ou confirma abre no centro, com fundo escuro:

| Popup | Campos |
| --- | --- |
| Nova / alterar viagem | Data, Rota, Vagas |
| Nova / editar pessoa | Nome; Telefone, Tipo e Número na mesma linha; Ponto de referência na linha de baixo, largura inteira |
| Histórico da pessoa | Tabela de viagens |
| Excluir viagem / excluir pessoa / tirar pessoa | Texto + Cancelar / confirmar |

Cancelar, clique fora ou Esc fecha. Rótulo + caixa branca em todo campo. O popup **não passa da tela**; a **caixa inteira** rola (nomes, campos e o resto). Título e botões ficam visíveis. A lista de nomes não tem barra própria.

## Cores

- Uberlândia: `#D7E4F4` / `#1A3F7A` (células De/Para e pastilhas).
- Pirapora: `#F1E0C8` / `#6B3A12`.
- Data, Lotação, Pagos: papel `#F3F1EC`. A linha inteira não pinta.
- Pessoa destacada (veio do histórico): `#F3E6CF`.

## WhatsApp

- Em Viagens, a engrenagem grava **um** número de WhatsApp.
- **Baixar** gera o PDF daquela viagem. Nome: `lista-25-09-2026-uberlandia-pirapora.pdf`. Colunas: N., Nome, Tipo, Documento, Ref., Telefone, Pagamento. Texto em uma linha (sem quebra).
- **Abrir** só abre o WhatsApp Web. Não baixa o PDF — isso fica em **Baixar**.
- A mensagem usa Bom dia / Boa tarde / Boa noite, Cumpadre; cita a viagem; e pede para anexar o PDF se ele já tiver sido baixado.
- Sem o número gravado, o ícone abre a configuração.

## O que não muda sozinho

- Criar ou alterar uma viagem não altera as outras.
- Excluir viagem ou tirar assento não apaga pessoa. Excluir a pessoa tira ela da lista e de todas as viagens.
- Não há preço nem soma em reais. Ajustes só grava o WhatsApp; não é uma tela de configuração geral.
- A interface não “gera a semana”. A API antiga de semana pode existir no servidor; a tela não a usa.
