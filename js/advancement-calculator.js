// Advancement Calculator - handles characteristics and skill advancement
// Modifies advancement fields and spent-xp accordingly
// Supports: characteristics by aria-labelledby, skills by *-aug pattern
// Requires: expression-parser.js

(function() {
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

  // Handle advancement field change
  function handleAdvancementChange(event) {
    const field = event.target;
    const isCharacteristic = field.dataset.isCharacteristic === 'true';
    let value = field.value.trim();
    const originalSteps = parseInt(field.dataset.originalValue || "0", 10);

    // Do nothing if empty
    if (!value) {
      field.value = originalSteps;
      return;
    }

    // Parse expression using ExpressionParser
    const result = window.ExpressionParser.parseExpression(value, field.dataset.originalValue || "0");

    if (result === null) {
      // Invalid expression - restore original value and show error
      field.value = originalSteps;
      window.ExpressionParser.showError("Invalid Input",
        "Use: number, +number, -number, or number+/-number\n\nExamples: 5, +2, -1, 10+3");
      return;
    }

    const newSteps = result.value;

    if (newSteps === originalSteps) return;

    // Get XP fields
    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");

    if (!currentXpField || !spentXpField) {
      field.value = originalSteps;
      window.ExpressionParser.showError("Error", "Cannot find XP fields");
      return;
    }

    const currentXp = parseInt(currentXpField.value, 10) || 0;
    const spentXp = parseInt(spentXpField.value, 10) || 0;

    if (newSteps > originalSteps) {
      // ADVANCEMENT: spending XP
      const cost = window.ExpressionParser.getAdvancementCost(originalSteps, newSteps, isCharacteristic);

      // Check if we have enough experience
      if (cost > currentXp) {
        field.value = originalSteps;
        const typeLabel = isCharacteristic ? "characteristic" : "skill";
        window.ExpressionParser.showError("Not Enough Experience",
          `Not enough experience to advance ${typeLabel}.\n\nYou have: ${currentXp} current XP\nCost: ${cost} XP\n\nAvailable for advancement: ${currentXp} XP`);
        return;
      }

      // Apply advancement: deduct from current, add to spent
      currentXpField.value = currentXp - cost;
      spentXpField.value = spentXp + cost;
      field.value = newSteps;

    } else if (newSteps < originalSteps) {
      // REVERSAL: returning XP back
      const refund = window.ExpressionParser.getAdvancementRefund(originalSteps, newSteps, isCharacteristic);

      // Return XP from spent to current
      currentXpField.value = currentXp + refund;
      spentXpField.value = Math.max(0, spentXp - refund);
      field.value = newSteps;
    }

    // Save to storage
    if (typeof saveToStorage === 'function') {
      saveToStorage("current-xp", currentXpField.value);
      saveToStorage("spent-xp", spentXpField.value);
      saveToStorage(field.id, newSteps.toString());
    } else {
      localStorage.setItem("current-xp", currentXpField.value);
      localStorage.setItem("spent-xp", spentXpField.value);
      localStorage.setItem(field.id, newSteps.toString());
    }

    // Update total XP
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }
  }

  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancementCalculator);
  } else {
    initAdvancementCalculator();
  }
})();
