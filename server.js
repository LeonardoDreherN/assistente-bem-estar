// server.js

// 1. Configuração Inicial e Importações
require('dotenv').config(); // Carrega variáveis de ambiente (.env)
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const pdf = require('pdfkit'); 
const { v4: uuidv4 } = require('uuid'); 
const { Pool } = require('pg'); 
const fs = require('fs'); // Importação essencial para verificar e carregar a logo

// --- Variáveis de Ambiente e Instâncias ---
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("ERRO: A chave GEMINI_API_KEY não foi encontrada no arquivo .env.");
    process.exit(1);
}

const ai = new GoogleGenAI(API_KEY);
const model = "gemini-2.5-flash"; // Modelo rápido

// --- CONFIGURAÇÃO DO POOL DO POSTGRESQL ---
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Teste de Conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('ERRO: Falha ao conectar ao PostgreSQL. Verifique suas credenciais no .env e se o serviço está ativo.', err.stack);
    } else {
        console.log('PostgreSQL conectado com sucesso!');
        release();
    }
});

// --- MIDDLEWARES ---
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// --- FUNÇÃO CENTRAL: INTEGRAÇÃO COM A IA ---
async function gerarRelatorioIA(dadosUsuario) {
    
    // 1. Cria o PROMPT de Engenharia
    const prompt = `Aja como um Consultor de Bem-Estar e Produtividade da Clínica SENAI. Analise os dados do usuário a seguir e gere um relatório profissional em português com 3 seções principais. 
Use títulos de Markdown (##) para as seções e listas com bullet points (-) para os itens. Mantenha um tom motivacional e profissional.

## Análise (Pontos Fortes e de Atenção)
- Resumo do perfil atual.
- Destaque o impacto do sono, estresse e exercício na produtividade.

## Recomendações Personalizadas
- 3 a 5 sugestões práticas e específicas baseadas nos dados fornecidos (Ex: Se dorme pouco e está estressado, sugira meditação antes de dormir).

## Plano de Ação de 7 Dias (3 metas SMART)
- Crie 3 metas de curto prazo (7 dias) que sejam Específicas, Mensuráveis, Alcançáveis, Relevantes e Temporais.

Dados do Usuário:
- Nome: ${dadosUsuario.nome}
- Média de Sono: ${dadosUsuario.horasSono} horas
- Qualidade do Sono: ${dadosUsuario.qualidadeSono}
- Copos de Água por Dia: ${dadosUsuario.coposAgua}
- Frequência de Exercício: ${dadosUsuario.frequenciaExercicio} dias/semana
- Nível de Estresse: ${dadosUsuario.nivelEstresse}
- Período de Maior Energia: ${dadosUsuario.maiorEnergia}
`;

    console.log(`[${new Date().toLocaleTimeString()}] Chamando a IA para análise...`);

    // 2. Chama a API Gemini
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text;
}


// --- ROTAS DA API ---

// ROTA 1: POST /api/analisar 
app.post('/api/analisar', async (req, res) => {
    const client = await pool.connect();
    try {
        const dadosForm = req.body;
        
        // 1. Gera o relatório de texto com a IA
        const relatorioTexto = await gerarRelatorioIA(dadosForm);

        // 2. Persistência de Dados no PostgreSQL
        const idAnalise = uuidv4();
        const nomeUsuario = dadosForm.nome || 'Anônimo';

        const query = `
            INSERT INTO relatorios (id, nome_usuario, dados_formulario, relatorio_ia)
            VALUES ($1, $2, $3, $4)
        `;
        const values = [idAnalise, nomeUsuario, dadosForm, relatorioTexto];
        
        await client.query(query, values);

        console.log(`[${new Date().toLocaleTimeString()}] Relatório gerado e salvo no PG. ID: ${idAnalise}`);
        
        // 3. Retorna o texto e o ID para o Front-end
        res.json({ 
            message: "Análise concluída com sucesso.", 
            relatorio_texto: relatorioTexto,
            id_analise: idAnalise
        });

    } catch (error) {
        console.error('ERRO no processamento da IA/PG:', error);
        res.status(500).json({ message: "Falha ao gerar o relatório ou salvar no banco de dados.", error: error.message });
    } finally {
        client.release(); 
    }
});


