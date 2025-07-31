window.initDemandasPage = function() {
    const abas = document.querySelectorAll('.nav-link[data-bs-toggle="tab"]');
    const containerPendentes = document.getElementById('demandas-pendentes-container');
    const containerHistorico = document.getElementById('demandas-historico-container');
    const modalDemanda = new bootstrap.Modal(document.getElementById('modal-add-demanda'));
    const formDemanda = document.getElementById('form-add-demanda');
    const selectLojaModal = document.getElementById('demanda-loja');

    async function carregarLojas() {
        try {
            const response = await fetch('/api/lojas');
            const lojas = await response.json();
            selectLojaModal.innerHTML = '<option value="" selected disabled>Selecione uma loja</option>';
            lojas.forEach(loja => { selectLojaModal.add(new Option(loja.nome, loja.nome)); });
        } catch (error) { console.error("Falha ao carregar lojas no modal:", error); }
    }
    
    function formatarData(dataISO) { if (!dataISO) return 'N/A'; return new Date(dataISO).toLocaleString('pt-BR'); }

    function criarCardDemanda(demanda, isPendente = true) {
        const tagCores = { 'Urgente': 'bg-danger', 'Alta': 'bg-warning text-dark', 'Normal': 'bg-info text-dark', 'Baixa': 'bg-secondary' };
        const cor = tagCores[demanda.tag] || 'bg-light text-dark';
        const acoesHtml = isPendente ? `<button class="btn btn-sm btn-success" data-action="concluir" data-id="${demanda.id}"><i class="bi bi-check-lg"></i></button> <button class="btn btn-sm btn-danger" data-action="excluir" data-id="${demanda.id}"><i class="bi bi-trash"></i></button>` : '';
        return `<div class="card demanda-card mb-3"><div class="card-body"><div class="d-flex justify-content-between"><div><h5 class="card-title">${demanda.loja_nome}</h5><p class="card-text">${demanda.descricao}</p></div><div class="text-end"><span class="badge ${cor}">${demanda.tag}</span><div class="acoes-demanda mt-2">${acoesHtml}</div></div></div></div><div class="card-footer text-muted d-flex justify-content-between"><span>Criado por: ${demanda.criado_por_usuario} em ${formatarData(demanda.criado_em)}</span>${!isPendente ? `<span>Concluído por: ${demanda.concluido_por_usuario} em ${formatarData(demanda.concluido_em)}</span>` : ''}</div></div>`;
    }

    async function carregarDemandas(tipo) {
        const url = tipo === 'pendentes' ? '/api/demandas' : '/api/historico/demandas';
        const container = tipo === 'pendentes' ? containerPendentes : containerHistorico;
        container.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro ${response.status}`);
            const demandas = await response.json();
            if (demandas.length === 0) { container.innerHTML = '<p>Nenhuma demanda encontrada.</p>'; } 
            else { container.innerHTML = demandas.map(d => criarCardDemanda(d, tipo === 'pendentes')).join(''); }
        } catch (error) { container.innerHTML = '<p class="text-danger">Erro ao carregar demandas.</p>'; }
    }

    abas.forEach(aba => { aba.addEventListener('shown.bs.tab', (event) => { if (event.target.id === 'pendentes-tab') carregarDemandas('pendentes'); else if (event.target.id === 'historico-tab') carregarDemandas('historico'); }); });

    formDemanda.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const response = await fetch('/api/demandas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (!response.ok) throw new Error('Falha ao adicionar demanda.');
            modalDemanda.hide(); e.target.reset(); carregarDemandas('pendentes');
        } catch (error) { alert(error.message); }
    });

    containerPendentes.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const id = button.dataset.id;
        const action = button.dataset.action;
        if (action === 'concluir') { if (!confirm("Concluir demanda?")) return; try { const res = await fetch(`/api/demandas/${id}`, { method: 'PUT' }); if (!res.ok) throw new Error('Falha.'); carregarDemandas('pendentes'); } catch (err) { alert(err.message); } } 
        else if (action === 'excluir') { if (!confirm("Excluir demanda?")) return; try { const res = await fetch(`/api/demandas/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Falha.'); carregarDemandas('pendentes'); } catch (err) { alert(err.message); } }
    });

    carregarDemandas('pendentes');
    carregarLojas();
};