

function initNovoRelatorioPage() {
    
    // Juntei tudo numa função kk
    // Pra nao ter conflito 
    let lojasComFuncaoEspecial = [];

    // Anexar ao 'window' chama o html
    window.adicionarVendedor = function() {
        const container = document.getElementById('vendedores-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'vendedor-item form-row align-items-center mb-2';
        div.innerHTML = `
            <div class="form-group flex-grow-1"><input type="text" class="form-control nome-vendedor" placeholder="Nome do Vendedor" required></div>
            <div class="form-group"><input type="number" class="form-control atendimentos-vendedor" placeholder="Atendimentos" value="0" required></div>
            <div class="form-group"><input type="number" class="form-control vendas-vendedor" placeholder="Vendas" value="0" required></div>
            <div class="form-group"><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.vendedor-item').remove()">Remover</button></div>
        `;
        container.appendChild(div);
    };

    function checarFuncaoEspecial() {
        const lojaSelect = document.getElementById('loja');
        const containerFuncao = document.getElementById('funcao-especial-container');
        const labelFuncao = document.getElementById('label-funcao-especial');
        const inputNomeFuncao = document.getElementById('nome_funcao_especial');
        const lojaSelecionada = lojasComFuncaoEspecial.find(l => l.nome === lojaSelect.value);

        if (lojaSelecionada && lojaSelecionada.funcao_especial) {
            labelFuncao.textContent = lojaSelecionada.funcao_especial;
            inputNomeFuncao.value = lojaSelecionada.funcao_especial;
            containerFuncao.style.display = 'block';
        } else {
            containerFuncao.style.display = 'none';
            inputNomeFuncao.value = '';
        }
    }

    async function carregarLojas() {
        const lojaSelect = document.getElementById('loja');
        if (!lojaSelect) return;
        try {
            const response = await fetch('/api/lojas');
            lojasComFuncaoEspecial = await response.json();
            if (!response.ok) throw new Error('Falha ao buscar dados da API');

            lojaSelect.innerHTML = '';
            lojaSelect.add(new Option('Selecione uma loja', ''));
            lojasComFuncaoEspecial.forEach(loja => lojaSelect.add(new Option(loja.nome, loja.nome)));
            lojaSelect.addEventListener('change', checarFuncaoEspecial);
        } catch (e) {
            lojaSelect.innerHTML = `<option>Falha ao carregar</option>`;
        }
    }

    const form = document.getElementById('form-relatorio');
    if (form) {
        form.addEventListener('submit', function(e) {
            const vendedores = [];
            document.querySelectorAll('.vendedor-item').forEach(item => {
                vendedores.push({
                    nome: item.querySelector('.nome-vendedor').value,
                    atendimentos: item.querySelector('.atendimentos-vendedor').value,
                    vendas: item.querySelector('.vendas-vendedor').value
                });
            });
            document.getElementById('vendedores-json').value = JSON.stringify(vendedores);
        });
    }

 // carregamento 
    carregarLojas();
}