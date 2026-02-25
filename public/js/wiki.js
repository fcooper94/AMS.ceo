// --- Wiki article expand/collapse ---
function toggleArticle(btn) {
  const article = btn.closest('.wiki-article');
  article.classList.toggle('open');
}

// --- Smooth scroll to section ---
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Search / filter ---
function filterArticles(query) {
  const q = query.toLowerCase().trim();
  const categories = document.querySelectorAll('.wiki-category');
  const info = document.getElementById('wikiSearchInfo');
  let totalVisible = 0;

  categories.forEach(cat => {
    const articles = cat.querySelectorAll('.wiki-article');
    let catVisible = 0;

    articles.forEach(article => {
      const header = article.querySelector('.wiki-article-header span');
      const body = article.querySelector('.wiki-article-body');
      const text = (header ? header.textContent : '') + ' ' + (body ? body.textContent : '');

      if (!q || text.toLowerCase().includes(q)) {
        article.style.display = '';
        catVisible++;
        totalVisible++;
        if (q) {
          article.classList.add('open');
        }
      } else {
        article.style.display = 'none';
        article.classList.remove('open');
      }
    });

    const title = cat.querySelector('.wiki-category-title');
    if (title) {
      title.style.display = catVisible > 0 ? '' : 'none';
    }
    cat.style.display = catVisible > 0 ? '' : 'none';
  });

  if (q) {
    info.textContent = totalVisible + ' article' + (totalVisible !== 1 ? 's' : '') + ' found';
    info.style.display = 'block';
  } else {
    info.style.display = 'none';
    document.querySelectorAll('.wiki-article.open').forEach(a => a.classList.remove('open'));
  }
}

// --- Scroll-spy for TOC ---
function updateTocActive() {
  const categories = document.querySelectorAll('.wiki-category');
  const tocLinks = document.querySelectorAll('.wiki-toc-link');
  let currentId = null;

  categories.forEach(cat => {
    const rect = cat.getBoundingClientRect();
    if (rect.top <= 100) {
      currentId = cat.id;
    }
  });

  tocLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#' + currentId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// --- Keyboard shortcut: focus search with / ---
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    document.getElementById('wikiSearch').focus();
  }
});

// --- Init: attach scroll listener to .main-content (the actual scroll container) ---
let scrollTimeout;
document.addEventListener('DOMContentLoaded', () => {
  const mc = document.querySelector('.main-content');
  const scrollTarget = mc || window;
  scrollTarget.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      updateTocActive();
      scrollTimeout = null;
    }, 80);
  });

  if (window.location.hash) {
    const id = window.location.hash.slice(1);
    setTimeout(() => scrollToSection(id), 200);
  }
  updateTocActive();
});
