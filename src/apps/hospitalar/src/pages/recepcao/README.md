# Módulo de Recepção e Acolhimento (ProBPA Hospitalar)

Bem-vindo à documentação do Módulo de Recepção do ProBPA Hospitalar. Este módulo atua como a principal "porta de entrada" dos pacientes na unidade de saúde, sendo responsável pelo registro inicial, controle de fluxo e emissão de tickets de triagem.

## 🎯 Conceito Central

A Recepção foi desenhada com foco em **agilidade** e **informação visual**. O objetivo é que os recepcionistas consigam identificar o paciente, capturar dados essenciais (incluindo foto) e encaminhá-lo para a fila de triagem no menor tempo possível, sem perder a completude dos dados demográficos exigidos pelo Ministério da Saúde.

O design do painel segue uma linha de "Estação de Comando" (Command Center), onde métricas vitais estão sempre visíveis para evitar superlotações e gargalos no fluxo de atendimento.

---

## 🗺️ Estrutura de Rotas

O módulo está encapsulado na rota `/recepcao` e faz uso de sub-rotas aninhadas para navegação interna, otimizando o carregamento da tela:

- **`/recepcao` (Dashboard):** Visão geral estratégica. Contém os "Cards de Métricas" em tempo real (Total em Espera, Total em Triagem, Acolhimentos Diários e Mensais). Funciona como o termômetro do fluxo atual da recepção.
- **`/recepcao/acolhimento` (Acolhimento):** O coração da operação. É a tela de operação ("mão na massa") do recepcionista.
- **`/recepcao/espera` (Fila de Espera):** (Planejado) Aba destinada a visualizar e gerenciar ativamente os pacientes que já geraram ticket e estão no saguão aguardando o chamado da enfermagem (Triagem).

---

## ⚡ Principais Funcionalidades (Atual)

### 1. Dashboard Analítico
- Cards superiores renderizam contagens rápidas.
- Planejado para abrigar gráficos de pico de horário (Analytics) para ajudar na alocação de equipes (ex: colocar mais atendentes entre 18h e 20h).

### 2. Layout Inteligente (Sidebar)
- Sidebar lateral colapsável. Isso permite maximizar o espaço de tela útil (muito importante em monitores menores comuns em balcões de recepção).
- Identificação clara do "Usuário Logado" e seu respectivo "Papel" (Role), garantindo a auditoria das ações.

### 3. Acolhimento e Busca Ágil
- Busca centralizada pelo **CPF** do paciente.
- Tabela de **"Pacientes Recentes"**: Exibe um cache ou listagem rápida dos últimos pacientes cadastrados ou agendados, permitindo pular a etapa de busca (1 click to action).

### 4. Cadastro Dinâmico e "Menor de Idade"
- O formulário capta dados vitais: Cartão Nacional de Saúde (CNS), Endereço, Nome da Mãe (exigência para desambiguação de homônimos).
- **Lógica de Idade:** O sistema calcula automaticamente a idade com base na Data de Nascimento. Caso seja **< 18 anos**, o formulário injeta dinamicamente e obrigatoriamente a aba de **Dados do Responsável** (Nome, CPF e Grau de Parentesco).

### 5. Captura de Câmera e Ticket (QR Code)
- **Câmera Integrada (`react-webcam`):** O sistema aciona a webcam nativamente com overlay (máscara oval) para padronizar a foto do rosto do paciente. A foto aumenta a segurança e evita fraudes de identidade.
- **Geração de Ticket (`qrcode.react`):** Concluído o processo, um Ticket Térmico virtual é exibido. Ele acusa a gravidade inicial, indica claramente se é um paciente *MENOR DE IDADE* e embute todos os dados sensíveis em um **QR Code rastreável** (Hash) de Alta Densidade, feito especificamente para ser "bipado" pelo Leitor de Códigos de Barras lá na sala da Enfermeira (Módulo Triagem).

---

## 🛠 Tecnologias Chaves Empregadas
- **React (Vite) + TypeScript:** Base de código strongly-typed.
- **Framer Motion:** Micro-animações que tornam o fluxo amigável (animações ao abrir modalidades, trocar cores, etc).
- **Lucide React:** Iconografia padronizada e moderna.
- **Firebase Auth (Mock):** Sistema preparado para injeção do token JWT do Firebase, hoje rodando em modo Mock-Login (LocalStorage).

## 🚀 Próximos Passos
O próximo passo no ecossistema Hospitalar é o consumo deste módulo. O ticket emitido aqui alimenta diretamente o **Módulo de Triagem (Classificação de Risco)**.
