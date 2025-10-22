document.getElementById('bemEstarForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btnGerar = document.getElementById('btnGerar');
    const resultadoDiv = document.getElementById('resultado');
    
    // 1. Coleta e Preparação dos Dados
    const formData = new FormData(this);
    const dados = {};
    formData.forEach((value, key) => dados[key] = value);

    // 2. Feedback visual (Loading style)
    const loadingHTML = `
        <div class="status-box status-loading">
            <div class="spinner-border text-white" role="status">
                <span class="visually-hidden">Aguardando...</span>
            </div>
            <p class="mt-2 mb-0">Gerando relatório ..% (Aguarde 10-20s)</p>
        </div>
    `;
    resultadoDiv.innerHTML = loadingHTML;
    resultadoDiv.style.display = 'block';
    btnGerar.disabled = true;

    try {
        // 3. Envio para o Back-end
        const response = await fetch('/api/analisar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const data = await response.json();

        if (response.ok) {
            
            // 4. Exibição do Resultado (Download Style)
            const downloadHTML = `
                <div class="status-box status-download">
                    <p class="mb-2 h5">Relatório gerado</p>
                    <p class="mb-3">↓</p>
                    <button id="btnDownload" class="btn btn-lg w-100 btn-download" style="background-color: #007bff; color: white; border-color: #007bff;">
                        Baixar Pdf
                    </button>
                </div>
                <div id="relatorioTexto" class="mt-4 p-3 border rounded" style="font-size: 0.9em; max-height: 300px; overflow-y: auto;">
                    ${formatarRelatorio(data.relatorio_texto)}
                </div>
            `;
            resultadoDiv.innerHTML = downloadHTML;

            // 5. Configura o botão de download
            document.getElementById('btnDownload').onclick = function() {
                window.open(`/api/download-pdf/${data.id_analise}`, '_blank');
            };

        } else {
            // Caso de erro
            resultadoDiv.innerHTML = `
                <div class="status-box status-loading bg-danger">
                    <p class="mb-0">Erro na análise: ${data.message || 'Erro desconhecido'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        resultadoDiv.innerHTML = `
            <div class="status-box status-loading bg-danger">
                <p class="mb-0">Erro de conexão com o servidor. Verifique se o Node.js está rodando.</p>
            </div>
        `;
    } finally {
        // 6. Restaura o botão e o estado do formulário (opcional: reabilita o botão para nova tentativa)
        btnGerar.disabled = false;
        btnGerar.textContent = 'Gerar meu Relatório';
    }
});

// Função simples para formatar o texto da IA (MANTIDA)
function formatarRelatorio(texto) {
    let html = texto.replace(/^## (.*$)/gim, '<h4 class="mt-3 mb-2 text-primary">$1</h4>');
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul class="list-unstyled">$1</ul>'); 
    html = html.replace(/\n\n/g, '</p><p>');
    return `<div class="relatorio-formatado"><p>${html}</p></div>`;
}