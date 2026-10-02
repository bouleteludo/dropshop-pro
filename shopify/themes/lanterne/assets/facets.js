/*
 * Lanterne — filtering and sorting.
 * Loaded only by the sections that need it. Shared helpers come from theme.js.
 */

/* ---------------------------------------------------------------------------
   Filters and sorting
   --------------------------------------------------------------------------- */
class FacetForm extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector('form');
    this.addEventListener('change', (event) => {
      if (event.target.matches('[data-auto-submit], .facets__checkbox')) {
        form.querySelectorAll('input[type="number"]').forEach((input) => {
          if (input.value === '') input.disabled = true;
        });
        form.requestSubmit();
      }
    });
    form?.addEventListener('submit', () => {
      form.querySelectorAll('input[type="number"]').forEach((input) => {
        if (input.value === '') input.disabled = true;
      });
    });
  }
}
customElements.define('facet-form', FacetForm);
