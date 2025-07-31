document.addEventListener('DOMContentLoaded', () => {
    const pageContent = document.getElementById('page-content');
    let currentUser = null;

    function showToast(title, message, type = 'success') {
        const toastEl = document.getElementById('notificationToast');
        if (!toastEl) return;
        const toastHeader = toastEl.querySelector('.toast-header');
        const toastTitle = document.getElementById('toast-title');
        const toastBody = document.getElementById('toast-body');
        toastTitle.textContent = title;
        toastBody.textContent = message;
        toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-info');
        if (type === 'success') toastHeader.classList.add('bg-success');
        else if (type === 'danger') toastHeader.classList.add('bg-danger');
        else toastHeader.classList.add('bg-info');
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
    
    function showConfirmModal(message) {
        return new Promise((resolve) => {
            const confirmModalEl = document.getElementById('confirmModal');
            if (!confirmModalEl) { resolve(window.confirm(message)); return; }
            const confirmModal = new bootstrap.Modal(confirmModalEl);
            document.getElementById('confirmModalBody').textContent = message;
            const btnYes = document.getElementById('confirm-btn-yes');
            const btnNo = document.getElementById('confirm-btn-no');
            const btnClose = confirmModalEl.querySelector('.btn-close');
            const handleResolve = (value) => {
                btnYes.removeEventListener('click', onYesClick);
                btnNo.removeEventListener('click', onNoClick);
                btnClose.removeEventListener('click', onNoClick);
                confirmModalEl.removeEventListener('hidden.bs.modal', onHidden);
                if(confirmModal._isShown){ confirmModal.hide(); }
                resolve(value);
            };
            const onYesClick = () => handleResolve(true);
            const onNoClick = () => handleResolve(false);
            const onHidden = () => handleResolve(false);
            btnYes.addEventListener('click', onYesClick, { once: true });
            btnNo.addEventListener('click', onNoClick, { once: true });
            btnClose.addEventListener('click', onNoClick, { once: true });
            confirmModalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
            confirmModal.show();
        });
    }

    async function loadPage(path) {
        const defaultPage = 'admin';
        const pageName = (path.startsWith('/') ? path.substring(1) : path).split('?')[0] || defaultPage;
        const activePage = (pageName === '' || pageName === 'index.html') ? defaultPage : pageName;
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
             const linkPage = link.getAttribute('href').substring(1);
             link.closest('.nav-item').classList.toggle('active', linkPage === activePage);
        });
        if (!pageContent) return;
        pageContent.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border" role="status"></div></div>';
        try {
            const response = await fetch(`/content/${activePage}`);
            if (!response.ok) throw new Error(`Página não encontrada.`);
            pageContent.innerHTML = await response.text();
            if (window.pageInitializers && typeof window.pageInitializers[activePage] === 'function') {
                window.pageInitializers[activePage]();
            }
        } catch (error) { pageContent.innerHTML = `<div class="p-3 text-center text-danger"><h3>Oops!</h3><p>Erro ao carregar conteúdo.</p></div>`; }
    }
    
    function navigateTo(path) {
        if(location.pathname + location.search === path) return;
        history.pushState(null, '', path);
        loadPage(path);
    }
    
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('a.nav-link');
        if (navLink && navLink.closest('.sidebar-nav')) {
            e.preventDefault();
            navigateTo(navLink.getAttribute('href'));
        }
    });

    window.addEventListener('popstate', () => loadPage(location.pathname + location.search));

    async function setupSessionAndUI() {
        try {
            const response = await fetch('/api/session-info');
            if (!response.ok) { window.location.href = '/login'; return; }
            currentUser = await response.json();
            const userInfoContainer = document.getElementById('user-info-container');
            if (userInfoContainer) {
                let adminButton = '';
                // Mostra o botão de engrenagem APENAS se o usuário for admin
                if (currentUser.role === 'admin') {
                    adminButton = `<a href="/gerenciar-usuarios" class="btn" title="Configurações de Usuários"><i class="bi bi-gear-fill"></i></a>`;
                }
                userInfoContainer.innerHTML = `<div class="user-info"><span>Olá, <strong>${currentUser.username}</strong></span></div><div class="user-actions"><a href="/live" id="live-mode-btn" class="btn" title="Modo Live"><i class="bi bi-broadcast"></i></a>${adminButton}<a href="/logout" class="btn" title="Sair"><i class="bi bi-box-arrow-right"></i></a></div>`;
            }
            if (currentUser.role === 'admin') {
                document.querySelectorAll('#nav-admin, #nav-gerenciar, #nav-usuarios').forEach(el => el?.classList.remove('d-none'));
            }
            document.getElementById('nav-demandas')?.classList.remove('d-none');
            document.getElementById('live-mode-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(e.currentTarget.href, 'live-window', 'width=550,height=850,scrollbars=yes,resizable=yes');
            });
        } catch (e) { window.location.href = '/login'; }
    }

    window.pageInitializers = {
        admin: function() {
            const formFiltros = document.getElementById('form-filtros-dashboard');
            if (!formFiltros) return;
            const lojaSelect = document.getElementById('filtro-loja-dashboard'), dataInicioInput = document.getElementById('filtro-data-inicio-dashboard'), dataFimInput = document.getElementById('filtro-data-fim-dashboard'), btnLimpar = document.getElementById('btn-limpar-filtros-dashboard'), rankingCorpoTabela = document.getElementById('ranking-corpo-tabela');
            async function carregarLojasNoFiltro() {
                try { const response = await fetch('/api/lojas'), lojas = await response.json(); lojas.forEach(loja => lojaSelect.add(new Option(loja.nome, loja.nome))); } catch (e) { console.error("Erro ao carregar lojas:", e); }
            }
            async function carregarDadosDashboard() {
                const params = new URLSearchParams({ loja: lojaSelect.value || 'todas', data_inicio: dataInicioInput.value, data_fim: dataFimInput.value });
                try {
                    const response = await fetch(`/api/dashboard-data?${params.toString()}`);
                    const data = await response.json();
                    document.getElementById('geral-clientes').textContent = data.total_clientes_monitoramento.toLocaleString('pt-BR');
                    document.getElementById('geral-vendas').textContent = (data.total_vendas_monitoramento + data.total_omni).toLocaleString('pt-BR');
                    document.getElementById('geral-tx-conversao').textContent = `${data.tx_conversao_monitoramento}%`;
                    document.getElementById('loja-clientes').textContent = data.total_clientes_loja.toLocaleString('pt-BR');
                    document.getElementById('loja-vendas').textContent = data.total_vendas_loja.toLocaleString('pt-BR');
                    document.getElementById('loja-tx-conversao').textContent = `${data.tx_conversao_loja}%`;
                } catch (error) { console.error("Erro no dashboard:", error); }
            }
            async function carregarRanking() {
                if(!rankingCorpoTabela) return;
                const params = new URLSearchParams({ data_inicio: dataInicioInput.value, data_fim: dataFimInput.value });
                rankingCorpoTabela.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';
                try {
                    const response = await fetch(`/api/ranking?${params.toString()}`);
                    const data = await response.json();
                    if(data.length === 0){ rankingCorpoTabela.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum dado.</td></tr>'; return; }
                    rankingCorpoTabela.innerHTML = data.map((item, index) => `<tr><td>${index + 1}º</td><td>${item.loja}</td><td>${item.tx_loja}%</td><td>${item.tx_monitoramento}%</td><td>${item.total_vendas_loja}</td><td>${item.total_clientes_loja}</td></tr>`).join('');
                } catch(error) { rankingCorpoTabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro.</td></tr>`; }
            }
            formFiltros.addEventListener('submit', (e) => { e.preventDefault(); carregarDadosDashboard(); carregarRanking(); });
            btnLimpar.addEventListener('click', () => { formFiltros.reset(); carregarDadosDashboard(); carregarRanking(); });
            carregarLojasNoFiltro().then(() => { carregarDadosDashboard(); carregarRanking(); });
        },
        consulta: function() {
            const formFiltros = document.getElementById('form-filtros-consulta'),
                tableBody = document.getElementById('tabela-relatorios-corpo'),
                filtroLoja = document.getElementById('filtro-loja'),
                filtroInicio = document.getElementById('filtro-data-inicio'),
                filtroFim = document.getElementById('filtro-data-fim'),
                btnLimpar = document.getElementById('btn-limpar-filtros'),
                btnCarregarMais = document.getElementById('btn-carregar-mais'),
                modalViewEl = document.getElementById('modal-visualizar-relatorio');

            if (!formFiltros || !modalViewEl) return;
            const modalView = new bootstrap.Modal(modalViewEl);

            let currentOffset = 0;
            const limit = 20;
            let currentReportId = null;
            let totalReportsCount = 0;

            async function carregarRelatorios(isNewSearch = true) {
                if (isNewSearch) {
                    currentOffset = 0;
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
                }
                btnCarregarMais.disabled = true;
                btnCarregarMais.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Carregando...';

                const params = new URLSearchParams();
                if (filtroLoja.value) params.append('loja', filtroLoja.value);
                if (filtroInicio.value) params.append('data_inicio', filtroInicio.value);
                if (filtroFim.value) params.append('data_fim', filtroFim.value);
                params.append('limit', limit);
                params.append('offset', currentOffset);
                
                try {
                    const response = await fetch(`/api/relatorios?${params.toString()}`);
                    const { relatorios, total } = await response.json();
                    
                    if(isNewSearch) {
                        totalReportsCount = total;
                    }
                    
                    const newRowsHtml = relatorios.map((r, index) => {
                        const sequentialId = totalReportsCount - currentOffset - index;
                        return `
                            <tr>
                                <td class="ps-3">${sequentialId}</td>
                                <td>${r.loja}</td>
                                <td>${new Date(r.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                                <td class="text-end pe-3">
                                    <button class="btn btn-sm btn-outline-primary" data-action="visualizar" data-id="${r.id}" title="Visualizar"><i class="bi bi-eye"></i></button> 
                                    <button class="btn btn-sm btn-outline-danger" data-action="excluir" data-id="${r.id}" title="Excluir"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    if (isNewSearch) {
                        tableBody.innerHTML = relatorios.length > 0 ? newRowsHtml : '<tr><td colspan="4" class="text-center">Nenhum relatório encontrado.</td></tr>';
                    } else {
                        tableBody.insertAdjacentHTML('beforeend', newRowsHtml);
                    }
                    
                    currentOffset += relatorios.length;
                    
                    btnCarregarMais.classList.toggle('d-none', relatorios.length < limit || currentOffset >= totalReportsCount);

                } catch (e) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar relatórios.</td></tr>';
                } finally {
                     btnCarregarMais.disabled = false;
                     btnCarregarMais.innerHTML = 'Carregar Mais Relatórios';
                }
            }
            
            async function visualizarRelatorio(id) {
                 currentReportId = id; 
                const modalBody = document.getElementById('modal-body-content');
                const modalLabel = document.getElementById('modal-visualizar-label');
                modalLabel.textContent = `Carregando Relatório...`;
                modalBody.innerHTML = '<div class="d-flex justify-content-center p-5"><div class="spinner-border" role="status"></div></div>';
                modalView.show();

                try {
                    const response = await fetch(`/api/relatorios/${id}/pdf`);
                    if(!response.ok) throw new Error("Não foi possível gerar a visualização do PDF.");
                    const fileBlob = await response.blob();
                    const fileURL = URL.createObjectURL(fileBlob);
                    
                    modalLabel.textContent = `Visualizar Relatório`;
                    modalBody.innerHTML = `<iframe src="${fileURL}" style="width: 100%; height: 70vh; border: none;"></iframe>`;
                } catch (e) { 
                    modalBody.innerHTML = `<div class="p-3 text-center text-danger"><h3>Oops!</h3><p>Não foi possível carregar a visualização.</p></div>`;
                    showToast('Erro', e.message, 'danger'); 
                }
            }

            async function excluirRelatorio(id) {
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir o relatório #${id}?`);
                if (!confirmed) return;
                try { 
                    const response = await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Falha ao excluir.');
                    showToast('Sucesso', 'Relatório excluído com sucesso.', 'success');
                    carregarRelatorios(true);
                } catch (e) { 
                    showToast('Erro', 'Não foi possível excluir.', 'danger'); 
                }
            }
            
            async function carregarLojasNoFiltro() {
                try {
                    const response = await fetch('/api/lojas'), lojas = await response.json();
                    filtroLoja.innerHTML = '<option value="">Todas as Lojas</option>';
                    lojas.forEach(loja => filtroLoja.add(new Option(loja.nome, loja.nome)));
                } catch (e) { console.error("Erro ao carregar lojas:", e); }
            }
            
            document.getElementById('btn-copiar-texto-modal')?.addEventListener('click', async () => {
                if(!currentReportId) return;
                try {
                    const response = await fetch(`/api/relatorios/${currentReportId}/txt`);
                    if(!response.ok) throw new Error("Falha ao buscar texto para cópia.");
                    const textToCopy = await response.text();
                    await navigator.clipboard.writeText(textToCopy);
                    showToast('Sucesso!', 'Texto copiado para a área de transferência.', 'success');
                } catch (err) {
                    showToast('Erro', 'Não foi possível copiar o texto.', 'danger');
                }
            });
            document.getElementById('btn-gerar-pdf-modal')?.addEventListener('click', () => {
                if(!currentReportId) return;
                window.open(`/api/relatorios/${currentReportId}/pdf`, '_blank');
            });
            
            formFiltros.addEventListener('submit', (e) => { e.preventDefault(); carregarRelatorios(true); });
            btnLimpar.addEventListener('click', () => { formFiltros.reset(); carregarRelatorios(true); });
            btnCarregarMais.addEventListener('click', () => carregarRelatorios(false));
            
            pageContent.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button || !button.closest('#tabela-relatorios-corpo')) return;

                const id = button.dataset.id;
                const action = button.dataset.action;

                if (action === 'visualizar') visualizarRelatorio(id);
                if (action === 'excluir') excluirRelatorio(id);
            });
            
            const formExport = document.getElementById('form-export-excel'), exportMonthSelect = document.getElementById('export-month'), exportYearSelect = document.getElementById('export-year');
            const currentYear = new Date().getFullYear();
            for (let i = 0; i < 5; i++) { const year = currentYear - i; exportYearSelect.add(new Option(year, year)); }
            exportMonthSelect.value = new Date().getMonth() + 1;
            formExport.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button'), originalText = btn.innerHTML;
                btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Gerando...`;
                const month = exportMonthSelect.value, year = exportYearSelect.value;
                const response = await fetch(`/api/export/excel?month=${month}&year=${year}`);
                if (response.ok) {
                    const blob = await response.blob(), url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none'; a.href = url;
                    const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' });
                    a.download = `Relatorios_${monthName}_${year}.xlsx`;
                    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
                } else {
                    try { const result = await response.json(); showToast("Erro ao Exportar", result.error || "Não foi possível gerar.", "danger"); } catch { showToast("Erro ao Exportar", "Verifique se há dados.", "danger"); }
                }
                btn.disabled = false; btn.innerHTML = originalText;
            });
            carregarLojasNoFiltro().then(() => carregarRelatorios(true));
        },
        'gerenciar-lojas': async function() {
            const tableBody = document.getElementById('tabela-lojas-corpo'), btnAdicionar = document.getElementById('btn-adicionar-loja'), modalEl = document.getElementById('modal-loja');
            if (!tableBody || !btnAdicionar || !modalEl) return;
            const modal = new bootstrap.Modal(modalEl), modalForm = document.getElementById('form-loja'), modalTitle = document.getElementById('modalLojaLabel');
            let lojasCache = [];
            async function carregarLojas() {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';
                try {
                    const response = await fetch('/api/lojas');
                    lojasCache = await response.json();
                    if (lojasCache.length === 0) { tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma loja cadastrada.</td></tr>'; return; }
                    tableBody.innerHTML = lojasCache.map(loja => {
                        const statusBadge = loja.status === 'ativa' ? `<span class="badge bg-success">Ativa</span>` : `<span class="badge bg-secondary">Inativa</span>`;
                        return `<tr><td>${loja.nome}</td><td>${statusBadge}</td><td>${loja.funcao_especial || '-'}</td><td>${loja.observacoes || '-'}</td><td class="text-end pe-3"><button class="btn btn-sm btn-outline-secondary" data-action="editar" data-id="${loja.id}" title="Editar"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" data-action="excluir" data-id="${loja.id}" title="Excluir"><i class="bi bi-trash"></i></button></td></tr>`;
                    }).join('');
                } catch(e) { tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar lojas.</td></tr>'; }
            }
            function abrirModalParaAdicionar() { modalForm.reset(); modalTitle.textContent = 'Adicionar Nova Loja'; document.getElementById('loja-id').value = ''; modal.show(); }
            function abrirModalParaEditar(id) {
                const loja = lojasCache.find(l => l.id === id);
                if (!loja) return;
                modalForm.reset(); modalTitle.textContent = 'Editar Loja';
                document.getElementById('loja-id').value = loja.id;
                document.getElementById('loja-nome').value = loja.nome;
                document.getElementById('loja-status').value = loja.status;
                document.getElementById('loja-funcao-especial').value = loja.funcao_especial || '';
                document.getElementById('loja-observacoes').value = loja.observacoes || '';
                modal.show();
            }
            async function excluirLoja(id) {
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir a loja #${id}?`);
                if (!confirmed) return;
                try { 
                    const response = await fetch(`/api/lojas/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Falha ao excluir.');
                    showToast('Sucesso', 'Loja excluída com sucesso.', 'success');
                    carregarLojas();
                } catch (e) { showToast('Erro', 'Não foi possível excluir a loja.', 'danger'); }
            }
            modalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('loja-id').value;
                const data = { nome: document.getElementById('loja-nome').value, status: document.getElementById('loja-status').value, funcao_especial: document.getElementById('loja-funcao-especial').value, observacoes: document.getElementById('loja-observacoes').value };
                const method = id ? 'PUT' : 'POST', url = id ? `/api/lojas/${id}` : '/api/lojas';
                try {
                    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                    if (!response.ok) throw new Error('Falha ao salvar a loja.');
                    showToast('Sucesso', `Loja ${id ? 'atualizada' : 'adicionada'} com sucesso.`, 'success');
                    modal.hide();
                    carregarLojas();
                } catch(e) { showToast('Erro', 'Não foi possível salvar a loja.', 'danger'); }
            });
            btnAdicionar.addEventListener('click', abrirModalParaAdicionar);
            tableBody.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;
                const id = parseInt(button.dataset.id, 10), action = button.dataset.action;
                if (action === 'editar') abrirModalParaEditar(id);
                if (action === 'excluir') excluirLoja(id);
            });
            carregarLojas();
        },
        'novo-relatorio': function() {
            if (typeof initNovoRelatorioPage === 'function') {
                initNovoRelatorioPage();
            } else {
                console.error("Erro: a função initNovoRelatorioPage() não foi encontrada.");
            }
        },
        demandas: function() {
            const containerPendentes = document.getElementById('demandas-pendentes-container'), containerHistorico = document.getElementById('demandas-historico-container'), abas = document.querySelectorAll('#demandasTab .nav-link'), modalDemandaEl = document.getElementById('modal-add-demanda');
            if (!modalDemandaEl) return;
            const modalDemanda = new bootstrap.Modal(modalDemandaEl), formDemanda = document.getElementById('form-add-demanda'), selectLojaModal = document.getElementById('demanda-loja');
            async function carregarLojasNoModal() {
                try {
                    const response = await fetch('/api/lojas'), lojas = await response.json();
                    selectLojaModal.innerHTML = '<option value="" selected disabled>Selecione uma loja</option>';
                    lojas.forEach(loja => selectLojaModal.add(new Option(loja.nome, loja.nome)));
                } catch (error) { console.error("Falha ao carregar lojas no modal:", error); }
            }
            async function carregarDemandas(tipo) {
                const container = tipo === 'pendentes' ? containerPendentes : containerHistorico, url = `/api/demandas/${tipo}`;
                if (!container) return;
                container.innerHTML = '<p class="text-center">Carregando...</p>';
                try {
                    const response = await fetch(url), demandas = await response.json();
                    if (demandas.length === 0) { container.innerHTML = '<p class="text-center text-muted">Nenhuma demanda encontrada.</p>'; return; }
                    container.innerHTML = demandas.map(d => {
                        const tagCores = { 'Urgente': 'bg-danger', 'Alta': 'bg-warning text-dark', 'Normal': 'bg-info text-dark', 'Baixa': 'bg-secondary' };
                        let acoesHtml = '';
                        if (tipo === 'pendentes') { acoesHtml = `<div class="d-flex justify-content-end mt-2"><button class="btn btn-sm btn-success me-2" data-action="concluir" data-id="${d.id}" title="Concluir"><i class="bi bi-check-lg"></i></button><button class="btn btn-sm btn-danger" data-action="excluir" data-id="${d.id}" title="Excluir"><i class="bi bi-trash"></i></button></div>`;
                        } else if (tipo === 'concluidas') { acoesHtml = `<div class="d-flex justify-content-end mt-2"><button class="btn btn-sm btn-danger" data-action="excluir" data-id="${d.id}" title="Excluir do Histórico"><i class="bi bi-trash"></i></button></div>`; }
                        const footerHtml = tipo === 'pendentes' ? `Criado por ${d.criado_por_usuario} em ${new Date(d.criado_em).toLocaleDateString('pt-BR')}` : `Concluído por ${d.concluido_por_usuario || 'N/A'} em ${new Date(d.concluido_em).toLocaleDateString('pt-BR')}`;
                        return `<div class="card mb-3"><div class="card-body"><div class="d-flex justify-content-between align-items-start"><div><h5 class="card-title mb-1">${d.loja_nome}</h5><p class="card-text mb-0">${d.descricao}</p></div><span class="badge ${tagCores[d.tag] || 'bg-light text-dark'}">${d.tag}</span></div>${acoesHtml}</div><div class="card-footer text-muted small">${footerHtml}</div></div>`;
                    }).join('');
                } catch(e) { container.innerHTML = '<p class="text-center text-danger">Erro ao carregar demandas.</p>'; }
            }
            formDemanda.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.target).entries());
                if (!data.loja_nome) { showToast('Atenção', 'Selecione uma loja.', 'danger'); return; }
                try {
                    const response = await fetch('/api/demandas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                    if (!response.ok) throw new Error('Falha ao adicionar demanda.');
                    modalDemanda.hide(); e.target.reset();
                    showToast('Sucesso', 'Demanda adicionada com sucesso.', 'success');
                    carregarDemandas('pendentes');
                } catch (error) { showToast('Erro', error.message, 'danger'); }
            });
            abas.forEach(aba => {
                aba.addEventListener('shown.bs.tab', (event) => {
                    const targetId = event.target.getAttribute('data-bs-target');
                    if (targetId === '#pendentes') carregarDemandas('pendentes');
                    else if (targetId === '#historico') carregarDemandas('concluidas');
                });
            });
            pageContent.addEventListener('click', async (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button || !button.closest('#demandas-pendentes-container, #demandas-historico-container')) return;
                const id = button.dataset.id, action = button.dataset.action;
                const isPendente = !!button.closest('#demandas-pendentes-container');
                if (action === 'concluir') {
                    const confirmed = await showConfirmModal('Tem certeza que deseja concluir esta demanda?');
                    if (!confirmed) return;
                    try {
                        const response = await fetch(`/api/demandas/${id}/concluir`, { method: 'PUT' });
                        if (!response.ok) throw new Error('Falha ao concluir demanda.');
                        showToast('Sucesso', 'Demanda movida para o histórico.', 'info');
                        carregarDemandas('pendentes');
                    } catch (e) { showToast('Erro', 'Não foi possível concluir a demanda.', 'danger'); }
                }
                if (action === 'excluir') {
                    const confirmed = await showConfirmModal('Tem certeza que deseja EXCLUIR esta demanda?');
                    if (!confirmed) return;
                     try {
                        const response = await fetch(`/api/demandas/${id}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('Falha ao excluir demanda.');
                        showToast('Sucesso', 'Demanda excluída com sucesso.', 'success');
                        if (isPendente) carregarDemandas('pendentes');
                        else carregarDemandas('concluidas');
                    } catch (e) { showToast('Erro', 'Não foi possível excluir a demanda.', 'danger'); }
                }
            });
            carregarLojasNoModal();
            carregarDemandas('pendentes');
        },
        'gerenciar-usuarios': async function() {
            const tableBody = document.getElementById('tabela-usuarios-corpo'),
                  btnAdicionar = document.getElementById('btn-adicionar-usuario'),
                  modalEl = document.getElementById('modal-usuario');
            if (!tableBody || !btnAdicionar || !modalEl) return;
            
            const modal = new bootstrap.Modal(modalEl),
                  modalForm = document.getElementById('form-usuario'),
                  modalTitle = document.getElementById('modalUsuarioLabel');
            let usuariosCache = [];

            async function carregarUsuarios() {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
                try {
                    const response = await fetch('/api/usuarios');
                    if (!response.ok) throw new Error('Falha ao carregar usuários.');
                    usuariosCache = await response.json();
                    
                    if (usuariosCache.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário cadastrado.</td></tr>';
                        return;
                    }

                    tableBody.innerHTML = usuariosCache.map(user => {
                        const isCurrentUser = user.id === currentUser.id;
                        const deleteButton = isCurrentUser ? 
                            `<button class="btn btn-sm btn-outline-secondary" disabled title="Não pode excluir a si mesmo"><i class="bi bi-trash"></i></button>` :
                            `<button class="btn btn-sm btn-outline-danger" data-action="excluir" data-id="${user.id}" title="Excluir"><i class="bi bi-trash"></i></button>`;
                        
                        return `<tr>
                                    <td class="ps-3">${user.id}</td>
                                    <td>${user.username}</td>
                                    <td><span class="badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">${user.role}</span></td>
                                    <td class="text-end pe-3">
                                        <button class="btn btn-sm btn-outline-secondary" data-action="editar" data-id="${user.id}" title="Editar"><i class="bi bi-pencil"></i></button> 
                                        ${deleteButton}
                                    </td>
                                </tr>`;
                    }).join('');
                } catch(e) {
                    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar usuários.</td></tr>`;
                }
            }

            function abrirModalParaAdicionar() {
                modalForm.reset();
                modalTitle.textContent = 'Adicionar Novo Usuário';
                document.getElementById('usuario-id').value = '';
                document.getElementById('usuario-password').required = true;
                modal.show();
            }

            function abrirModalParaEditar(id) {
                const user = usuariosCache.find(u => u.id === id);
                if (!user) return;
                
                modalForm.reset();
                modalTitle.textContent = 'Editar Usuário';
                document.getElementById('usuario-id').value = user.id;
                document.getElementById('usuario-username').value = user.username;
                document.getElementById('usuario-role').value = user.role;
                document.getElementById('usuario-password').required = false; // Senha não é obrigatória na edição
                modal.show();
            }

            async function excluirUsuario(id) {
                const confirmed = await showConfirmModal(`Tem certeza que deseja excluir o usuário #${id}?`);
                if (!confirmed) return;
                try { 
                    const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    showToast('Sucesso', 'Usuário excluído com sucesso.', 'success');
                    carregarUsuarios();
                } catch (e) {
                    showToast('Erro', e.message || 'Não foi possível excluir o usuário.', 'danger');
                }
            }
            
            modalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('usuario-id').value;
                const data = {
                    username: document.getElementById('usuario-username').value,
                    password: document.getElementById('usuario-password').value,
                    role: document.getElementById('usuario-role').value
                };

                if (!data.password) {
                    delete data.password;
                }

                const method = id ? 'PUT' : 'POST';
                const url = id ? `/api/usuarios/${id}` : '/api/usuarios';
                
                try {
                    const response = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    
                    showToast('Sucesso', `Usuário ${id ? 'atualizado' : 'adicionado'} com sucesso.`, 'success');
                    modal.hide();
                    carregarUsuarios();
                } catch(e) {
                    showToast('Erro', e.message || 'Não foi possível salvar o usuário.', 'danger');
                }
            });

            btnAdicionar.addEventListener('click', abrirModalParaAdicionar);
            
            tableBody.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;
                const id = parseInt(button.dataset.id, 10);
                const action = button.dataset.action;
                
                if (action === 'editar') abrirModalParaEditar(id);
                if (action === 'excluir') excluirUsuario(id);
            });
            
            carregarUsuarios();
        }
    };
    
    async function main() {
        await setupSessionAndUI();
        loadPage(location.pathname + location.search);
    }
    main();
});