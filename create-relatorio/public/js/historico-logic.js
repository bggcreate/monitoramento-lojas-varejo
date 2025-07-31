
window.initHistoricoPage = function() {
    const relatoriosBody = document.getElementById('historico-relatorios-body');
    const demandasBody = document.getElementById('historico-demandas-body');

    const formatarDataHora = (isoString) => {
        if (!isoString) return 'N/A';
        const data = new Date(isoString);
        return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    async function carregarHistoricoRelatorios() {
        if(!relatoriosBody) return;
        relatoriosBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
        try {
            const response = await fetch('/api/historico/relatorios');
            const data = await response.json();
            relatoriosBody.innerHTML = '';
            if (data.length === 0) {
                relatoriosBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum relatório enviado recentemente.</td></tr>';
                return;
            }
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatarDataHora(item.enviado_em)}</td>
                    <td>${item.enviado_por_usuario}</td>
                    <td>${item.loja}</td>
                    <td>${new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                `;
                relatoriosBody.appendChild(tr);
            });
        } catch (error) { relatoriosBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar histórico.</td></tr>'; }
    }

    async function carregarHistoricoDemandas() {
        if(!demandasBody) return;
        demandasBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
        try {
            const response = await fetch('/api/historico/demandas');
            const data = await response.json();
            demandasBody.innerHTML = '';
            if (data.length === 0) {
                demandasBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma demanda concluída recentemente.</td></tr>';
                return;
            }
            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatarDataHora(item.concluido_em)}</td>
                    <td>${item.concluido_por_usuario}</td>
                    <td>${item.loja_nome}</td>
                    <td>${item.descricao.substring(0, 50)}${item.descricao.length > 50 ? '...' : ''}</td>
                `;
                demandasBody.appendChild(tr);
            });
        } catch (error) { demandasBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar histórico.</td></tr>'; }
    }

    // Carrega os dois históricos em paralelo
    carregarHistoricoRelatorios();
    carregarHistoricoDemandas();
};