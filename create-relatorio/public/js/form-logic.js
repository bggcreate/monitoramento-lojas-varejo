// CRIAR e EDITAR relatórios.
function initNovoRelatorioPage() {

    // Tenta encontrar uma função de Toast global, senão usa alert.
    const showFeedback = (title, message, type) => {
        if (window.parent && typeof window.parent.showToast === 'function') {
            window.parent.showToast(title, message, type);
        } else if(typeof showToast === 'function') {
            showToast(title, message, type);
        } else {
            alert(`${title}: ${message}`);
        }
    };

    let lojasCache = [];
    const formContainer = document.getElementById('form-novo-relatorio');
    if (!formContainer) {
        console.error("Elemento #form-novo-relatorio não encontrado.");
        return;
    }

    // Seletores dos elementos do formulário
    const lojaSelect = document.getElementById("loja"),
          dataInput = document.getElementById("data"),
          btnAddVendedor = document.getElementById("btn-add-vendedor"),
          containerVendedores = document.getElementById("container-vendedores"),
          placeholderVendedores = document.getElementById("vendedores-placeholder"),
          btnSalvarTudo = document.getElementById("btn-salvar-tudo"),
          containerFuncaoEspecial = document.getElementById("container-funcao-especial"),
          campoOmni = document.getElementById("campo-omni"),
          campoBuscaAssist = document.getElementById("campo-busca-assist");
          
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('edit'); // Verifica se há um 'edit' na URL

    const updateVendedoresPlaceholder = () => { if(placeholderVendedores) placeholderVendedores.style.display = containerVendedores.children.length === 0 ? "block" : "none"; };
    
    async function carregarLojas() {
        try {
            const response = await fetch("/api/lojas");
            lojasCache = await response.json();
            lojaSelect.innerHTML = '<option value="" disabled selected>Selecione uma loja</option>';
            lojasCache.filter(l => l.status === 'ativa' || reportId).forEach(e => lojaSelect.add(new Option(e.nome, e.nome)));
        } catch (e) { console.error("Falha ao carregar lojas", e); }
    }

    const handleSelecaoDeLoja = () => {
        const loja = lojasCache.find(l => l.nome === lojaSelect.value);
        if(containerFuncaoEspecial) containerFuncaoEspecial.style.display = "none";
        if(campoOmni) campoOmni.style.display = "none";
        if(campoBuscaAssist) campoBuscaAssist.style.display = "none";
        if (!loja) return;
        
        if (loja.funcao_especial === "Omni" && containerFuncaoEspecial && campoOmni) {
            containerFuncaoEspecial.style.display = "block";
            campoOmni.style.display = "block";
        } else if (loja.funcao_especial === "Busca por Assist. Tec." && containerFuncaoEspecial && campoBuscaAssist) {
            containerFuncaoEspecial.style.display = "block";
            campoBuscaAssist.style.display = "block";
        }
    };

    const adicionarVendedor = (vendedor = { nome: '', atendimentos: 0, vendas: 0 }) => {
        const div = document.createElement("div");
        div.className = "input-group input-group-sm mb-2";
        div.innerHTML = `<input type="text" class="form-control" placeholder="Nome do Vendedor" data-vendedor="nome" value="${vendedor.nome || ''}"><input type="number" class="form-control" placeholder="Atend." value="${vendedor.atendimentos || 0}" data-vendedor="atendimentos"><input type="number" class="form-control" placeholder="Vendas" value="${vendedor.vendas || 0}" data-vendedor="vendas"><button type="button" class="btn btn-outline-danger" data-action="remover-vendedor">-</button>`;
        containerVendedores.appendChild(div);
        updateVendedoresPlaceholder();
    };
    
    async function carregarDadosParaEdicao() {
        showFeedback("Modo de Edição", "Carregando dados...", "info");
        await carregarLojas(); // Carrega lojas primeiro

        try {
            const response = await fetch(`/api/relatorios/${reportId}`);
            if (!response.ok) throw new Error('Relatório não encontrado.');
            const { relatorio, vendedores } = await response.json();

            // Preenche todos os campos do formulário
            for (const key in relatorio) {
                const input = formContainer.querySelector(`[name="${key}"]`);
                if (input) {
                    input.value = relatorio[key];
                }
            }
            
            // Preenche os vendedores
            containerVendedores.innerHTML = '';
            vendedores.forEach(v => adicionarVendedor(v));
            updateVendedoresPlaceholder();

            handleSelecaoDeLoja(); // Atualiza a visibilidade dos campos especiais

            // Muda o texto do botão
            btnSalvarTudo.textContent = 'SALVAR ALTERAÇÕES';
            
        } catch(error) {
             showFeedback("Erro", "Não foi possível carregar o relatório para edição.", "danger");
             console.error(error);
        }
    }


    const handleSalvarTudo = async () => {
        const data = {};
        const formInputs = formContainer.querySelectorAll('input[name], select[name]');
        formInputs.forEach(input => { if (input.name) data[input.name] = input.value; });
        
        if (!data.loja || !data.data) {
            showFeedback('Atenção', 'Selecione uma loja e uma data.', 'danger');
            return;
        }

        const vendedores = [];
        containerVendedores.querySelectorAll('.input-group').forEach(group => {
            const nomeInput = group.querySelector('[data-vendedor="nome"]');
            const nome = nomeInput ? nomeInput.value.trim() : '';
            if (nome) {
                vendedores.push({
                    nome: nome,
                    atendimentos: group.querySelector('[data-vendedor="atendimentos"]').value || 0,
                    vendas: group.querySelector('[data-vendedor="vendas"]').value || 0
                });
            }
        });
        data.vendedores = JSON.stringify(vendedores);
        
        // Determina se é uma criação (POST) ou edição (PUT)
        const method = reportId ? 'PUT' : 'POST';
        const url = reportId ? `/api/relatorios/${reportId}` : '/api/relatorios';

        try {
            btnSalvarTudo.disabled = true;
            btnSalvarTudo.textContent = 'Salvando...';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro desconhecido');
            
            const successMessage = reportId ? 'Relatório atualizado com sucesso!' : 'Relatório salvo com sucesso!';
            
            if (document.getElementById('modal-sucesso-live')) {
                // Lógica da janela Live
                const modalEl = document.getElementById('modal-sucesso-live');
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
                document.getElementById('btn-novo-relatorio-live').onclick = () => location.reload();
            } else {
                // Lógica da página principal
                showFeedback('Sucesso!', successMessage, 'success');
                setTimeout(() => {
                    // Se estava editando, redireciona para a consulta, senão limpa o form.
                    if(reportId) { window.location.href = '/consulta'; }
                }, 1500);
            }

            if (!reportId) { // Só limpa se for um novo relatório
                formContainer.reset();
                dataInput.value = new Date().toISOString().slice(0, 10);
                containerVendedores.innerHTML = '';
                updateVendedoresPlaceholder();
                handleSelecaoDeLoja();
            }
            
        } catch (error) {
            showFeedback('Falha ao Salvar', error.message, 'danger');
        } finally {
            btnSalvarTudo.disabled = false;
            btnSalvarTudo.textContent = reportId ? 'SALVAR ALTERAÇÕES' : 'SALVAR RELATÓRIO COMPLETO';
        }
    };
    
    // --- INICIALIZAÇÃO DA PÁGINA ---
    // Conecta os eventos
    btnAddVendedor?.addEventListener("click", () => adicionarVendedor());
    btnSalvarTudo?.addEventListener("click", handleSalvarTudo);
    lojaSelect?.addEventListener("change", handleSelecaoDeLoja);
    containerVendedores?.addEventListener("click", e => {
        if (e.target && e.target.dataset.action === "remover-vendedor") {
            e.target.closest(".input-group").remove();
            updateVendedoresPlaceholder();
        }
    });

    if (reportId) {
        // Modo de Edição
        document.querySelector('h3.card-title').textContent = 'Editar Relatório';
        carregarDadosParaEdicao();
    } else {
        // Modo de Criação
        dataInput.value = new Date().toISOString().slice(0, 10);
        carregarLojas();
        updateVendedoresPlaceholder();
    }
}