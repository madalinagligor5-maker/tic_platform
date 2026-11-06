// Google Analytics 4, doar după acordul vizitatorului (site folosit de copii: fără reclame, fără semnale Google).
// Adresele cu identificatori (clase, elevi, prezentări, documente) se trimit fără identificator.
(function () {
  'use strict';
  const ID = 'G-QZJ845GYDN';
  const KEY = 'edudigi-statistici';
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch { /* fără stocare: întrebăm din nou data viitoare */ } };
  let pornit = false;

  function adresa() {
    let h = (location.hash.replace(/^#/, '') || '').split('?')[0];
    h = h.replace(/\/(clasa|elev|prezentare|atelier|text|tabel)\/[\w-]+/g, '/$1/:id');
    return location.origin + location.pathname + (h ? '#' + h : '');
  }

  function vizita() {
    if (!pornit) return;
    // Titlul paginii se schimbă după ce aplicația termină de desenat pagina.
    setTimeout(() => window.gtag('event', 'page_view', { page_location: adresa(), page_title: document.title }), 400);
  }

  function porneste() {
    if (pornit) return;
    pornit = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.append(s);
    vizita();
    window.addEventListener('hashchange', vizita);
  }

  function banner() {
    if (document.querySelector('.cookie-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Statistici de vizitare');
    const p = document.createElement('p');
    p.textContent = 'Folosim Google Analytics ca să vedem câte vizite are edudigi și ce lecții sunt folosite. Nu folosim reclame și nu trimitem nume sau date personale. Accepți cookie-urile de statistică?';
    const da = document.createElement('button');
    da.type = 'button'; da.className = 'btn small'; da.textContent = 'Accept';
    const nu = document.createElement('button');
    nu.type = 'button'; nu.className = 'btn small ghost'; nu.textContent = 'Nu, mulțumesc';
    da.onclick = () => { set('da'); bar.remove(); porneste(); };
    nu.onclick = () => { set('nu'); bar.remove(); };
    const b = document.createElement('div');
    b.className = 'cookie-actions';
    b.append(da, nu);
    bar.append(p, b);
    document.body.append(bar);
  }

  function init() {
    const v = get();
    if (v === 'da') porneste();
    else if (v !== 'nu') banner();
    // Legătura „Statistici (cookie-uri)” din subsol redeschide alegerea.
    for (const a of document.querySelectorAll('[data-cookie-setari]')) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (pornit) { set('nu'); location.reload(); } else banner();
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
