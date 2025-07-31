/**
 * Exibe um modal de confirmação genérico e robusto.
 * @param {string} message 
 * @returns {Promise<boolean>} 
 */
function showConfirmModal(message = 'Deseja realmente excluir este item?') {
    const confirmModalElement = document.getElementById('global-confirm-modal');
    if (!confirmModalElement) {
        console.error("Modal de confirmação #global-confirm-modal não encontrado.");
        return Promise.resolve(window.confirm(message));
    }
    
    const modalInstance = new bootstrap.Modal(confirmModalElement);
    const modalBody = document.getElementById('confirm-modal-body');
    const btnYes = document.getElementById('btn-confirm-yes');
    const btnNo = document.getElementById('btn-confirm-no');

    return new Promise((resolve) => {
        modalBody.textContent = message;

        const handleResolve = (didConfirm) => {
            // Limpa o evento para não ser acionado de novo quando o modal for escondido
            confirmModalElement.removeEventListener('hide.bs.modal', onHide);
            modalInstance.hide();
            resolve(didConfirm);
        };
        
        // Função a ser chamada quando o modal for escondido (pelo ESC, X, etc.)
        const onHide = () => handleResolve(false);

        // Clona botões para remover listeners antigos
        const newBtnYes = btnYes.cloneNode(true);
        newBtnYes.onclick = () => handleResolve(true);
        btnYes.parentNode.replaceChild(newBtnYes, btnYes);

        const newBtnNo = btnNo.cloneNode(true);
        newBtnNo.onclick = () => handleResolve(false);
        btnNo.parentNode.replaceChild(newBtnNo, btnNo);

        confirmModalElement.addEventListener('hide.bs.modal', onHide, { once: true });
        
        modalInstance.show();
    });
}