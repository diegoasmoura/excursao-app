# Regras de negócio — Excursões

Este arquivo é o combinado do produto. O README tem o mesmo texto com o passo a passo para rodar.

## Produto

Painel interno para controlar ônibus Uberlândia ↔ Pirapora. Leitor mais velho: texto grande, poucas telas, confirmação no centro. **Sem preço.** Só pago ou pendente.

Login: `Gomoura` / `Gomoura#`. Na primeira subida do banco o usuário é criado sozinho. **Lembrar neste computador** mantém logado até **Sair**.

Barra: **Viagens**, **Pessoas**, Ajustes (WhatsApp) e **Sair**. No celular, Ajustes fica marcado enquanto o popup está aberto.

Acesso: [https://excursao.questlyforms.com.br](https://excursao.questlyforms.com.br) (túnel Cloudflare `dihan-nas` → `http://192.168.0.2:3005`). Na rede da casa: `http://IP-DO-NAS:3005`.

PWA: no iPhone, Compartilhar → Adicionar à Tela de Início. No Android, Instalar app (HTTPS do domínio público deixa instalar). No NAS o app sobe com Docker; os dados ficam em `data/database.sqlite` e não vão para o Git.

Versão: o número em `package.json` sobe **em todo commit**. No computador a tela mostra `V1.6.2` (hoje). No celular não aparece. Correção = último número; função nova = do meio; mudança grande = o primeiro.

O quadro ao lado da barra muda de cor por tela: Viagens (azul-cinza), Pessoas (areia), detalhe (sálvia), Ajustes (lavanda).

## Viagem

- Uma viagem = data + rota + vagas. Nova viagem abre com **45** vagas. Viagens antigas não mudam sozinhas.
- A data é escolhida na criação. **Não há dia fixo** para ida ou volta. Trocar a rota não muda a data.
- Cria **uma de cada vez**. Não cria o par ida+volta sozinho.
- Rotas: **Uberlândia → Pirapora** ou **Pirapora → Uberlândia**. Um campo só (Rota).
- Alterar fica na **lista**. Na tela da viagem há **Voltar** (no celular, só a seta, na mesma linha da data e da rota) e as ações de cancelamento.
- Alterar muda só aquela viagem. Pessoas **não são apagadas**.
- Abas **Próximas** / **Realizadas** / **Canceladas**: Próximas e Realizadas mudam sozinhas quando a data passa (hoje ainda é próxima). Canceladas só recebe o que o pai cancelar.
- Colunas: Data, **Dia** (Dom, Seg, Ter, Qua, Qui, Sex, Sáb), Origem, Destino, Lotação, Pagos, Baixar, Abrir, Alterar e **Cancelar**. Sem Pendentes. Sem R$.
- Na aba Canceladas as duas últimas colunas viram **Voltar** e **Excluir de vez**.
- Origem e Destino ficam justas no desktop. No celular os ícones de ação têm toque maior.
- A lista pagina: só as linhas que cabem. Clicar na linha abre os passageiros.
- Quem tem anotação mostra um desenho de bloquinho ao lado da data.

### Cancelar viagem

- **Cancelar** existe em dois lugares: no ícone da linha e no botão **Cancelar viagem** dentro da tela da viagem (no celular, botão grande — não precisa arrastar a tabela).
- A confirmação diz quantas pessoas vão, quantas pagas e quantas não vão.
- Cancelar **não apaga nada**. A viagem vai para Canceladas, as pessoas continuam sentadas e a lista continua lá.
- Dentro da viagem cancelada aparecem **Voltar viagem** e **Excluir de vez**. O aviso explica que ninguém conta na lotação.
- **Voltar** devolve para Próximas ou Realizadas, conforme a data.
- **Excluir de vez** só existe em viagem cancelada, na aba Canceladas ou dentro dela. Pede confirmação e apaga a viagem e os lugares. Pessoas **não são apagadas**.
- Linha cancelada fica **cinza e riscada**, com o selo **Cancelada** ao lado da data.

### Anotações da viagem

- Cada viagem tem **um** texto livre, no painel **Anotações desta viagem**, abaixo da lista de pessoas.
- O texto é **formatado, tipo Word**. Barra de botões: **Título**, **Negrito**, **Itálico**, **Sublinhado**, **Lista**, **Lista numerada**, **Realce** (marca-texto amarelo), **3 cores** de texto (marrom, verde, azul) e **Limpar formatação**.
- O botão do formato que está ligado fica aceso. Título e Realce desligam no segundo clique.
- Selecione o texto e toque no botão. No celular o botão segura a seleção, então ela não some ao tocar.
- Colar entra como **texto puro**: não vem formatação de fora.
- Grava só no botão **Salvar anotações**. O selo ao lado do título diz **Gravado**, **Falta gravar** ou **Gravando…**.
- Sair da viagem com texto sem gravar pergunta antes.
- É só daquela viagem. Não aparece nas outras, não vai no PDF e não mexe em pessoa nenhuma.
- Na lista de viagens, quem tem anotação ganha uma **barra âmbar** na borda da data. Passar o mouse mostra o começo do texto.
- Limite de 20000 caracteres de HTML. Só entra o que a lista branca aceita (`src/lib/richText.js`); o servidor recusa o resto.

## Pessoa

- Cadastro geral. Quem entra numa viagem também entra nesta lista.
- Campos: Nome (obrigatório), Telefone, Tipo (CPF por padrão, RG, Certidão, Outro), Número, ponto de **Uberlândia → Pirapora** e ponto de **Pirapora → Uberlândia**. Telefone `(34) 98886-1577`. CPF `000.000.000-00`, RG `00.000.000-0`, Certidão em blocos.
- **Nome** e os dois pontos ficam como o pai escrever. Só tira espaços sobrando.
- O ponto que já existia continua em **Uberlândia → Pirapora**. O outro começa vazio.
- Ao digitar um ponto, até 8 textos já usados **naquele** itinerário (**Já usado — escolher para padronizar**).
- Na lista: **UDI x Pira** e **Pira x UDI**, na mesma linha. No desktop a tabela cabe na tela. No celular, rola para o lado.
- Nova pessoa e Editar: popup no centro. Com 2 letras no nome, até 8 cadastros (**Já cadastrada — escolher para usar**, bloco âmbar).
- Editar atualiza em **todas** as viagens. Excluir tira da lista e de todas as viagens.
- **Viagens** (número) abre o histórico. **Última** abre a viagem e destaca a pessoa. Lugar marcado como **não vai** não conta aqui.
- A lista da planilha entra com `docker compose exec app node scripts/import-people.cjs`. Só cadastro geral, sem duplicar.

### Nome repetido

- Duplicata aqui é **mesmo nome**, ignorando acento, maiúscula e espaços sobrando. `JOSE DA SILVA`, `josé da silva` e `Jose  Da   Silva` são o mesmo.
- Cada grupo ganha **uma cor pastel** na linha inteira. São 6 cores; se houver mais grupos, elas se repetem.
- Antes do nome aparece um selo **N×** dizendo quantos cadastros têm aquele nome.
- No título da tela aparece **M repetidas**. O botão **Só nomes repetidos** filtra.
- Uma legenda embaixo do botão explica a cor e o selo.
- Só **avisa**. O app não junta, não escolhe e não apaga nada sozinho — quem decide é o pai, em Editar ou Excluir.
- Documento igual com nome diferente **não** é marcado. É de propósito: o critério escolhido foi o nome.

## Passageiro

- Busca filtra quem já está na viagem. Se não achar, oferece Colocar ou cadastrar.
- Cadastro novo senta como **Pendente**. Tirar tira só desta viagem.
- Colunas: N., Nome, **Vai?**, Tipo, Número, Ref. do itinerário da viagem, Telefone, **WhatsApp**, Pagamento, Editar, Tirar.
- Pagamento: Pago (verde) ou Pendente (âmbar). Sem valor. Não cabe mais gente que as vagas.

### Não vai (passageiro que desistiu)

- **Vai?** marca que a pessoa **não vai mais** nesta viagem. É um toque, sem confirmação, e desfaz no mesmo botão.
- A linha fica **cinza**, o nome **riscado**, o botão vira **Não vai** e o pagamento fica cinza.
- Quem não vai **não conta**: sai das Vagas, da Lotação, dos Pagos, da numeração e do PDF. A **vaga fica livre** para outra pessoa.
- A pessoa **não é apagada** e continua na lista geral. O lugar continua guardado, só marcado.
- O N. numera só quem vai. Quem não vai fica com **—** mas mantém o lugar na ordem.
- Voltar a viajar precisa de vaga livre. Sem vaga, avisa para aumentar as vagas.
- Colocar de novo quem tinha desistido **reativa o mesmo lugar** e mantém o pagamento que já estava marcado.
- No histórico da pessoa a linha fica cinza com o selo **Não foi** (ou **Viagem cancelada**) e não conta na coluna **Viagens**.
- O topo da viagem mostra **Vagas x de y**, **n pagos** e, quando houver, **m não vão**.

## Popups e campos

Tudo abre no centro, com fundo escuro. No celular o fundo fica **desfocado**.

| Popup | Campos |
| --- | --- |
| Nova / alterar viagem | Data, Rota, Vagas |
| Nova / editar pessoa | Nome; Telefone, Tipo e Número; ponto de Uberlândia → Pirapora e ponto de Pirapora → Uberlândia |
| Histórico | Tabela de viagens |
| Excluir / tirar / cancelar viagem / voltar viagem / anotações sem gravar / Ajustes | Texto + ações |

Cancelar, clique fora ou Esc fecha. O popup não passa da tela.

## Cores

- Uberlândia: `#D7E4F4` / `#1A3F7A`.
- Pirapora: `#F1E0C8` / `#6B3A12`.
- Data, Lotação, Pagos: `#F3F1EC`.
- Pessoa destacada: `#F3E6CF`.
- Linha cancelada ou **não vai**: `#E3E6EA` com texto `#6B7280`.
- Selo Cancelada / Não vai / Não foi: `#FEE2E2` / `#991B1B`.
- Anotações: **Gravado** `#F0FDF4` / `#1F5B38`; **Falta gravar** `#FFFBEB` / `#92400E`.
- Barra de "tem anotação" na lista: `#D97706`. Realce no texto: `#FDE68A`.
- Cores de texto das anotações: marrom `#B45309`, verde `#1F5B38`, azul `#1A3F7A`.
- Nome repetido, 6 cores pastel: `#FBE4E6`, `#E2F0E4`, `#E6E6F8`, `#FDF0D9`, `#DCF0F2`, `#F8E6D8`.

## WhatsApp

- Ajustes grava **um** número. Esse número só serve para enviar a lista da viagem.
- **Baixar** abre um popup para marcar as colunas do PDF (Número, Nome, Documento, Ref., Pagamento). A escolha fica lembrada. **Ref.** sai com o ponto do itinerário daquela viagem. Documento junta tipo e número. Sem Tipo e Telefone soltos. Sem quebra de linha.
- **Abrir**, na lista de viagens, só abre o WhatsApp do número dos Ajustes. Não baixa o PDF.
- Mensagem da lista: Bom dia / Boa tarde / Boa noite, Cumpadre; cita a viagem; Abraço. No computador abre o WhatsApp no navegador.
- Na lista de pessoas da viagem, a coluna **WhatsApp** abre a conversa **daquela pessoa**, com o telefone do cadastro, sem texto pronto. Sem telefone válido, o botão fica desativado. No celular abre o app; no computador, o WhatsApp no navegador.

## O que não muda sozinho

- Criar ou alterar uma viagem não altera as outras.
- Excluir viagem ou tirar assento não apaga pessoa.
- Cancelar viagem não apaga nada: só muda o estado e a aba. **Voltar** desfaz.
- Marcar **não vai** não tira a pessoa da viagem nem apaga o cadastro.
- Anotações são de cada viagem. Não aparecem em nenhuma outra tela nem no PDF.
- Nome repetido só **avisa**, com cor e selo. O app não junta nem apaga cadastros sozinho.
- Não há preço. Ajustes só grava o WhatsApp da lista. O botão de cada passageiro usa o telefone do cadastro.
- A tela não gera a semana.
