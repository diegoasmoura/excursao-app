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

Pasta: `/Volume1/docker/dihan/excursao-app`

```bash
git clone https://github.com/diegoasmoura/excursao-app.git
cd excursao-app
mkdir -p data
docker compose up -d --build
```

O SQLite é compilado na imagem (o binário pronto pedia uma glibc que o NAS não tem). O banco fica em `data/database.sqlite`.

Atualizar:

```bash
cd /Volume1/docker/dihan/excursao-app
git pull
docker compose up -d --build
docker compose ps
```

Tem que aparecer **Up**. Conferir log: `docker compose logs --tail 20`.

Na tela de Entrar e no menu, ao lado de Administração, aparece a versão (`V1.1.1`). O número fica em `package.json`. **Cada commit sobe essa versão** (correção `1.1.1`, função nova `1.2.0`, mudança grande `2.0.0`). Se mudou depois do update no NAS, o app novo entrou.

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

Alterar ou excluir só muda **aquela** viagem. Excluir pede confirmação no centro. Quem estava sentado **não é apagado**.

Abas **Próximas** e **Realizadas**. A viagem muda de aba quando a data passa (hoje ainda é próxima).

Colunas: Data, **Dia** (Dom, Seg, Ter, Qua, Qui, Sex, Sáb), Origem, Destino, Lotação (`ocupados / vagas`), Pagos, Baixar, Abrir, Alterar, Excluir. Sem pendentes. Sem preço. A lista pagina: só as linhas que cabem na tela.

No desktop, Origem e Destino ficam justas; os ícones de ação têm área maior no celular (dedo).

Alterar e excluir ficam na lista. Na tela da viagem há **Voltar** (no celular, só a seta) na mesma linha da data e da rota. Clicar na linha abre os passageiros.

### Pessoa (cadastro geral)

Pessoa é cadastro. Quem entra numa viagem também entra nesta lista. Tirar da viagem **não** apaga o cadastro.

Campos:

- Nome (obrigatório) — o pai escreve como quiser; só tira espaços sobrando
- Telefone
- Tipo de documento: CPF, RG, Certidão ou Outro
- Número (tipo e número separados)
- Ponto de referência (linha inteira; na tabela, **Ref.**). Ao digitar, sugere até 8 textos já usados (**Já usado — escolher para padronizar**). Escolher só preenche a Ref. Só tira espaços sobrando.

Nova pessoa e Editar: **mesmo popup central**. Com 2 letras no nome, até 8 cadastros (**Já cadastrada — escolher para usar**, bloco âmbar). Na viagem o botão vira **Colocar nesta viagem**. Editar atualiza em **todas** as viagens. Excluir tira da lista e de todas as viagens.

Na tabela de Pessoas:

- **Viagens**: quantas viagens (próximas e realizadas). Número maior que zero abre o histórico.
- **Última**: data da mais recente (também a que ainda vai acontecer). Clique abre a viagem e **destaca** a pessoa.
- No desktop a tabela cabe na tela. No celular, rola para o lado. Pagina sozinha.

### Passageiro

- Busca filtra quem já está sentado. Se não achar, oferece Colocar da lista geral ou cadastrar.
- Cadastro novo entra como **Pendente**.
- Tirar tira só desta viagem. Colunas: Nome, Tipo, Número, Ref., Telefone, Pagamento, Editar, Tirar.
- Pagamento: **Pago** (verde) ou **Pendente** (âmbar). Sem reais.
- Não cabe mais gente que as vagas.

### Popups

Tudo abre no **centro**. No celular o fundo fica desfocado.

- Nova / alterar viagem — Data, Rota, Vagas
- Nova / editar pessoa — Nome, Telefone, Tipo, Número, Ref.
- Histórico, excluir viagem, excluir pessoa, tirar da viagem, Ajustes (WhatsApp)

Cancelar, clique fora ou Esc fecha.

### WhatsApp e PDF

- Ajustes grava **um** número.
- **Baixar** abre um popup para marcar as colunas do PDF (Número, Nome, Documento, Ref., Pagamento). A escolha fica lembrada. Documento junta tipo e número. Sem Tipo e Telefone soltos. Uma linha, sem quebra (`lista-25-09-2026-uberlandia-pirapora.pdf`).
- **Abrir** só abre o WhatsApp. Não baixa o PDF.
- Mensagem: Bom dia / Boa tarde / Boa noite, Cumpadre; cita a viagem; Abraço. No computador abre o WhatsApp no navegador.

### Cores das cidades

- Uberlândia: `#D7E4F4` / `#1A3F7A`
- Pirapora: `#F1E0C8` / `#6B3A12`
- Data, Lotação, Pagos: `#F3F1EC`
- Pessoa destacada: `#F3E6CF`

### O que o sistema não faz

- Não cobra, não soma dinheiro, não tem preço.
- Não muda viagens antigas ao criar uma nova.
- Não apaga pessoa ao excluir viagem ou ao tirar o assento.
- Ajustes só grava o WhatsApp.
- Não cria ida e volta no mesmo clique. Não gera a semana na tela.

---

## Dados

- **people** — nome, telefone, tipo e número, ponto de referência
- **trips** — data, origem, destino, vagas (padrão 45 nas novas)
- **passengers** — pessoa + viagem + pago/pendente
- **users** — administrador (`Gomoura`); senha em hash
- **sessions** — token até Sair ou expirar

`GET /api/people` devolve `trip_count`, `last_trip_date` e `last_trip_id`.
