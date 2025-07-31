window.initNovoRelatorioPage = function() {
    const containerPage = document.querySelector('div[style*="max-width: 1200px;"]');
    if (!containerPage || !document.getElementById('btn-salvar-tudo')) return;

    // --- Seletores ---
    const lojaSelect = document.getElementById("loja"),
        dataInput = document.getElementById("data"),
        btnAddVendedor = document.getElementById("btn-add-vendedor"),
        containerVendedores = document.getElementById("container-vendedores"),
        placeholderVendedores = document.getElementById("vendedores-placeholder"),
        btnSalvarTudo = document.getElementById("btn-salvar-tudo"),
        containerFuncaoEspecial = document.getElementById("container-funcao-especial"),
        campoOmni = document.getElementById("campo-omni"),
        campoBuscaAssist = document.getElementById("campo-busca-assist");
    let lojasCache = [], editId = null;

    // --- Funções ---
    const updateVendedoresPlaceholder = () => { placeholderVendedores.style.display = containerVendedores.children.length === 0 ? "block" : "none"; };
    
    async function carregarLojas() {
        try {
            lojasCache = await (await fetch("/api/lojas")).json();
            lojaSelect.innerHTML = '<option value="" disabled selected>Selecione uma loja</option>';
            lojasCache.forEach(e => lojaSelect.add(new Option(e.nome, e.nome)));
        } catch (e) {
            lojaSelect.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
        }
    }
    
    const handleSelecaoDeLoja = () => {
        const loja = lojasCache.find(l => l.nome === lojaSelect.value);
        containerFuncaoEspecial.style.display = "none";
        campoOmni.style.display = "none";
        campoBuscaAssist.style.display = "none";
        if (!loja) return;
        if (loja.funcao_especial === "Omni") {
            containerFuncaoEspecial.style.display = "block";
            campoOmni.style.display = "block";
        } else if (loja.funcao_especial === "Busca por Assist. Tec.") {
            containerFuncaoEspecial.style.display = "block";
            campoBuscaAssist.style.display = "block";
        }
    };
    
    const adicionarVendedor = (data = {}) => {
        const div = document.createElement("div");
        div.className = "input-group input-group-sm";
        div.innerHTML = `<input type=text class=form-control placeholder=Nome data-vendedor=nome value="${data.nome || ''}"><input type=number class=form-control placeholder=Atend. value="${data.atendimentos || 0}" min=0 data-vendedor=atendimentos><input type=number class=form-control placeholder=Vendas value="${data.vendas || 0}" min=0 data-vendedor=vendas><button type=button class="btn btn-outline-danger" data-action=remover-vendedor>-</button>`;
        containerVendedores.appendChild(div);
        updateVendedoresPlaceholder();
    };

    const preencherFormularioParaEdicao = async (id) => {
        try {
            const response = await fetch(`/api/relatorio/${id}`);
            const { relatorio } = await response.json();
            
            containerPage.querySelectorAll('input, select').forEach(input => {
                if (relatorio[input.name] !== undefined) {
                    input.value = relatorio[input.name];
                }
            });

            lojaSelect.value = relatorio.loja;
            handleSelecaoDeLoja();

            containerVendedores.innerHTML = '';
            const vendedores = JSON.parse(relatorio.vendedores || '[]');
            vendedores.forEach(vendedor => adicionarVendedor(vendedor));
            
            btnSalvarTudo.textContent = 'ATUALIZAR RELATÓRIO';
            editId = id;
        } catch (error) {
            alert('Não foi possível carregar os dados para edição.');
        }
    };
    
    const handleSalvarTudo = async () => {
        const data = {};
        containerPage.querySelectorAll('input, select').forEach(input => {
            if (input.name) data[input.name] = input.value;
        });
        if (!data.loja || !data.data) { alert('Selecione loja e data.'); return; }

        const vendedores = [];
        containerVendedores.querySelectorAll('.input-group').forEach(group => {
            const nome = group.querySelector('[data-vendedor="nome"]').value.trim();
            if (nome) vendedores.push({ nome, atendimentos: group.querySelector('[data-vendedor="atendimentos"]').value, vendas: group.querySelector('[data-vendedor="vendas"]').value });
        });
        data.vendedores = JSON.stringify(vendedores);

        const url = editId ? `/api/relatorios/${editId}` : '/api/relatorios';
        const method = editId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert(editId ? 'Relatório atualizado!' : 'Relatório salvo!');
            
            if (editId) {
                // Volta para a página de consulta
                history.pushState(null, '', '/consulta');
                window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
                // Reseta o formulário
                containerPage.querySelectorAll('input[type="number"], input[type="time"]').forEach(i => i.value = i.type === 'number' ? 0 : '');
                lojaSelect.value = '';
                containerVendedores.innerHTML = '';
                handleSelecaoDeLoja();
                updateVendedoresPlaceholder();
            }
        } catch (error) {
            alert(`Falha ao salvar: ${error.message}`);
        }
    };
    
    // --- Event Listeners e Inicialização ---
    dataInput.value = new Date().toISOString().slice(0, 10);
    btnAddVendedor.addEventListener("click", () => adicionarVendedor());
    btnSalvarTudo.addEventListener("click", handleSalvarTudo);
    lojaSelect.addEventListener("change", handleSelecaoDeLoja);
    containerVendedores.addEventListener("click", e => { if (e.target.dataset.action === "remover-vendedor") { e.target.closest(".input-group").remove(); updateVendedoresPlaceholder(); } });
    
    carregarLojas().then(() => {
        const params = new URLSearchParams(window.location.search);
        const idParaEditar = params.get('editId');
        if (idParaEditar) {
            preencherFormularioParaEdicao(idParaEditar);
        } else {
            editId = null;
            btnSalvarTudo.textContent = 'SALVAR RELATÓRIO COMPLETO';
            updateVendedoresPlaceholder();
        }
    });
};