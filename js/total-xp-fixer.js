// Total XP Fixer - synchronizes total-xp update
// Must be loaded BEFORE app.js!

(function() {
  'use strict';

  function initTotalXpFixer() {
    const totalOutput = document.getElementById('total-xp');
    const currentInput = document.getElementById('current-xp');
    const spentInput = document.getElementById('spent-xp');

    if (!totalOutput || !currentInput || !spentInput) {
      console.warn('Total XP Fixer: elements not found');
      return;
    }

    // Manual function to update total
    function updateTotal() {
      const current = parseInt(currentInput.value, 10) || 0;
      const spent = parseInt(spentInput.value, 10) || 0;
      totalOutput.textContent = current + spent;
    }

    // Update total on change event for both fields
    currentInput.addEventListener('change', updateTotal);
    spentInput.addEventListener('change', updateTotal);

    // Export function for manual total update (used by xp-calculator.js)
    window.updateTotalXp = function() {
      const current = parseInt(currentInput.value, 10) || 0;
      const spent = parseInt(spentInput.value, 10) || 0;
      totalOutput.textContent = current + spent;
    };

    // Export function to disable auto-update of total-xp
    // This removes the 'for' attribute so browser won't update automatically
    window.disableTotalXpAutoUpdate = function() {
      totalOutput.removeAttribute('for');
    };

    if (typeof window.saveToStorage === 'undefined') {
      window.saveToStorage = function(key, value) {
        if (key.startsWith("_")) {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(key, value);
        }
      };
    }

    console.log('Total XP Fixer initialized');
  }

  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTotalXpFixer);
  } else {
    // DOM already loaded
    initTotalXpFixer();
  }
})();
