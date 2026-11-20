# ORBE — Plataforma de Registro e Acompanhamento de Ocorrências

## Sobre o projeto

O ORBE é uma aplicação desenvolvida para auxiliar no registro, na organização e no acompanhamento de ocorrências em trechos rodoviários.

A plataforma permite cadastrar trechos, registrar ocorrências, acompanhar seus status e visualizar informações organizadas para facilitar o monitoramento.

O projeto foi desenvolvido utilizando React Native, Expo e TypeScript.

## Funcionalidades

### 1. Gerenciamento de trechos
- Cadastro de trechos rodoviários.
- Identificação da rodovia.
- Definição dos quilômetros inicial e final.
- Seleção do trecho atual para acompanhamento.

### 2. Registro de ocorrências
- Cadastro de ocorrências vinculadas a um trecho.
- Seleção do tipo: Vegetação, Buraco, Sinalização ou Outro.
- Campo para descrição da ocorrência.
- Classificação de gravidade: Baixa, Média ou Alta.
- Registro da data da ocorrência.

### 3. Consulta e filtros
- Listagem das ocorrências cadastradas.
- Filtro por tipo de ocorrência.
- Filtro por nível de gravidade.
- Identificação visual da gravidade.

### 4. Acompanhamento de status
As ocorrências podem ter seus status atualizados entre:
- Aberta.
- Em andamento.
- Resolvida.

### 5. Painel de resumo
O sistema apresenta informações do trecho selecionado, incluindo:
- Total de ocorrências.
- Quantidade de ocorrências de alta gravidade.
- Tipo de ocorrência mais frequente.
- Alertas relacionados à quantidade de ocorrências graves.

### 6. Armazenamento de dados
Os dados são armazenados localmente utilizando AsyncStorage, permitindo manter os registros mesmo após fechar e abrir novamente o aplicativo.

## Tecnologias utilizadas

- React Native
- Expo
- TypeScript
- AsyncStorage
- Expo Router
- ESLint

## Organização do projeto

```text
src/
├── app/
│   └── index.tsx
├── components/
│   └── ModuloTrechos.tsx
└── utils/
    └── analisarTrecho.ts
```

## Como executar o projeto

### Pré-requisitos
- Node.js instalado.
- npm instalado.
- Expo Go no celular ou emulador Android configurado.

### Instalação

Clone o repositório:

```bash
git clone LINK_DO_REPOSITORIO
```

Entre na pasta do projeto:

```bash
cd orbe_react-main
```

Instale as dependências:

```bash
npm install
```

Inicie a aplicação:

```bash
npx expo start
```

Para iniciar utilizando túnel:

```bash
npx expo start --tunnel
```

Depois, escaneie o QR Code utilizando o Expo Go.

## Verificação do código

Para verificar os tipos do TypeScript:

```bash
npx tsc --noEmit
```

Para executar a verificação do ESLint:

```bash
npx eslint src/components/ModuloTrechos.tsx src/utils/analisarTrecho.ts
```

## Testes realizados

Foram realizados testes manuais para verificar:

- Cadastro e seleção de trechos.
- Registro de ocorrências.
- Aplicação dos filtros.
- Alteração dos status.
- Exibição do painel de resumo.
- Persistência dos dados após fechar e abrir o aplicativo.

## Considerações finais

O ORBE busca facilitar a organização e o acompanhamento de ocorrências rodoviárias, reunindo registros, filtros, indicadores e informações dos trechos em uma única aplicação.
