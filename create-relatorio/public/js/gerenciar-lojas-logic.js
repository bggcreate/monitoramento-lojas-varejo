window.initGerenciarLojasPage = function() {
    const tabelaCorpo = document.getElementById('tabela-lojas-corpo');
    if (!tabelaCorpo) return;

    // --- Seletores ---
    const modalElement = document.getElementById('modal-loja');
    const modal = new bootstrap.Modal(modalElement);
    const modalForm = document.getElementById('form-loja');
    const modalTitle = document.getElementById('modalLojaLabel');
    const btnAdicionar = document.getElementById('btn-adicionar-loja');
    
    let lojasCache = []; // Cache para evitar buscar dados para edição

    // --- Funções ---

    const carregarLojas = async () => {
        try {
            const response = await fetch('/api/lojas/todas');
            lojasCache = await response.json();
            
            tabelaCorpo.innerHTML = '';
            lojasCache.forEach(loja => {
                const statusBadge = loja.status === 'ativa' ? `<span class="badge bg-success">Ativa</span>` : `<span class="badge bg-secondary">Inativa</span>`;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${loja.nome}</td>
                    <td>${statusBadge}</td>
                    <td>${loja.funcao_especial || '-'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary" data-action="editar" data-id="${loja.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" data-action="excluir" data-id="${loja.id}">Excluir</button>
                    </td>
                `;
                tabelaCorpo.appendChild(row);
            });
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
            tabelaCorpo.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Falha ao carregar lojas.</td></tr>`;
        }
    };

    const abrirModalParaEditar = (id) => {
        const loja = lojasCache.find(l => l.id === id);
        if (!loja) return;
        modalTitle.textContent = 'Editar Loja';
        document.getElementById('loja-id').value = loja.id;
        document.getElementById('loja-nome').value = loja.nome;
        document.getElementById('loja-status').value = loja.status;
        document.getElementById('loja-funcao-especial').value = loja.funcao_especial || '';
        document.getElementById('loja-observacoes').value = loja.observacoes || '';
        modal.show();
    };

    const abrirModalParaAdicionar = () => {
        modalTitle.textContent = 'Adicionar Nova Loja';
        modalForm.reset();
        document.getElementById('loja-id').value = '';
        modal.show();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('loja-id').value;
        const dados = { // Objeto de dados sem os campos de meta
            nome: document.getElementById('loja-nome').value,
            status: document.getElementById('loja-status').value,
            funcao_especial: document.getElementById('loja-funcao-especial').value,
            observacoes: document.getElementById('loja-observacoes').value,
        };
        const isEditing = !!id;
        const url = isEditing ? `/api/lojas/${id}` : '/api/lojas';
        const method = isEditing ? 'PUT' : 'POST';
        
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            if (!response.ok) throw new Error('Falha ao salvar a loja.');
            modal.hide();
            await carregarLojas();
        } catch (error) {
            console.error(error);
            alert('Não foi possível salvar a loja.');
        }
    };
    
    const handleTableClick = async (e) => {
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        
        const id = parseInt(target.dataset.id, 10);
        const action = target.dataset.action;

        if (action === 'editar') {
            abrirModalParaEditar(id);
        } else if (action === 'excluir') {
            try {
                await showConfirmModal('Deseja realmente excluir esta loja?');
                const response = await fetch(`/api/lojas/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Falha na exclusão.');
                await carregarLojas();
            } catch(error) {
                // Apenas loga no console se for um erro de API, não faz nada se for cancelamento.
                if (error instanceof Error) console.error("Erro na API:", error);
            }
        }
    };

    // --- Event Listeners e Inicialização ---
    btnAdicionar.addEventListener('click', abrirModalParaAdicionar);
    modalForm.addEventListener('submit', handleFormSubmit);
    tabelaCorpo.addEventListener('click', handleTableClick);

    carregarLojas();
};