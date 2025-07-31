document.addEventListener('DOMContentLoaded', () => {
    const pageContent = document.getElementById('page-content');
    const pageInitializers = {
        'novo-relatorio': window.initNovoRelatorioPage,
        'consulta': window.initConsultaPage,
        'gerenciar-lojas': window.initGerenciarLojasPage,
        'admin': window.initAdminPage,
        'demandas': window.initDemandasPage
    };
    async function loadPage(pageName) {
        if (!pageContent) return;
        try {
            pageContent.innerHTML = '<div class="text-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
            const response = await fetch(`/content/${pageName}`);
            if (!response.ok) throw new Error(`Página /content/${pageName} não encontrada.`);
            pageContent.innerHTML = await response.text();
            
            const initFunc = pageInitializers[pageName];
            if (typeof initFunc === 'function') {
                setTimeout(initFunc, 0);
            }
        } catch (error) {
            console.error("Erro ao carregar página:", error);
            pageContent.innerHTML = `<div class="p-3 text-center text-danger">Erro ao carregar conteúdo.</div>`;
        }
    }
    function handleNavigation(path) {
        const pageName = (path === '/' || path === '/index.html' || path === '') ? 'novo-relatorio' : path.substring(1).split('?')[0];
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
        const targetHref = (pageName === 'novo-relatorio') ? '/' : `/${pageName}`;
        const activeLink = document.querySelector(`.nav-link[href="${targetHref}"]`);
        if (activeLink) {
            activeLink.closest('.nav-item').classList.add('active');
        }
        loadPage(pageName);
    }
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('a.nav-link');
        if (navLink && navLink.closest('.sidebar-nav')) {
            e.preventDefault();
            const path = navLink.getAttribute('href');
            if (location.pathname !== path) {
                history.pushState(null, '', path);
                handleNavigation(path);
            }
        }
    });
    window.addEventListener('popstate', () => handleNavigation(location.pathname));
    handleNavigation(location.pathname);
});