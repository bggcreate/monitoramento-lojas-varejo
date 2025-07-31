function showToast(title, message, type = 'success') {
    
}

window.initConsultaPage = function() {
    const tbody = document.getElementById('tabela-relatorios-corpo');
    const btnCarregarMais = document.getElementById('btn-carregar-mais');
    const formFiltros = document.getElementById('form-filtros-consulta');
    const filtroLojaSelect = document.getElementById('filtro-loja');

    let offset = 0;
    const limit = 20;
    let rowNumber = 1;
    let modalVisualizar = null;
    let currentReportIdForModal = null;

    const modalVisualizarElement = document.getElementById('modal-visualizar-relatorio');
    if (modalVisualizarElement) {
        modalVisualizar = new bootstrap.Modal(modalVisualizarElement);
    }

    // Preenche o campo de lojas no filtro
    async function carregarLojas() {
        if (!filtroLojaSelect) return;

        try {
            const response = await fetch('/api/lojas');
            if (!response.ok) throw new Error('Falha ao buscar lojas.');

            const lojas = await response.json();

            filtroLojaSelect.innerHTML = '<option value="">Todas as Lojas</option>';

            lojas.forEach(loja => {
                const option = new Option(loja.nome, loja.nome);
                filtroLojaSelect.add(option);
            });
        } catch (error) {
            console.error(error);
            filtroLojaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async function carregarRelatorios(isLoadMore = false) {
        
    }

    async function visualizarRelatorio(id) {
        
    }

    async function excluirRelatorio(id) {
       
    }

    // Quando o formulário for enviado, recarrega os relatórios
    formFiltros?.addEventListener('submit', (e) => {
        e.preventDefault();
        carregarRelatorios(false);
    });

    // Carrega mais resultados ao clicar no botão
    btnCarregarMais?.addEventListener('click', () => carregarRelatorios(true));

    // Trata ações nos botões da tabela (como visualizar/excluir)
    tbody?.addEventListener('click', (e) => {
       
    });

    // Botão para copiar o conteúdo do relatório
    const btnCopiarTexto = document.getElementById('btn-copiar-relatorio');
    btnCopiarTexto?.addEventListener('click', () => {
        
    });

    // Inicia a página carregando as lojas e os relatórios
    async function init() {
        await carregarLojas();
        carregarRelatorios();
    }

    init();
};
