// --- Wiki article expand/collapse ---
function toggleArticle(btn) {
  const article = btn.closest('.wiki-article');
  article.classList.toggle('open');
}

// --- Smooth scroll to section ---
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 20;
  const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: y, behavior: 'smooth' });
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
        // Auto-expand matching articles when searching
        if (q) {
          article.classList.add('open');
        }
      } else {
        article.style.display = 'none';
        article.classList.remove('open');
      }
    });

    // Hide category header if no articles match
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
    // Collapse all when search cleared
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

// Throttled scroll handler
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) return;
  scrollTimeout = setTimeout(() => {
    updateTocActive();
    scrollTimeout = null;
  }, 80);
});

// --- Keyboard shortcut: focus search with / ---
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    document.getElementById('wikiSearch').focus();
  }
});

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  // Check for hash in URL to auto-scroll
  if (window.location.hash) {
    const id = window.location.hash.slice(1);
    setTimeout(() => scrollToSection(id), 200);
  }
  updateTocActive();
});
