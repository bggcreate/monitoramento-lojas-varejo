document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('live-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
        
        // 1. Busca o conteúdo HTML do formulário.
        const response = await fetch('/content/novo-relatorio');
        if (!response.ok) {
            throw new Error('Falha ao carregar o conteúdo do formulário de novo relatório.');
        }
        
        container.innerHTML = await response.text();

        // 2. Chama a função de inicialização do form-logic.js que agora está disponível.
        // Isso anexa todos os eventos e carrega os dados necessários.
        initNovoRelatorioPage();
        
    } catch (error) {
        console.error("Erro no modo Live:", error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar o modo Live. Verifique o console para mais detalhes.</div>';
    }
});