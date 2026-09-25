# Excursão — Uberlândia ↔ Pirapora

Painel para o pai controlar as viagens de ônibus. Texto grande, tabelas de grade, poucas telas. Sem preço: só **pago** ou **pendente**.

## Como rodar

```bash
npm install
npm run server   # API em http://localhost:3005
npm run dev      # tela em http://localhost:5173
```

Dados ficam em `database.sqlite`. O Vite encaminha `/api` para a porta 3005.

O painel pede login. Usuário: `Gomoura`. Senha: `Gomoura#`. Dá para ver a senha ao digitar. **Lembrar neste computador** mantém logado até clicar em **Sair**. Sem isso, fecha o navegador e precisa entrar de novo.

### Instalar no celular (PWA)

O app pode ir para a tela inicial e abrir sozinho, sem a barra do navegador.

1. No computador: `npm run build` e depois `npm run server`.
2. No celular, na mesma rede, abra `http://IP-DO-COMPUTADOR:3005` (o IP aparece no terminal, ou use o do Mac em Ajustes de rede).
3. **iPhone:** Compartilhar → **Adicionar à Tela de Início**.
4. **Android (Chrome):** menu → **Instalar app**. Se o Chrome não oferecer instalar, use o endereço com HTTPS (o Chrome só instala PWA em conexão segura).

Na tela de login, no celular, aparece o botão **Instalar no celular** quando o navegador permite. A lista e o cadastro continuam precisando da API no computador.

---

## Para quem é

Uso interno, uma pessoa na mesa. O leitor é mais velho: botão grande, confirmação no centro, sem jargão.

Na barra: **Viagens**, **Pessoas**, Ajustes (WhatsApp) e **Sair**.

---

## Regras de negócio

### Viagem

Uma viagem é **uma data + uma rota + um número de vagas**. Cria **uma de cada vez** (ida ou volta). Não cria o par sozinho.

Rotas permitidas:

- Uberlândia → Pirapora (em geral terça)
- Pirapora → Uberlândia (em geral quinta)

Não existe mesma cidade nos dois lados. Origem e destino viram um único campo **Rota**.

Alterar ou excluir só muda **aquela** viagem. As outras continuam iguais. Excluir pede confirmação no centro. Quem estava sentado **não é apagado** — continua em Pessoas.

A lista tem **Próximas** e **Realizadas**. A viagem muda de aba sozinha quando a data passa (hoje ainda é próxima).

Colunas da lista: Data, Origem, Destino, Lotação (`ocupados / vagas`), Pagos, Baixar, Abrir, Alterar, Excluir. Sem coluna de pendentes. Sem coluna de preço. A lista pagina sozinha: só entram as linhas que cabem na tela.

Alterar e excluir ficam na lista (ícones com título). Na tela da viagem há **Voltar** para a lista; sem Alterar nem Excluir ali.

Clicar na linha abre os passageiros.

### Pessoa (cadastro geral)

Pessoa é cadastro, não “passageiro solto”. Quem entra numa viagem também entra nesta lista. Tirar da viagem **não** apaga o cadastro.

Campos:

- Nome (obrigatório)
- Telefone
- Tipo de documento: CPF, RG, Certidão ou Outro
- Número do documento (tipo e número são campos separados)
- Ponto de referência (linha inteira no formulário; na tabela, **Ref.**)

Nova pessoa e Editar abrem o **mesmo popup central**. O nome sai em maiúsculas. Ao digitar, o app sugere até 8 cadastros parecidos (**Já cadastrada — escolher para usar**). Escolher preenche o formulário; na viagem o botão vira **Colocar nesta viagem**. Editar atualiza o cadastro em **todas** as viagens daquela pessoa. Excluir (ícone na lista, confirmação no centro) tira a pessoa da lista e de todas as viagens.

Na tabela de Pessoas:

- **Viagens**: quantas viagens a pessoa está vinculada (próximas e realizadas). Número maior que zero abre o histórico.
- **Última**: data da mais recente (também a que ainda vai acontecer). Clique abre essa viagem e **destaca** a linha da pessoa.
- No histórico (popup), clique numa linha abre a viagem com o mesmo destaque. Próximas também aparecem lá.
- Clicar na linha não abre painel. O número em Viagens abre o histórico; Última abre a viagem.
- O filtro usa a largura da tabela.
- No desktop a tabela cabe na tela, sem rolar para o lado. No celular, rola para o lado.
- A lista pagina: **Anterior** e **Próxima** quando não cabe tudo.

### Passageiro (pessoa nesta viagem)

Dentro da viagem:

- Busca filtra quem já está sentado.
- Se não achar, mostra a lista geral para **Colocar** ou a opção de cadastrar com o nome digitado.
- Nova pessoa e Editar: popup no centro, iguais ao de Pessoas. Cadastro novo já entra nesta viagem como **Pendente**.
- Tirar tira só desta viagem (confirmação no centro).
- Colunas: Nome, Tipo, Número, Ref., Telefone, Pagamento, Editar, Tirar. A altura da linha segue a lista de viagens.
- Pagamento: botão **Pago** (verde) ou **Pendente** (âmbar). Um clique troca. Sem valor em reais.
- Editar e Tirar na tabela são ícones (lápis e tirar), com título.

Não cabe mais gente que o número de vagas.

### Popups (padrão da tela)

Tudo que cria, altera ou pede confirmação abre no **centro**, com fundo escuro:

- Nova viagem / Alterar viagem — Data, Rota, Vagas
- Nova pessoa / Editar pessoa — Nome, Telefone, Tipo, Número e Ponto de referência (linha inteira)
- Histórico de viagens da pessoa
- Confirmar exclusão de viagem
- Confirmar “tirar desta viagem”

Cancelar, clicar fora ou Esc fecha. Os campos usam o mesmo rótulo + caixa branca.

### Cores das cidades

Nas células De/Para e nas pastilhas do título:

- Uberlândia: azul papel (`#D7E4F4` / `#1A3F7A`)
- Pirapora: bege papel (`#F1E0C8` / `#6B3A12`)

Data, Lotação e Pagos usam o papel comum (`#F3F1EC`). A linha inteira não pinta. A pessoa destacada (chegou pelo histórico) usa fundo `#F3E6CF`.

### O que o sistema não faz

- Não cobra, não soma dinheiro, não tem preço.
- Não muda viagens antigas quando se cria uma nova.
- Não apaga pessoa ao excluir viagem ou ao tirar o assento.
- Ajustes só grava o número de WhatsApp. Não gera a semana inteira na interface (a API antiga de semana ainda existe no servidor, mas a tela não usa).
- Não cria ida e volta no mesmo clique.

---

## Dados

Três cadastros principais:

- **people** — nome, telefone, tipo e número do documento, ponto de referência
- **trips** — data, origem, destino, vagas
- **passengers** — pessoa + viagem + pago/pendente
- **users** — administrador (`Gomoura`); a senha fica só em hash
- **sessions** — token do login, até Sair ou até expirar

`GET /api/people` devolve `trip_count` (todas as viagens vinculadas), `last_trip_date` e `last_trip_id`.