// ROTA 2: GET /api/download-pdf/:id (Geração do PDF com Layout CORRIGIDO e LOGO CENTRALIZADA/MAIOR)
app.get('/api/download-pdf/:id', async (req, res) => {
    const id = req.params.id;
    let client;
    try {
        client = await pool.connect();
        
        // 1. Busca o registro no PostgreSQL
        const result = await client.query('SELECT * FROM relatorios WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('Relatório não encontrado ou expirado.');
        }

        const registro = result.rows[0];
        const dados = registro.dados_formulario;
        const relatorioTexto = registro.relatorio_ia;

        // 2. Cria o documento PDF (pdfkit)
        const doc = new pdf({ size: 'A4', margin: 50 });

        const nomeArquivo = `Relatorio_BemEstar_${dados.nome.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Configura o cabeçalho para download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

        doc.pipe(res); 

        // --- LAYOUT DO PDF CORRIGIDO: LOGO CENTRALIZADA E MAIOR, SEM TEXTO REPETIDO ---
        
        // Caminho da Logo (Assumindo que está na RAIZ, conforme seu print)
        const logoPath = path.join(__dirname, 'logo.png'); 
        const logoWidth = 120; // Largura da logo em pixels
        const logoHeight = 120; // Altura da logo em pixels
        const pageCenterX = doc.page.width / 2; // Centro da página

        if (fs.existsSync(logoPath)) { 
            doc.image(logoPath, pageCenterX - (logoWidth / 2), 50, { // Centraliza a logo na largura
                fit: [logoWidth, logoHeight], 
                align: 'center'
            });
            // MOVE O PONTO DE INSERÇÃO DO TEXTO para ABAIXO da logo centralizada
            doc.y = 50 + logoHeight + 20; // 50 (margem superior) + altura da logo + margem extra
        } else {
            // Se a logo não for encontrada, o texto começa no topo
            doc.y = 50; 
            console.warn(`[PDF] Aviso: LOGO NÃO ENCONTRADA. Caminho tentado: ${logoPath}.`);
        }

        // Informações da Análise (abaixo da logo, alinhado à esquerda ou centro)
        doc.fontSize(12).fillColor('black').text(`Análise para: ${dados.nome}`, { align: 'center' });
        doc.fontSize(10).text(`Data da Análise: ${new Date(registro.data_analise).toLocaleDateString()}`, { align: 'center' }).moveDown(1);
        
        doc.lineWidth(1).strokeColor('#ccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1); 
        
        // Processamento do texto da IA
        const linhas = relatorioTexto.split('\n');
        doc.fillColor('black');

        linhas.forEach(line => {
            if (line.startsWith('## ')) {
                // Título de Seção (##)
                doc.moveDown(0.7).fontSize(16).fillColor('#007bff').text(line.substring(3).toUpperCase(), { 
                    underline: true 
                }).fillColor('black').moveDown(0.3);
            } else if (line.startsWith('- ')) {
                // Item de Lista (-)
                doc.fontSize(10).text(line, { indent: 20, listType: 'bullet' });
            } else if (line.trim().length > 0) {
                // Parágrafo normal
                doc.fontSize(10).text(line.trim(), { align: 'justify' }).moveDown(0.2);
            }
        });
        
        // Rodapé
        doc.moveDown(3).fontSize(8).fillColor('#666').text('Relatório Gerado Automaticamente por IA. Clínica do Bem-Estar SENAI. Consulte sempre um profissional de saúde.', { align: 'center' });

        // Finaliza a criação do PDF
        doc.end();

    } catch (error) {
        console.error('ERRO ao buscar relatório no PG/Gerar PDF:', error);
        res.status(500).send('Erro interno ao processar o relatório.');
    } finally {
        if (client) client.release();
    }
});


// --- INICIA O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` Servidor rodando em http://localhost:${PORT}`);
    console.log(` Acesse o Front-end: http://localhost:${PORT}/index.html`);
    console.log(`======================================================\n`);
});