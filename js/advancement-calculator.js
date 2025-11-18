// Advancement Calculator - handles characteristics and skill advancement
// Modifies advancement fields and spent-xp accordingly
// Supports: characteristics by aria-labelledby, skills by *-aug pattern
// Requires: expression-parser.js

(function () {
  'use strict';
  // Initialize after DOM is loaded

  function initAdvancementCalculator() {
    if (!window.ExpressionParser) {
      console.error("Advancement Calculator: ExpressionParser not found");
      return;
    }

    // Find all advancement fields (characteristics: any input with aria-labelledby containing "advances")
    document.querySelectorAll('input[aria-labelledby*="advances"]').forEach(field => {
      attachHandler(field, true);
    });

    // Find all skill augmentation fields (basic skills: *-aug, excluding custom-skill-aug-*)
    document.querySelectorAll('input[id$="-aug"]').forEach(field => {
      if (!field.id.startsWith('custom-skill')) {
        attachHandler(field, false);
      }
    });

    // Find all custom skill augmentation fields (custom-skill-aug-*)
    document.querySelectorAll('input[id^="custom-skill-aug-"]').forEach(field => {
      attachHandler(field, false);
    });

    console.log("Advancement Calculator initialized");
  }

  // Attach handlers to input field
  function attachHandler(field, isCharacteristic) {
    field.addEventListener("focus", (e) => {
      // Save original value on focus
      e.target.dataset.originalValue = e.target.value;
      e.target.dataset.isCharacteristic = isCharacteristic;
    });

    field.addEventListener("change", (e) => {
      handleAdvancementChange(e);
    });
  }

  // Update the display value for a characteristic or skill
  function updateAdvancementDisplay(fieldId, isCharacteristic) {
    if (isCharacteristic) {
      // For characteristics: id format is "CHARACTERISTIC-a"
      // Extract base name: "strength-a" → "strength"
      const baseName = fieldId.replace(/-a$/, '');

      // Find fields
      const iField = document.getElementById(baseName + '-i');
      const aField = document.getElementById(baseName + '-a');
      const currentField = document.getElementById('current-' + baseName);

      if (!iField || !aField || !currentField) {
        console.warn(`Missing fields for characteristic: ${baseName} (i, a, or current-)`);
        return;
      }

      const iValue = parseInt(iField.value, 10) || 0;
      const aValue = parseInt(aField.value, 10) || 0;
      const totalValue = iValue + aValue;
      currentField.value = totalValue;

      if (typeof saveToStorage === 'function') {
        saveToStorage(currentField.id, totalValue.toString());
      }
    } else {
      // For skills: id format is "SKILL-aug"
      // Extract base name: "acrobatics-aug" → "acrobatics"
      const baseName = fieldId.replace(/-aug$/, '');

      // Find fields
      const currentField = document.getElementById(baseName + '-current');
      const augField = document.getElementById(baseName + '-aug');
      const finalField = document.getElementById(baseName + '-final');

      if (!currentField || !augField || !finalField) {
        console.warn(`Missing fields for skill: ${baseName} (current, aug, or final)`);
        return;
      }

      const currentValue = parseInt(currentField.value, 10) || 0;
      const augValue = parseInt(augField.value, 10) || 0;
      const finalValue = currentValue + augValue;
      finalField.value = finalValue;

      if (typeof saveToStorage === 'function') {
        saveToStorage(finalField.id, finalValue.toString());
      }
    }
  }

  // Persist field value to localStorage using either saveToStorage or direct localStorage
  function persistFieldValue(fieldId, value) {
    if (typeof saveToStorage === 'function') {
      saveToStorage(fieldId, value);
    } else {
      localStorage.setItem(fieldId, value);
    }
  }

  // Handle advancement field change
  function handleAdvancementChange(event) {
    const field = event.target;

    // Check if XP fields exist
    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");
    if (!currentXpField || !spentXpField) {
      console.error("Cannot find XP fields");
      return;
    }

    const isCharacteristic = field.dataset.isCharacteristic === 'true';
    let value = field.value.trim();
    const originalSteps = parseInt(field.dataset.originalValue || "0", 10);

    // Prepare default values
    let newSteps = originalSteps;
    let newCurrentXp = parseInt(currentXpField.value, 10) || 0;
    let newSpentXp = parseInt(spentXpField.value, 10) || 0;
    let showErrorModal = null;
    let modalData = {};

    // Process user input
    if (!value) {
      // Empty input - restore original value
      newSteps = originalSteps;
    } else {
      const result = window.ExpressionParser.parseExpression(value, field.dataset.originalValue || "0");

      if (result === null) {
        // Invalid expression
        newSteps = originalSteps;
        showErrorModal = 'modal-advancement-invalid';
      } else {
        newSteps = Math.max(0, result.value);

        // Calculate XP change
        if (newSteps > originalSteps) {
          const cost = window.ExpressionParser.getAdvancementCost(originalSteps, newSteps, isCharacteristic);

          if (cost > newCurrentXp) {
            // Not enough XP
            newSteps = originalSteps;
            showErrorModal = 'modal-advancement-insufficient';
            modalData = {
              current: newCurrentXp,
              cost: cost,
              type: isCharacteristic ? "characteristic" : "skill"
            };
          } else {
            // Spend XP
            newCurrentXp -= cost;
            newSpentXp += cost;
          }
        } else if (newSteps < originalSteps) {
          // Refund XP
          const refund = window.ExpressionParser.getAdvancementRefund(originalSteps, newSteps, isCharacteristic);
          newCurrentXp += refund;
          newSpentXp = Math.max(0, newSpentXp - refund);
        }
        // If newSteps == originalSteps - no changes needed
      }
    }

    // Apply values to all fields
    field.value = newSteps;
    currentXpField.value = newCurrentXp;
    spentXpField.value = newSpentXp;

    // Save to storage using global saveToStorage function
    window.saveToStorage(field.id, newSteps.toString());
    window.saveToStorage("current-xp", newCurrentXp.toString());
    window.saveToStorage("spent-xp", newSpentXp.toString());

    // Update UI
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }

    updateAdvancementDisplay(field.id, isCharacteristic);

    // Show error modal if needed
    if (showErrorModal) {
      window.ExpressionParser.showModal(showErrorModal, modalData);
    }
  }


  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancementCalculator);
  } else {
    initAdvancementCalculator();
  }
})();