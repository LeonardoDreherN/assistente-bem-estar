# 🌟 PROJETO: CLÍNICA DO BEM-ESTAR SENAI 🌟
## SISTEMA WEB INTELIGENTE DE ANÁLISE AUTOMATIZADA

---

### 1. Contextualização e Objetivo
Este projeto consiste no desenvolvimento de um **Assistente de Bem-Estar Inteligente** que opera sob o branding da **Clínica do Bem-Estar SENAI**. O sistema cumpre o ciclo completo de análise de dados:
1.  **Coleta:** Recebe dados de rotina (sono, estresse, alimentação, etc.) via formulário.
2.  **Processamento:** Utiliza a **Inteligência Artificial Generativa (Gemini)** para análise de perfil.
3.  **Entrega:** Produz um relatório final personalizado com diagnósticos, recomendações SMART e plano de ação, entregue em **PDF profissional**.

**Objetivo Central:** Automatizar a consultoria de bem-estar pessoal, garantindo alta precisão, persistência de dados (PostgreSQL) e usabilidade (UX/UI).

### 2. Stack Tecnológico e Versão

O projeto utiliza uma arquitetura Full-Stack JavaScript/Node.js com persistência em um banco de dados SQL robusto.

| Camada | Tecnologia | Dependências Chave | Justificativa |
| :--- | :--- | :--- | :--- |
| **Front-end** | HTML5, JS, CSS3 | Bootstrap 5 | Interface responsiva e formulário dinâmico. |
| **Back-end (API)**| **Node.js** com **Express** | `express`, `body-parser` | API REST leve para orquestração de dados. |
| **Integração IA** | **Google Gemini API** | `@google/genai` | Coração do sistema, responsável pela análise e conteúdo. |
| **Banco de Dados** | **PostgreSQL** | `pg` | Persistência de dados completa e histórica de relatórios. |
| **Geração de PDF**| **pdfkit** | `pdfkit` | Criação do documento final com layout e logo personalizados. |

### 3. Diagrama de Arquitetura (Fluxo de Dados)

O sistema opera de forma síncrona: o cliente espera a conclusão do processamento da IA e do DB antes de receber o resultado.

1.  **Cliente (Front-end)** submete dados.
2.  **Express API** (`/api/analisar`) inicia a transação.
3.  **Express API** envia prompt à **Gemini API**.
4.  **Gemini API** retorna o relatório de texto.
5.  **Express API** salva relatório e dados brutos no **PostgreSQL**.
6.  **Express API** retorna o ID de análise.
7.  **Cliente** solicita o PDF (`/api/download-pdf/:id`).
8.  **Express API** busca no **PostgreSQL**, gera o PDF (com `pdfkit`) e envia o arquivo para download.

### 4. Membros do Grupo (Critério de Organização e Planejamento)

1. **Leonardo Dreher**
2. **Thiago Kagoiki**
3. **Raul Schurraus**
4. **Gabriel Misse**
5. **Luiz Henrique Costa Rezende**
6. **Vini Schurraus**

***
*(Na apresentação final, inclua uma imagem simples deste fluxo!)*
***

### 5. Configuração e Instalação

#### A. Pré-requisitos
Certifique-se de que **Node.js**, **PostgreSQL** e as credenciais da **API Gemini** estão disponíveis.

#### B. Setup do Projeto e Dependências

```bash
# 1. Clone o repositório
git clone [LINK DO SEU REPOSITÓRIO GITHUB]
cd assistente-bem-estar

# 2. Instale as dependências
npm install