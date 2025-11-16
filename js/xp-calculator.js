// XP Calculator Module - extends app.js with XP field calculation functionality
// Handles current-xp and spent-xp fields
// Requires: expression-parser.js

(function() {
  'use strict';

  // Initialize after DOM is loaded
  function initXpCalculator() {
    const currentXpInput = document.getElementById("current-xp");
    const spentXpInput = document.getElementById("spent-xp");

    if (!currentXpInput || !spentXpInput) {
      console.warn("XP Calculator: XP fields not found");
      return;
    }

    // Attach handlers
    attachHandler(currentXpInput);
    attachHandler(spentXpInput);

    console.log("XP Calculator initialized");
  }

  // Attach change handler to input field
  function attachHandler(field) {
    field.addEventListener("focus", (e) => {
      // Save original value on focus
      e.target.dataset.originalValue = e.target.value;
    });

    field.addEventListener("change", (e) => {
      handleXpFieldChange(e);
    });
  }

  // Handle XP field change
  function handleXpFieldChange(event) {
    const field = event.target;
    let value = field.value.trim();
    const originalValue = parseInt(field.dataset.originalValue || "0", 10);

    // Do nothing if empty
    if (!value) return;

    // Parse expression using ExpressionParser
    if (!window.ExpressionParser) {
      console.error("ExpressionParser not found");
      return;
    }

    const result = window.ExpressionParser.parseExpression(value, field.dataset.originalValue || "0");

    if (result === null) {
      // Invalid expression
      field.value = originalValue;
      if (window.updateTotalXp) {
        window.updateTotalXp();
      }
      window.ExpressionParser.showError("Invalid Input", 
        "Use: number, +number, -number, or number+/-number\n\nExamples: 100, +10, -5, 100+20");
      return;
    }

    const newValue = result.value;

    if (field.id === "current-xp") {
      handleCurrentXpChange(field, newValue);
    } else if (field.id === "spent-xp") {
      handleSpentXpChange(field, originalValue, newValue);
    }
  }

  // Handle current-xp field change
  function handleCurrentXpChange(field, newValue) {
    field.value = newValue;

    // Save to storage
    if (typeof saveToStorage === 'function') {
      saveToStorage("current-xp", newValue.toString());
    } else {
      localStorage.setItem("current-xp", newValue.toString());
    }

    // Update total
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }
  }

  // Handle spent-xp field change
  function handleSpentXpChange(field, originalValue, newValue) {
    const currentXpField = document.getElementById("current-xp");
    if (!currentXpField) return;

    const oldSpentValue = originalValue;
    const currentValue = parseInt(currentXpField.value, 10) || 0;
    const diff = newValue - oldSpentValue;

    // Validate: cannot spend more than current XP
    if (diff > 0) {
      if (diff > currentValue) {
        // Not enough experience
        field.value = oldSpentValue;
        if (typeof saveToStorage === 'function') {
          saveToStorage("spent-xp", oldSpentValue.toString());
        } else {
          localStorage.setItem("spent-xp", oldSpentValue.toString());
        }
        if (window.updateTotalXp) {
          window.updateTotalXp();
        }
        window.ExpressionParser.showError("Not Enough Experience",
          `Not enough current experience to spend.\n\nYou have: ${currentValue} current XP\nYou are trying to add: ${diff} XP to spent\n\nMaximum new spent value: ${currentValue} XP`);
        return;
      }

      // Deduct from current, add to spent
      currentXpField.value = currentValue - diff;
      field.value = newValue;
    } else if (diff < 0) {
      // Refunding experience
      const refund = Math.abs(diff);
      currentXpField.value = currentValue + refund;
      field.value = newValue;
    } else {
      // No difference
      field.value = newValue;
    }

    // Save to storage
    if (typeof saveToStorage === 'function') {
      saveToStorage("current-xp", currentXpField.value);
      saveToStorage("spent-xp", field.value);
    } else {
      localStorage.setItem("current-xp", currentXpField.value);
      localStorage.setItem("spent-xp", field.value);
    }

    // Update total
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }
  }

  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXpCalculator);
  } else {
    initXpCalculator();
  }
})();
