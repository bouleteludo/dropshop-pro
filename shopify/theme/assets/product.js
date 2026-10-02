/*
 * Lanterne — product page behavior.
 * Loaded only by the sections that need it. Shared helpers come from theme.js.
 */

const theme = window.theme || { routes: {}, strings: {} };
const { announce, parseHTML } = window.Lanterne;

/* ---------------------------------------------------------------------------
   Product information: variant selection through the Section Rendering API
   --------------------------------------------------------------------------- */
class ProductInfo extends HTMLElement {
  connectedCallback() {
    this.addEventListener('change', (event) => {
      if (event.target.matches('[data-option-value-id], [data-option-select]')) this.onOptionChange(event.target);
    });
    this.setupRecipientForm();
  }

  selectedOptionValueIds() {
    const ids = [];
    this.querySelectorAll('.variant-picker__option').forEach((option) => {
      const select = option.querySelector('select');
      if (select) {
        ids.push(select.value);
        return;
      }
      const checked = option.querySelector('input:checked');
      if (checked) ids.push(checked.dataset.optionValueId);
    });
    return ids;
  }

  async onOptionChange(target) {
    const sectionId = this.dataset.sectionId;
    const focusedId = target.id;
    const params = new URLSearchParams({ option_values: this.selectedOptionValueIds().join(','), section_id: sectionId });

    this.controller?.abort();
    this.controller = new AbortController();
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${this.dataset.productUrl}?${params}`, { signal: this.controller.signal });
      const html = parseHTML(await response.text());
      const fresh = html.querySelector(`product-info[data-section-id="${sectionId}"]`);
      if (!fresh) return;

      this.querySelectorAll('[data-product-part]').forEach((part) => {
        const replacement = fresh.querySelector(`[data-product-part="${part.dataset.productPart}"]`);
        if (replacement) part.replaceWith(replacement);
      });

      const variantInput = fresh.querySelector('[data-variant-id]');
      const variantId = variantInput ? variantInput.value : '';
      this.querySelectorAll('[data-variant-id]').forEach((input) => {
        input.value = variantId;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      if (focusedId) document.getElementById(focusedId)?.focus();

      if (this.dataset.updateUrl === 'true' && variantId) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variantId);
        window.history.replaceState({}, '', url.toString());
      }

      this.showMedia(fresh.dataset.featuredMediaId);
      const price = this.querySelector('[data-product-part^="price-"] .price');
      if (price) announce(price.textContent.replace(/\s+/g, ' ').trim());
    } catch (error) {
      if (error.name !== 'AbortError') announce(theme.strings.cartError);
    } finally {
      this.removeAttribute('aria-busy');
    }
  }

  showMedia(mediaId) {
    if (!mediaId) return;
    const gallery = this.querySelector('[data-product-gallery]');
    const item = gallery?.querySelector(`[data-media-id="${mediaId}"]`);
    if (!gallery || !item) return;
    gallery.prepend(item);
    gallery.scrollTo({ left: 0, behavior: 'smooth' });
  }

  setupRecipientForm() {
    this.querySelectorAll('[data-recipient-form]').forEach((form) => {
      const toggle = form.querySelector('[data-recipient-toggle]');
      const fields = form.querySelectorAll('[data-recipient-fields] input:not([type="hidden"]), [data-recipient-fields] textarea');
      const offset = form.querySelector('[data-timezone-offset]');
      const sync = () => {
        fields.forEach((field) => {
          field.disabled = !toggle.checked;
        });
        if (offset) {
          offset.value = new Date().getTimezoneOffset().toString();
          offset.disabled = !toggle.checked;
        }
      };
      toggle?.addEventListener('change', sync);
      sync();
    });
  }
}
customElements.define('product-info', ProductInfo);

/* ---------------------------------------------------------------------------
   Product recommendations (related and complementary)
   --------------------------------------------------------------------------- */
class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    const load = async () => {
      try {
        const response = await fetch(this.dataset.url);
        const html = parseHTML(await response.text());
        const selector = `[data-recommendations-target="${this.dataset.target}"]`;
        const fresh = html.querySelector(selector);
        const current = this.querySelector(selector);
        if (fresh && fresh.innerHTML.trim().length && current) {
          current.innerHTML = fresh.innerHTML;
        } else {
          this.closest('.product-recommendations')?.setAttribute('hidden', '');
          this.setAttribute('hidden', '');
        }
      } catch (error) {
        this.setAttribute('hidden', '');
      }
    };

    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        load();
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    observer.observe(this);
  }
}
customElements.define('product-recommendations', ProductRecommendations);

/* ---------------------------------------------------------------------------
   3D models: load Shopify's model viewer UI only when a model is present
   --------------------------------------------------------------------------- */
if (document.querySelector('[data-model]') && window.Shopify && typeof window.Shopify.loadFeatures === 'function') {
  window.Shopify.loadFeatures([
    {
      name: 'model-viewer-ui',
      version: '1.0',
      onLoad(errors) {
        if (errors) return;
        document.querySelectorAll('[data-model] model-viewer').forEach((element) => {
          // eslint-disable-next-line no-new
          new window.Shopify.ModelViewerUI(element);
        });
      },
    },
  ]);
}
