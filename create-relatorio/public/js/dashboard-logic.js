document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('reports-table-body');
    const detailsPanel = document.getElementById('report-details-panel');
    const noReportSelectedPanel = document.getElementById('no-report-selected');
    const newReportForm = document.getElementById('new-report-form');
    const newReportModal = new bootstrap.Modal(document.getElementById('newReportModal'));
    const lojaSelect = document.getElementById('loja');

    let reportsCache = [];

    // Carrega detalhes de um relatório específico
    async function loadReportDetails(reportId) {
        const report = reportsCache.find(r => r.id == reportId);
        if (!report) return;

        // Ativa a linha na tabela
        document.querySelectorAll('#reports-table-body tr').forEach(tr => tr.classList.remove('active'));
        document.querySelector(`tr[data-report-id="${reportId}"]`).classList.add('active');

        // Busca detalhes completos da API
        const response = await fetch(`/api/reports/details/${report.id}`);
        const details = await response.json();

        // Preenche o painel de detalhes
        document.getElementById('details-loja').textContent = details.loja;
        document.getElementById('details-data').textContent = `Relatório de ${new Date(details.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
        document.getElementById('details-vendas').textContent = (details.total_vendas || 0).toLocaleString('pt-BR');
        document.getElementById('details-clientes').textContent = (details.clientes_loja || 0).toLocaleString('pt-BR');
        document.getElementById('details-conversao').textContent = `${(details.tx_conversao || 0).toFixed(2)}%`;
        document.getElementById('download-txt-link').href = `/relatorios_gerados/${details.nome_arquivo}`;
        
        detailsPanel.style.visibility = 'visible';
        noReportSelectedPanel.style.display = 'none';
    }

    // Carrega a lista inicial de relatórios
    async function loadReportsList() {
        try {
            const response = await fetch('/api/reports/list');
            reportsCache = await response.json();

            if (reportsCache.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="2" class="text-center p-5 text-secondary">Nenhum relatório encontrado.</td></tr>';
                noReportSelectedPanel.style.display = 'flex';
                detailsPanel.style.visibility = 'hidden';
                return;
            }

            tableBody.innerHTML = '';
            reportsCache.forEach(report => {
                const tr = document.createElement('tr');
                tr.dataset.reportId = report.id;
                tr.innerHTML = `<td>${report.loja}</td><td class="text-end text-secondary">${new Date(report.data).toLocaleDateString('pt-BR', {timeZone:'UTC'})}</td>`;
                tr.addEventListener('click', () => loadReportDetails(report.id));
                tableBody.appendChild(tr);
            });

            // Carrega o primeiro relatório por padrão
            loadReportDetails(reportsCache[0].id);

        } catch (error) {
            console.error("Falha ao carregar lista de relatórios:", error);
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center p-5 text-danger">Falha ao carregar dados.</td></tr>';
        }
    }

    // Carrega lojas para o modal
    async function loadLojasForModal() {
        try {
            const response = await fetch('/api/lojas');
            const lojas = await response.json();
            lojaSelect.innerHTML = '<option value="" disabled selected>Selecione uma loja</option>';
            lojas.forEach(loja => {
                lojaSelect.innerHTML += `<option value="${loja.nome}">${loja.nome}</option>`;
            });
        } catch (error) {
            lojaSelect.innerHTML = '<option value="">Falha ao carregar lojas</option>';
        }
    }

    // Manipula o envio do formulário de novo relatório
    newReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(newReportForm);
        const data = Object.fromEntries(formData.entries());

        const response = await fetch('/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            newReportModal.hide();
            newReportForm.reset();
            loadReportsList(); // Atualiza a lista com o novo relatório
        } else {
            alert(result.message || 'Ocorreu um erro.');
        }
    });

    // Inicialização
    loadReportsList();
    loadLojasForModal();
    // Ajusta a data no modal para o dia de hoje
    document.getElementById('data').value = new Date().toISOString().slice(0, 10);
});