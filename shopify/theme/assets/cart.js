/*
 * Lanterne — cart page behavior.
 * Loaded only by the sections that need it. Shared helpers come from theme.js.
 */

const theme = window.theme || { routes: {}, strings: {} };
const { announce, debounce, parseHTML } = window.Lanterne;

/* ---------------------------------------------------------------------------
   Cart page: quantity updates and removal without a full reload
   --------------------------------------------------------------------------- */
class CartItems extends HTMLElement {
  connectedCallback() {
    this.addEventListener(
      'change',
      debounce((event) => {
        if (event.target.matches('[data-cart-quantity]')) {
          this.updateQuantity(event.target.dataset.line, event.target.value, event.target.id);
        }
      }, 350)
    );

    this.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-cart-remove]');
      if (!remove) return;
      event.preventDefault();
      this.updateQuantity(remove.dataset.line, 0);
    });

    const saveAttributes = debounce(() => {
      const attributes = {};
      this.querySelectorAll('[data-cart-attribute]').forEach((field) => {
        attributes[field.dataset.cartAttribute] = field.type === 'checkbox' ? (field.checked ? field.value : '') : field.value;
      });
      fetch(theme.routes.cartUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ attributes }),
      });
    }, 500);
    this.addEventListener('input', (event) => {
      if (event.target.matches('[data-cart-attribute]')) saveAttributes();
    });
    this.addEventListener('change', (event) => {
      if (event.target.matches('[data-cart-attribute]')) saveAttributes();
    });

    this.addEventListener(
      'input',
      debounce((event) => {
        if (!event.target.matches('[data-cart-note]')) return;
        fetch(theme.routes.cartUpdate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ note: event.target.value }),
        });
      }, 500)
    );
  }

  async updateQuantity(line, quantity, focusId) {
    const sectionId = this.dataset.sectionId;
    this.classList.add('cart-items--loading');
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(theme.routes.cartChange, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          line: Number(line),
          quantity: Number(quantity),
          sections: [sectionId],
          sections_url: window.location.pathname,
        }),
      });
      const state = await response.json();

      if (!response.ok || state.errors) {
        announce(state.description || state.errors || theme.strings.cartError);
        return;
      }

      const html = parseHTML(state.sections[sectionId]);
      const fresh = html.querySelector('[data-cart-part="content"]');
      const current = this.querySelector('[data-cart-part="content"]');
      if (fresh && current) current.replaceWith(fresh);

      document.querySelectorAll('[data-cart-count]').forEach((count) => {
        count.classList.toggle('cart-count--empty', state.item_count === 0);
        const visible = count.querySelector('[aria-hidden="true"]');
        if (visible) visible.textContent = state.item_count;
      });

      const focusTarget = focusId && document.getElementById(focusId);
      if (focusTarget) {
        focusTarget.focus();
      } else {
        this.querySelector('h1')?.setAttribute('tabindex', '-1');
        this.querySelector('h1')?.focus();
      }
      announce(theme.strings.cartUpdated);
    } catch (error) {
      announce(theme.strings.cartError);
    } finally {
      this.classList.remove('cart-items--loading');
      this.removeAttribute('aria-busy');
    }
  }
}
customElements.define('cart-items', CartItems);
