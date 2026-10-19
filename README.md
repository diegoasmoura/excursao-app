# Excursão — Uberlândia ↔ Pirapora

Painel para o pai controlar as viagens de ônibus. Texto grande, tabelas de grade, poucas telas. Sem preço: só **pago** ou **pendente**.

## Como acessar

- Na internet (túnel Cloudflare `dihan-nas`): [https://excursao.questlyforms.com.br](https://excursao.questlyforms.com.br)
- Na rede da casa: `http://IP-DO-NAS:3005` (hoje o NAS usa `192.168.0.2:3005`)

Login: **Gomoura** / **Gomoura#**. Dá para ver a senha ao digitar. **Lembrar neste computador** mantém logado até **Sair**. Sem isso, fecha o navegador e precisa entrar de novo. Na primeira subida do banco, o Gomoura é criado sozinho.

## Como rodar no Mac

```bash
npm install
npm run server   # API em http://localhost:3005
npm run dev      # tela em http://localhost:5173
```

Dados ficam em `database.sqlite`. O Vite encaminha `/api` para a porta 3005. O `.env` e o banco **não** vão para o Git.

## No NAS (Docker)

Pasta: `/Volume1/docker/excursao-app`

```bash
git clone https://github.com/diegoasmoura/excursao-app.git
cd excursao-app
mkdir -p data
docker compose up -d --build
```

O SQLite é compilado na imagem (o binário pronto pedia uma glibc que o NAS não tem). O banco fica em `data/database.sqlite`.

Atualizar:

```bash
cd /Volume1/docker/excursao-app
git pull
docker compose up -d --build
docker compose ps
```

Tem que aparecer **Up**. Conferir log: `docker compose logs --tail 20`.

No computador, na tela de Entrar e no menu, ao lado de Administração, aparece a versão (`V1.6.0`). No celular não aparece. O número fica em `package.json`. **Cada commit sobe essa versão** (correção `1.6.1`, função nova `1.7.0`, mudança grande `2.0.0`). Se mudou depois do update no NAS, o app novo entrou.

Importar a lista de pessoas (360 cadastros, sem duplicar documento ou nome+telefone). Só entra na lista geral; não senta em viagem. Depois do build:

```bash
docker compose exec app node scripts/import-people.cjs
```

Pode rodar de novo: quem já está no banco é pulado. No Mac, com o servidor local: `npm run import-people`.

## DNS (Cloudflare)

Túnel **dihan-nas**, rota **Published application**:

- Hostname: `excursao.questlyforms.com.br`
- Service: `HTTP` → `192.168.0.2:3005` (igual aos outros apps do túnel; não usar `localhost`)

O HTTPS fica no Cloudflare. No celular, com esse endereço, o Chrome deixa **Instalar app**.

### Instalar no celular (PWA)

1. Abra `https://excursao.questlyforms.com.br` (ou o IP do NAS na mesma Wi-Fi).
2. **iPhone:** Compartilhar → **Adicionar à Tela de Início**.
3. **Android:** menu → **Instalar app**. Na tela de login pode aparecer **Instalar no celular**.

---

## Para quem é

Uso interno. Leitor mais velho: botão grande, confirmação no centro, sem jargão.

Na barra: **Viagens**, **Pessoas**, Ajustes (WhatsApp) e **Sair**. No celular, **Ajustes** fica marcado enquanto o popup está aberto.

O quadro ao lado da barra muda de cor, suave: Viagens (azul-cinza), Pessoas (areia), detalhe da viagem (sálvia), Ajustes (lavanda).

---

## Regras de negócio

### Viagem

Uma viagem é **uma data + uma rota + um número de vagas**. Nova viagem abre com **45** vagas. A data é escolhida na criação. **Não há dia fixo** para ida ou volta. Trocar a rota não muda a data. Cria **uma de cada vez**. Não cria o par sozinho.

Rotas: Uberlândia → Pirapora ou Pirapora → Uberlândia. Um campo só (**Rota**). Mesma cidade nos dois lados não existe.

Alterar só muda **aquela** viagem. Quem estava sentado **não é apagado**.

Abas **Próximas**, **Realizadas** e **Canceladas**. Entre Próximas e Realizadas a viagem muda sozinha quando a data passa (hoje ainda é próxima). Para Canceladas só vai o que o pai cancelar.

Colunas: Data, **Dia** (Dom, Seg, Ter, Qua, Qui, Sex, Sáb), Origem, Destino, Lotação (`ocupados / vagas`), Pagos, Baixar, Abrir, Alterar e **Cancelar**. Na aba Canceladas as duas últimas viram **Voltar** e **Excluir de vez**. Sem pendentes. Sem preço. A lista pagina: só as linhas que cabem na tela.

No desktop, Origem e Destino ficam justas; os ícones de ação têm área maior no celular (dedo).

Alterar fica na lista. Na tela da viagem há **Voltar** (no celular, só a seta) na mesma linha da data e da rota. Clicar na linha abre os passageiros.

Quem tem anotação mostra um bloquinho ao lado da data. Linha cancelada fica cinza, com a data riscada e o selo **Cancelada**.

#### Cancelar viagem

Cancelar existe em dois lugares: no ícone da linha e no botão **Cancelar viagem** dentro da tela da viagem. No celular o botão de dentro é grande — não precisa arrastar a tabela até a última coluna.

A confirmação diz quantas pessoas vão, quantas pagas e quantas não vão. Cancelar **não apaga nada**: a viagem muda de aba, as pessoas continuam sentadas e a lista continua lá. Dentro da viagem cancelada aparecem **Voltar viagem** e **Excluir de vez**.

**Voltar** devolve para Próximas ou Realizadas conforme a data. **Excluir de vez** só existe em viagem cancelada, pede confirmação e apaga a viagem e os lugares — as pessoas continuam na lista geral.

#### Anotações da viagem

Cada viagem tem **um** texto livre no painel **Anotações desta viagem**, abaixo da lista de pessoas.

O texto é **formatado, tipo Word**. A barra de botões tem **Título**, **Negrito**, **Itálico**, **Sublinhado**, **Lista**, **Lista numerada**, **Realce** (marca-texto amarelo), **3 cores** de texto (marrom, verde, azul) e **Limpar formatação**. O botão do formato ligado fica aceso; Título e Realce desligam no segundo clique. Selecione o texto e toque no botão — no celular o botão segura a seleção, então ela não some. Colar entra como texto puro.

Grava só no botão **Salvar anotações**; o selo ao lado do título diz **Gravado**, **Falta gravar** ou **Gravando…**. Sair com texto sem gravar pergunta antes.

É só daquela viagem: não aparece nas outras, não vai no PDF e não mexe em pessoa nenhuma. Na lista de viagens, quem tem anotação ganha uma **barra âmbar** na borda da data, e passar o mouse mostra o começo do texto. Limite de 20000 caracteres.

Sem biblioteca de editor: é um `contentEditable` e tudo que entra passa por uma lista branca (`src/lib/richText.js`). O servidor recusa marcação perigosa como segunda barreira.

#### Nome repetido na lista de pessoas

Duplicata aqui é **mesmo nome**, ignorando acento, maiúscula e espaços sobrando: `JOSE DA SILVA`, `josé da silva` e `Jose  Da   Silva` são o mesmo.

Cada grupo ganha **uma cor pastel** na linha (6 cores, que se repetem se houver mais grupos) e um selo **N×** antes do nome dizendo quantos cadastros existem com ele. O título da tela mostra **M repetidas** e o botão **Só nomes repetidos** filtra.

Só **avisa**: o app não junta, não escolhe e não apaga nada sozinho. Documento igual com nome diferente não é marcado — o critério escolhido foi o nome.

### Pessoa (cadastro geral)

Pessoa é cadastro. Quem entra numa viagem também entra nesta lista. Tirar da viagem **não** apaga o cadastro.

Campos:

- Nome (obrigatório) — o pai escreve como quiser; só tira espaços sobrando
- Telefone
- Tipo de documento: CPF, RG, Certidão ou Outro
- Número (tipo e número separados)
- Ponto de espera, um para cada itinerário. **Uberlândia → Pirapora** guarda o que já estava cadastrado. **Pirapora → Uberlândia** começa vazio. Na tabela: **UDI → Pira** e **Pira → UDI**. No computador as duas dividem o espaço da antiga Ref. e a tabela continua cabendo na tela. No celular, rola para o lado, com largura mínima em cada ponto. Ao digitar, sugere até 8 textos já usados **naquele** itinerário (**Já usado — escolher para padronizar**). **Mover** passa o ponto para o outro itinerário; se os dois estiverem preenchidos, troca. A confirmação diz o texto e os dois sentidos. Só tira espaços sobrando.

Nova pessoa e Editar: **mesmo popup central**. Com 2 letras no nome, até 8 cadastros (**Já cadastrada — escolher para usar**, bloco âmbar). Na viagem o botão vira **Colocar nesta viagem**. Editar atualiza em **todas** as viagens. Excluir tira da lista e de todas as viagens.

Na tabela de Pessoas:

- **Viagens**: quantas viagens (próximas e realizadas). Número maior que zero abre o histórico. Lugar marcado como **não vai** não conta.
- **Última**: data da mais recente (também a que ainda vai acontecer). Clique abre a viagem e **destaca** a pessoa.
- No desktop a tabela cabe na tela. No celular, rola para o lado. Pagina sozinha.
- No histórico, linha cinza com o selo **Não foi** ou **Viagem cancelada** não conta na coluna **Viagens**.

### Passageiro

- Busca filtra quem já está sentado. Se não achar, oferece Colocar da lista geral ou cadastrar.
- Cadastro novo entra como **Pendente**.
- Tirar tira só desta viagem. Colunas: N., Nome, **Vai?**, Tipo, Número, Ref. do itinerário da viagem, Telefone, **WhatsApp**, Pagamento, Editar, Tirar.
- Pagamento: **Pago** (verde) ou **Pendente** (âmbar). Sem reais.
- Não cabe mais gente que as vagas.

#### Não vai (passageiro que desistiu)

**Vai?** marca que a pessoa não vai mais nesta viagem. É um toque, sem confirmação, e o mesmo botão desfaz.

A linha fica **cinza**, o nome **riscado**, o botão vira **Não vai** e o pagamento fica cinza. Quem não vai **não conta em nada**: sai das Vagas, da Lotação, dos Pagos, da numeração e do PDF. A **vaga fica livre** para outra pessoa.

A pessoa **não é apagada** e o lugar continua guardado, só marcado. O N. numera quem vai; quem não vai fica com **—** mas mantém o lugar na ordem.

Voltar a viajar precisa de vaga livre — sem vaga, o app avisa para aumentar as vagas. Colocar de novo quem tinha desistido reativa o mesmo lugar e mantém o pagamento já marcado.

O topo da viagem mostra **Vagas x de y**, **n pagos** e, quando houver, **m não vão**.

### Popups

Tudo abre no **centro**. No celular o fundo fica desfocado.

- Nova / alterar viagem — Data, Rota, Vagas
- Nova / editar pessoa — Nome, Telefone, Tipo, Número, ponto de Uberlândia → Pirapora e ponto de Pirapora → Uberlândia
- Histórico, excluir viagem, excluir pessoa, tirar da viagem, Ajustes (WhatsApp)

Cancelar, clique fora ou Esc fecha.

### WhatsApp e PDF

- Ajustes grava **um** número. Esse número só serve para enviar a lista da viagem.
- **Baixar** abre um popup para marcar as colunas do PDF (Número, Nome, Documento, Ref., Pagamento). A escolha fica lembrada. **Ref.** sai com o ponto do itinerário daquela viagem. Documento junta tipo e número. Sem Tipo e Telefone soltos. Uma linha, sem quebra (`lista-25-09-2026-uberlandia-pirapora.pdf`). Quem está marcado como **não vai** fica de fora da lista impressa; o cabeçalho mostra quantos são.
- **Abrir**, na lista de viagens, só abre o WhatsApp do número dos Ajustes. Não baixa o PDF.
- Mensagem da lista: Bom dia / Boa tarde / Boa noite, Cumpadre; cita a viagem; Abraço. No computador abre o WhatsApp no navegador.
- Na lista de pessoas da viagem, a coluna **WhatsApp** abre a conversa **daquela pessoa**, com o telefone do cadastro, sem texto pronto. Sem telefone válido, o botão fica desativado. No celular abre o app; no computador, o WhatsApp no navegador.

### Cores das cidades

- Uberlândia: `#D7E4F4` / `#1A3F7A`
- Pirapora: `#F1E0C8` / `#6B3A12`
- Data, Lotação, Pagos: `#F3F1EC`
- Pessoa destacada: `#F3E6CF`
- Linha cancelada ou **não vai**: `#E3E6EA` com texto `#6B7280`
- Selo Cancelada / Não vai / Não foi: `#FEE2E2` / `#991B1B`
- Anotações: **Gravado** `#F0FDF4` / `#1F5B38`; **Falta gravar** `#FFFBEB` / `#92400E`
- Barra de "tem anotação" na lista: `#D97706`. Realce no texto: `#FDE68A`
- Cores de texto das anotações: marrom `#B45309`, verde `#1F5B38`, azul `#1A3F7A`
- Nome repetido, 6 cores pastel: `#FBE4E6`, `#E2F0E4`, `#E6E6F8`, `#FDF0D9`, `#DCF0F2`, `#F8E6D8`

### O que o sistema não faz

- Não cobra, não soma dinheiro, não tem preço.
- Não muda viagens antigas ao criar uma nova.
- Não apaga pessoa ao excluir viagem ou ao tirar o assento.
- Não apaga nada ao **cancelar viagem**: só muda o estado e a aba. **Voltar** desfaz.
- Não tira a pessoa da viagem ao marcar **não vai**: só marca, e a vaga fica livre.
- Anotações são de cada viagem. Não aparecem em outra tela nem no PDF.
- Nome repetido só **avisa**, com cor e selo. Não junta nem apaga cadastro sozinho.
- Ajustes só grava o WhatsApp da lista. O botão de cada passageiro usa o telefone do cadastro.
- Não cria ida e volta no mesmo clique. Não gera a semana na tela.

---

## Dados

- **people** — nome, telefone, tipo e número, ponto de Uberlândia → Pirapora (`reference_point`) e ponto de Pirapora → Uberlândia (`reference_point_back`)
- **trips** — data, origem, destino, vagas (padrão 45 nas novas), `status` (`upcoming` ou `cancelled`) e `notes` (HTML já limpo pela lista branca; texto puro de versão antiga continua abrindo certo)
- **passengers** — pessoa + viagem + pago/pendente + `is_cancelled` (não vai)
- **users** — administrador (`Gomoura`); senha em hash
- **sessions** — token até Sair ou expirar

As colunas novas entram sozinhas na subida do servidor (`ALTER TABLE` no `setupDatabase`). Banco antigo não precisa de migração manual.

`GET /api/trips` devolve `passenger_count`, `paid_count` e `dropped_count` — os dois primeiros já descontam quem marcou **não vai**.

`GET /api/people` devolve `trip_count`, `last_trip_date` e `last_trip_id`, contando só lugares de quem vai.

Rotas novas: `PATCH /api/trips/:id/cancel`, `PATCH /api/trips/:id/restore`, `PATCH /api/trips/:id/notes`, `PATCH /api/passengers/:id/cancel`.
