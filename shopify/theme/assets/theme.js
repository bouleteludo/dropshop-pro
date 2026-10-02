/*
 * Lanterne — storefront behavior.
 * Every feature works without JavaScript; this module only enhances it.
 */

const theme = window.theme || { routes: {}, strings: {} };

function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function announce(message) {
  const region = document.querySelector('[data-live-region]');
  if (!region || !message) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

function parseHTML(text) {
  return new DOMParser().parseFromString(text, 'text/html');
}

window.Lanterne = { debounce, announce, parseHTML };

/* ---------------------------------------------------------------------------
   Disclosures (menus, search, filters): Escape and click outside close them
   --------------------------------------------------------------------------- */
function closeDisclosure(details, restoreFocus = false) {
  if (!details.open) return;
  details.open = false;
  if (restoreFocus) details.querySelector('summary')?.focus();
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const openDetails = [...document.querySelectorAll('details[data-disclosure][open], details[data-facets-disclosure][open]')];
  const target = openDetails.reverse().find((details) => details.contains(document.activeElement)) || openDetails[0];
  if (target) closeDisclosure(target, true);
});

document.addEventListener('click', (event) => {
  document.querySelectorAll('details[data-disclosure][open], details[data-facets-disclosure][open]').forEach((details) => {
    if (!details.contains(event.target)) closeDisclosure(details);
  });
});

document.addEventListener(
  'toggle',
  (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open || !details.matches('.header-menu__dropdown')) return;
    document.querySelectorAll('.header-menu__dropdown[open]').forEach((other) => {
      if (other !== details) other.open = false;
    });
  },
  true
);

/* ---------------------------------------------------------------------------
   Quantity input
   --------------------------------------------------------------------------- */
class QuantityInput extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input');
    this.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || !this.input) return;
      event.preventDefault();
      const previous = this.input.value;
      if (button.name === 'plus') this.input.stepUp();
      if (button.name === 'minus') this.input.stepDown();
      if (previous !== this.input.value) {
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}
customElements.define('quantity-input', QuantityInput);

/* ---------------------------------------------------------------------------
   Predictive search
   --------------------------------------------------------------------------- */
class PredictiveSearch extends HTMLElement {
  connectedCallback() {
    this.details = this.querySelector('details');
    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('[data-predictive-results]');
    this.status = this.querySelector('[data-predictive-status]');
    if (!this.input || !this.results) return;

    this.details?.addEventListener('toggle', () => {
      if (this.details.open) this.input.focus();
    });
    this.input.addEventListener('input', debounce(() => this.search(), 300));
  }

  async search() {
    const terms = this.input.value.trim();
    this.controller?.abort();
    if (!terms) {
      this.results.innerHTML = '';
      this.status.textContent = '';
      return;
    }

    this.controller = new AbortController();
    const params = new URLSearchParams({
      q: terms,
      'resources[type]': 'product,collection,page,article',
      'resources[limit]': '4',
      section_id: this.dataset.sectionId,
    });

    try {
      const response = await fetch(`${theme.routes.predictiveSearch}?${params}`, { signal: this.controller.signal });
      if (!response.ok) throw new Error(response.status);
      const html = parseHTML(await response.text());
      const content = html.querySelector('[data-predictive-search-results]');
      this.results.innerHTML = content ? content.outerHTML : '';
      const count = this.results.querySelector('[data-predictive-count]');
      this.status.textContent = count ? count.textContent : '';
    } catch (error) {
      if (error.name !== 'AbortError') this.results.innerHTML = '';
    }
  }
}
customElements.define('predictive-search', PredictiveSearch);

/* ---------------------------------------------------------------------------
   Theme editor: preview a scheduled season when its block is selected
   --------------------------------------------------------------------------- */
if (window.Shopify && window.Shopify.designMode) {
  const showSlide = (banner, id) => {
    banner.querySelectorAll('[data-slide]').forEach((slide) => {
      slide.hidden = slide.dataset.slide !== id;
    });
  };

  document.addEventListener('shopify:block:select', (event) => {
    const slide = event.target.closest('[data-slide]');
    const banner = slide && slide.closest('[data-seasonal-banner]');
    if (banner) showSlide(banner, slide.dataset.slide);
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    const banner = event.target.closest('[data-seasonal-banner]');
    if (banner) showSlide(banner, banner.dataset.activeSlide);
  });
}
