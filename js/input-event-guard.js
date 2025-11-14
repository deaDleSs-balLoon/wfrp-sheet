// handleCustomInput Safety Guard - prevents null.children errors
// Intercepts input events and filters out elements that aren't part of tbody
// Подключите это ПЕРЕД app.js в HTML

(function() {
  'use strict';

  // Capture phase event listener to intercept input events before they reach handleCustomInput
  document.addEventListener('input', function(event) {
    // Check if element is marked as custom
    if (!event.target.classList || !event.target.classList.contains('custom') && 
        !event.target.closest('.custom') && 
        !event.target.closest('fieldset.custom')) {
      return; // Not a custom field, let it through
    }

    // Check if this element is part of a table structure (tbody)
    const tbody = event.target.closest('tbody');
    
    if (!tbody) {
      // This is a custom field but NOT in a table
      // Stop the event from bubbling to handleCustomInput
      console.debug('Blocking handleCustomInput for non-table element:', event.target.id || event.target.name || event.target.className);
      event.stopImmediatePropagation();
      return false;
    }
  }, true); // Use capture phase to intercept early

  console.log('Input event safety guard installed');
})();
