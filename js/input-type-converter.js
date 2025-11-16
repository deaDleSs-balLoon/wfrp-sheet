// Input Type Converter
// Converts expression-enabled fields from type="number" to type="text"
// Allows inputs like "+2", "-1", "5+3" for XP fields and advancement fields
// Load this early in the script chain, before calculators

(function() {
  'use strict';

  function convertInputTypes() {
    // ===== XP FIELDS =====
    // Convert current-xp and spent-xp fields
    const xpFields = ['current-xp', 'spent-xp'];
    xpFields.forEach(id => {
      const field = document.getElementById(id);
      if (field && field.type === 'number') {
        field.type = 'text';
        field.inputMode = 'numeric';
        console.debug('Converted XP field to text:', id);
      }
    });

    // ===== ADVANCEMENT FIELDS =====
    // Convert CHARACTERISTIC advancement fields
    // Pattern: input with aria-labelledby containing "advances"
    document.querySelectorAll('input[type="number"][aria-labelledby*="advances"]').forEach(field => {
      field.type = 'text';
      field.inputMode = 'numeric';
      console.debug('Converted characteristic field to text:', field.id || field.name);
    });

    // Convert SKILL augmentation fields
    // Pattern: input with id ending in "-aug"
    document.querySelectorAll('input[type="number"][id$="-aug"]').forEach(field => {
      if (!field.id.startsWith('custom-skill')) {
        field.type = 'text';
        field.inputMode = 'numeric';
        console.debug('Converted skill field to text:', field.id);
      }
    });

    // Convert CUSTOM SKILL augmentation fields
    // Pattern: input with id starting with "custom-skill-aug-"
    document.querySelectorAll('input[type="number"][id^="custom-skill-aug-"]').forEach(field => {
      field.type = 'text';
      field.inputMode = 'numeric';
      console.debug('Converted custom skill field to text:', field.id);
    });

    console.log('Input type conversion completed');
  }

  // Wait for DOM or convert immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', convertInputTypes);
  } else {
    convertInputTypes();
  }
})();
