
document.addEventListener('DOMContentLoaded', async () => {
    const navAdmin = document.getElementById('nav-admin');
    const navGerenciar = document.getElementById('nav-gerenciar');
    const navDemandas = document.getElementById('nav-demandas');
    const userInfoContainer = document.getElementById('user-info-container');
    
    try {
        const response = await fetch('/api/session-info');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        const session = await response.json();

        if (userInfoContainer) {
            userInfoContainer.innerHTML = `
                <div class="user-info">
                    <span>Olá, ${session.username}</span>
                </div>
                <div class="d-flex align-items-center">
                    <a href="/live" id="live-mode-btn" class="btn btn-sm btn-outline-secondary me-2" title="Modo Live">
                        <i class="bi bi-broadcast"></i>
                    </a>
                    <a href="/logout" class="btn btn-sm btn-outline-secondary" title="Sair">
                        <i class="bi bi-box-arrow-right"></i>
                    </a>
                </div>
            `;
        }
        
        if (session.role === 'admin') {
            if (navAdmin) navAdmin.classList.remove('d-none');
            if (navGerenciar) navGerenciar.classList.remove('d-none');
        }
        
        if (navDemandas) navDemandas.classList.remove('d-none');

        const liveButton = document.getElementById('live-mode-btn');
        if (liveButton) {
            liveButton.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                
                const url = e.currentTarget.href;
                const windowName = 'live-window';
                const windowFeatures = 'width=550,height=850,scrollbars=yes,resizable=yes';
                
                window.open(url, windowName, windowFeatures);
            });
        }

    } catch (e) {
        console.error("Erro ao buscar informações da sessão", e);
    }
});