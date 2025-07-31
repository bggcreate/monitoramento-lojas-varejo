// LOJAS

function inicializarPaginaLojas() {
    const tabelaBody = document.getElementById('tabela-lojas-body');
    const formLoja = document.getElementById('form-loja');

    if (!tabelaBody || !formLoja) return;

    const carregarLojas = () => {
        tabelaBody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando lojas...</td></tr>';
        fetch('/api/lojas')
            .then(res => res.json())
            .then(lojas => {
                tabelaBody.innerHTML = '';
                lojas.forEach(loja => {
                    const tr = document.createElement('tr');
                    tr.id = `loja-row-${loja.id}`;
                    tr.innerHTML = `
                        <td>${loja.nome}</td>
                        <td>${loja.funcao_especial || 'Nenhuma'}</td>
                        <td>${loja.meta_tx_loja}%</td>
                        <td>${loja.meta_tx_monitoramento}%</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-secondary" disabled title="Editar em breve">Editar</button>
                            <button onclick="window.deletarLoja(${loja.id})" class="btn btn-sm btn-outline-danger">Excluir</button>
                        </td>
                    `;
                    tabelaBody.appendChild(tr);
                });
            });
    };

    formLoja.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formLoja);
        const data = Object.fromEntries(formData.entries());

        fetch('/api/lojas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(response => {
            if (response.id) {
                formLoja.reset();
                carregarLojas(); // Recarrega a lista
            } else {
                alert(response.error || 'Erro ao salvar loja.');
            }
        });
    });

    window.deletarLoja = (id) => {
        if (confirm('Tem certeza que deseja excluir esta loja?')) {
            fetch(`/api/lojas/${id}`, { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    if (data.changes > 0) document.getElementById(`loja-row-${id}`).remove();
                });
        }
    };
    
    carregarLojas();
}

inicializarPaginaLojas();