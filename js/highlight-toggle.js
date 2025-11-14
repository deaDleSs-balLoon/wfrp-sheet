// Highlight Toggle Module - provides highlight button functionality for table rows
// Extends app.js to add row highlighting functionality

(function() {
  'use strict';

  // Initialize after DOM is loaded
  function initHighlightToggleModule() {
    // Click handler for highlight button elements
    function handleHighlightClick(event) {
      // Skip if click is on highlight button itself or its label
      if (event.target.closest('.highlight-toggle') ||
          event.target.closest('label[for*="-hl"]')) {
        return;
      }

      // Get the closest row (tr or th)
      const row = event.target.closest("tr, th");

      if (!row) {
        // Clear all highlights if clicked outside any row
        clearAllHighlights();
        return;
      }

      // Find highlight button in this row
      const hlButton = row.querySelector(".hl-wrapper-checkbox, .hl-charac");

      if (!hlButton) return;

      // Check if this button is already active
      const isAlreadyActive = hlButton.classList.contains("active");

      // Clear all highlights first
      clearAllHighlights();

      // If button was not active, activate it
      if (!isAlreadyActive) {
        hlButton.classList.add("active");
      }
      // If it was active, it's already hidden by clearAllHighlights()
    }

    // Clear all active highlight buttons
    function clearAllHighlights() {
      document.querySelectorAll(".hl-wrapper-checkbox.active, .hl-charac.active")
        .forEach(btn => btn.classList.remove("active"));
    }

    // Attach click handler to document
    document.addEventListener("click", handleHighlightClick);

    console.log("Highlight Toggle Module initialized");
  }

  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHighlightToggleModule);
  } else {
    // DOM already loaded
    initHighlightToggleModule();
  }
})();
