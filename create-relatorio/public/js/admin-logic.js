window.initAdminPage = function() {
    const formFiltros = document.getElementById('form-filtros-dashboard');
    if (!formFiltros) return;

    const lojaSelect = document.getElementById('filtro-loja-dashboard');
    const dataInicioInput = document.getElementById('filtro-data-inicio-dashboard');
    const dataFimInput = document.getElementById('filtro-data-fim-dashboard');
    const btnLimpar = document.getElementById('btn-limpar-filtros-dashboard');
    const rankingCorpoTabela = document.getElementById('ranking-corpo-tabela');

    function rodarAnaliseCompleta() { carregarDadosDashboard(); carregarRanking(); }
    
    async function carregarDadosDashboard() {
        const params = new URLSearchParams({ loja: lojaSelect.value || 'todas' });
        if (dataInicioInput.value) params.append('data_inicio', dataInicioInput.value);
        if (dataFimInput.value) params.append('data_fim', dataFimInput.value);
        try {
            const response = await fetch(`/api/dashboard-data?${params.toString()}`);
            const data = await response.json();
            document.getElementById('geral-clientes').textContent = data.total_clientes_monitoramento.toLocaleString('pt-BR');
            document.getElementById('geral-vendas').textContent = data.total_vendas_monitoramento.toLocaleString('pt-BR');
            document.getElementById('geral-tx-conversao').textContent = `${data.tx_conversao_monitoramento.toFixed(2)}%`;
            document.getElementById('loja-clientes').textContent = data.total_clientes_loja.toLocaleString('pt-BR');
            document.getElementById('loja-vendas').textContent = data.total_vendas_loja.toLocaleString('pt-BR');
            document.getElementById('loja-tx-conversao').textContent = `${data.tx_conversao_loja.toFixed(2)}%`;
        } catch (error) { console.error("Erro dashboard:", error); }
    }

    async function carregarRanking() {
        if (!rankingCorpoTabela) return;
        rankingCorpoTabela.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
        const params = new URLSearchParams();
        if (dataInicioInput.value) params.append('data_inicio', dataInicioInput.value);
        if (dataFimInput.value) params.append('data_fim', dataFimInput.value);
        try {
            const response = await fetch(`/api/ranking?${params.toString()}`);
            const data = await response.json();
            data.sort((a, b) => b.tx_loja - a.tx_loja);
            rankingCorpoTabela.innerHTML = '';
            if (data.length === 0) { rankingCorpoTabela.innerHTML = '<tr><td colspan="6">Nenhum dado.</td></tr>'; return; }
            data.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td>${item.loja}</td><td>${item.tx_loja.toFixed(2)}%</td><td>${item.tx_monitoramento.toFixed(2)}%</td><td>${item.total_vendas_loja}</td><td>${item.total_clientes_loja}</td>`;
                rankingCorpoTabela.appendChild(tr);
            });
        } catch(error) { console.error("Erro ranking:", error); rankingCorpoTabela.innerHTML = `<tr><td colspan="6">Erro ao carregar.</td></tr>`; }
    }
    
    async function carregarLojasNoFiltro() {
        try {
            const response = await fetch('/api/lojas'); 
            const lojas = await response.json();
            lojas.forEach(loja => lojaSelect.add(new Option(loja.nome, loja.nome)));
        } catch (e) { console.error("Erro lojas dashboard:", e); }
    }

    formFiltros.addEventListener('submit', (e) => { e.preventDefault(); rodarAnaliseCompleta(); });
    btnLimpar.addEventListener('click', () => { formFiltros.reset(); rodarAnaliseCompleta(); });
    
    carregarLojasNoFiltro().then(() => { rodarAnaliseCompleta(); });
};