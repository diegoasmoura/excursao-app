# Regras de negócio — Excursões

Este arquivo é o combinado do produto. O README tem o mesmo texto com o passo a passo para rodar.

## Produto

Painel interno para controlar ônibus Uberlândia ↔ Pirapora. Leitor mais velho: texto grande, poucas telas, confirmação no centro. **Sem preço.** Só pago ou pendente.

Login: `Gomoura` / `Gomoura#`. Na primeira subida do banco o usuário é criado sozinho. **Lembrar neste computador** mantém logado até **Sair**.

Barra: **Viagens**, **Pessoas**, Ajustes (WhatsApp) e **Sair**. No celular, Ajustes fica marcado enquanto o popup está aberto.

Acesso: [https://excursao.questlyforms.com.br](https://excursao.questlyforms.com.br) (túnel Cloudflare `dihan-nas` → `http://192.168.0.2:3005`). Na rede da casa: `http://IP-DO-NAS:3005`.

PWA: no iPhone, Compartilhar → Adicionar à Tela de Início. No Android, Instalar app (HTTPS do domínio público deixa instalar). No NAS o app sobe com Docker; os dados ficam em `data/database.sqlite` e não vão para o Git.

Versão: o número em `package.json` sobe **em todo commit**. No computador a tela mostra `V1.1.3` (hoje). No celular não aparece. Correção = último número; função nova = do meio; mudança grande = o primeiro.

O quadro ao lado da barra muda de cor por tela: Viagens (azul-cinza), Pessoas (areia), detalhe (sálvia), Ajustes (lavanda).

## Viagem

- Uma viagem = data + rota + vagas. Nova viagem abre com **45** vagas. Viagens antigas não mudam sozinhas.
- A data é escolhida na criação. **Não há dia fixo** para ida ou volta. Trocar a rota não muda a data.
- Cria **uma de cada vez**. Não cria o par ida+volta sozinho.
- Rotas: **Uberlândia → Pirapora** ou **Pirapora → Uberlândia**. Um campo só (Rota).
- Alterar e excluir ficam na **lista**. Na tela da viagem só há **Voltar** (no celular, só a seta, na mesma linha da data e da rota).
- Alterar muda só aquela viagem. Excluir pede confirmação. Pessoas **não são apagadas**.
- Abas **Próximas** / **Realizadas**: muda sozinha quando a data passa (hoje ainda é próxima).
- Colunas: Data, **Dia** (Dom, Seg, Ter, Qua, Qui, Sex, Sáb), Origem, Destino, Lotação, Pagos, Baixar, Abrir, Alterar, Excluir. Sem Pendentes. Sem R$.
- Origem e Destino ficam justas no desktop. No celular os ícones de ação têm toque maior.
- A lista pagina: só as linhas que cabem. Clicar na linha abre os passageiros.

## Pessoa

- Cadastro geral. Quem entra numa viagem também entra nesta lista.
- Campos: Nome (obrigatório), Telefone, Tipo (CPF por padrão, RG, Certidão, Outro), Número, Ponto de referência. Telefone `(34) 98886-1577`. CPF `000.000.000-00`, RG `00.000.000-0`, Certidão em blocos.
- **Nome** e **Ref.** ficam como o pai escrever. Só tira espaços sobrando.
- Ao digitar a Ref., até 8 textos já usados (**Já usado — escolher para padronizar**). Escolher só preenche a Ref.
- Na lista, Ref. No desktop a tabela cabe na tela. No celular, rola para o lado.
- Nova pessoa e Editar: popup no centro. Com 2 letras no nome, até 8 cadastros (**Já cadastrada — escolher para usar**, bloco âmbar).
- Editar atualiza em **todas** as viagens. Excluir tira da lista e de todas as viagens.
- **Viagens** (número) abre o histórico. **Última** abre a viagem e destaca a pessoa.
- A lista da planilha entra com `docker compose exec app node scripts/import-people.cjs`. Só cadastro geral, sem duplicar.

## Passageiro

- Busca filtra quem já está na viagem. Se não achar, oferece Colocar ou cadastrar.
- Cadastro novo senta como **Pendente**. Tirar tira só desta viagem.
- Colunas: Nome, Tipo, Número, Ref., Telefone, Pagamento, Editar, Tirar.
- Pagamento: Pago (verde) ou Pendente (âmbar). Sem valor. Não cabe mais gente que as vagas.

## Popups e campos

Tudo abre no centro, com fundo escuro. No celular o fundo fica **desfocado**.

| Popup | Campos |
| --- | --- |
| Nova / alterar viagem | Data, Rota, Vagas |
| Nova / editar pessoa | Nome; Telefone, Tipo e Número; Ponto de referência na linha de baixo |
| Histórico | Tabela de viagens |
| Excluir / tirar / Ajustes | Texto + ações |

Cancelar, clique fora ou Esc fecha. O popup não passa da tela.

## Cores

- Uberlândia: `#D7E4F4` / `#1A3F7A`.
- Pirapora: `#F1E0C8` / `#6B3A12`.
- Data, Lotação, Pagos: `#F3F1EC`.
- Pessoa destacada: `#F3E6CF`.

## WhatsApp

- Ajustes grava **um** número.
- **Baixar** abre um popup para marcar as colunas do PDF (Número, Nome, Documento, Ref., Pagamento). A escolha fica lembrada. Documento junta tipo e número. Sem Tipo e Telefone soltos. Sem quebra de linha.
- **Abrir** só abre o WhatsApp. Não baixa o PDF.
- Mensagem: Bom dia / Boa tarde / Boa noite, Cumpadre; cita a viagem; Abraço. No computador abre o WhatsApp no navegador.

## O que não muda sozinho

- Criar ou alterar uma viagem não altera as outras.
- Excluir viagem ou tirar assento não apaga pessoa.
- Não há preço. Ajustes só grava o WhatsApp.
- A tela não gera a semana.
