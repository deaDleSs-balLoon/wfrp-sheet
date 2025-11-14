// XP Calculator Module - extends app.js with XP field calculation functionality
// Adds support for three input formats in current-xp and spent-xp fields

(function() {
  'use strict';

  // Initialize after DOM is loaded
  function initXpCalculator() {
    const currentXpInput = document.getElementById("current-xp");
    const spentXpInput = document.getElementById("spent-xp");

    if (!currentXpInput || !spentXpInput) {
      console.warn("XP Calculator: current-xp or spent-xp fields not found");
      return;
    }

    // Handler for XP fields supporting three formats: absolute value, shortform (+/-N), fullform (N+/-M)
    function handleExperienceExpression(event) {
      const input = event.target;
      let value = input.value.trim();

      // Do nothing if empty
      if (!value) return;

      let result;

      // Format 1: Plain number (absolute value)
      if (/^\d+$/.test(value)) {
        result = {
          type: "absolute",
          value: parseInt(value, 10)
        };
      }
      // Format 2: Expression (contains + or -)
      else if (value.includes("+") || value.includes("-")) {
        result = parseExpression(value, input.dataset.originalValue || "0");
        if (result === null) {
          // Invalid expression
          console.warn("Invalid expression:", value);
          input.classList.add("error");
          setTimeout(() => input.classList.remove("error"), 1500);
          input.value = input.dataset.originalValue || "";
          return;
        }
      }
      // Format 3: Invalid input
      else {
        console.warn("Invalid input:", value);
        input.classList.add("error");
        setTimeout(() => input.classList.remove("error"), 1500);
        input.value = input.dataset.originalValue || "";
        return;
      }

      // Apply result based on field type
      if (input.id === "current-xp") {
        handleCurrentXpResult(result);
      } else if (input.id === "spent-xp") {
        handleSpentXpResult(result, input.dataset.originalValue);
      }
    }

    // Parse XP expressions
    function parseExpression(expression, currentFieldValue) {
      const cleaned = expression.trim();

      // Format 1: Starts with operator (+10 or -20)
      const startsWithOperatorMatch = cleaned.match(/^([+\-])(\d+)$/);
      if (startsWithOperatorMatch) {
        const operator = startsWithOperatorMatch[1];
        const operand = parseInt(startsWithOperatorMatch[2], 10);
        const current = parseInt(currentFieldValue, 10) || 0;

        let resultValue;
        if (operator === "+") {
          resultValue = current + operand;
        } else {
          resultValue = current - operand;
        }

        return {
          type: "shortform",
          currentValue: current,
          operator: operator,
          operand: operand,
          value: Math.max(0, resultValue)
        };
      }

      // Format 2: Full expression (100+10 or 100-20)
      const fullExpressionMatch = cleaned.match(/^(\d+)\s*([+\-])\s*(\d+)$/);
      if (fullExpressionMatch) {
        const left = parseInt(fullExpressionMatch[1], 10);
        const operator = fullExpressionMatch[2];
        const right = parseInt(fullExpressionMatch[3], 10);

        let resultValue;
        if (operator === "+") {
          resultValue = left + right;
        } else {
          resultValue = left - right;
        }

        return {
          type: "fullform",
          originalLeft: left,
          operator: operator,
          right: right,
          value: Math.max(0, resultValue)
        };
      }

      // Invalid expression
      return null;
    }

    // Handle current-xp calculation result
    function handleCurrentXpResult(result) {
      const currentInput = document.getElementById("current-xp");

      if (!currentInput) return;

      // Set new value
      currentInput.value = result.value;

      // Save only computed value (not expressions)
      if (typeof saveToStorage === 'function') {
        saveToStorage("current-xp", result.value.toString());
      } else {
        localStorage.setItem("current-xp", result.value.toString());
      }

      // Update total-xp
      if (window.updateTotalXp) {
        window.updateTotalXp();
      }
    }

    // Handle spent-xp calculation result
    function handleSpentXpResult(result, originalValue) {
      const currentInput = document.getElementById("current-xp");
      const spentInput = document.getElementById("spent-xp");

      if (!currentInput || !spentInput) return;

      // Original spent value before editing
      const oldSpentValue = parseInt(spentInput.dataset.originalValue, 10) || 0;
      const currentValue = parseInt(currentInput.value, 10) || 0;
      const newSpentValue = result.value;

      // Calculate difference from oldSpentValue ONLY
      const diff = newSpentValue - oldSpentValue;

      // Apply difference to current-xp
      if (diff > 0) {
        // Spending experience: subtract from current, add to spent
        if (diff > currentValue) {
          console.warn(`Not enough experience. Current: ${currentValue}, trying to spend: ${diff}`);
          spentInput.classList.add("error");
          setTimeout(() => spentInput.classList.remove("error"), 1500);
          spentInput.value = oldSpentValue;
          return;
        }

        currentInput.value = currentValue - diff;
        spentInput.value = newSpentValue;
      } else if (diff < 0) {
        // Refunding experience: add to current, subtract from spent
        const refund = Math.abs(diff);

        currentInput.value = currentValue + refund;
        spentInput.value = newSpentValue;
      } else {
        // No difference - nothing changes
        spentInput.value = newSpentValue;
      }

      // Save only computed values (not expressions!)
      if (typeof saveToStorage === 'function') {
        saveToStorage("current-xp", currentInput.value);
        saveToStorage("spent-xp", spentInput.value);
      } else {
        localStorage.setItem("current-xp", currentInput.value);
        localStorage.setItem("spent-xp", spentInput.value);
      }

      // Manually update total-xp after changing both values
      if (window.updateTotalXp) {
        window.updateTotalXp();
      }
    }

    // Attach event handlers
    if (currentXpInput) {
      currentXpInput.addEventListener("focus", (e) => {
        // Save original value on focus
        e.target.dataset.originalValue = e.target.value;
      });
      currentXpInput.addEventListener("change", handleExperienceExpression);
    }

    if (spentXpInput) {
      spentXpInput.addEventListener("focus", (e) => {
        // Save original value on focus
        e.target.dataset.originalValue = e.target.value;
      });
      spentXpInput.addEventListener("change", handleExperienceExpression);
    }

    // Initial total-xp update when module loads
    // Ensures total is recalculated after fillFromStorage() in app.js
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }

    // Disable auto-update of total-xp after initialization
    // Removes 'for' attribute so browser won't update automatically anymore
    // Now only our code controls the updates
    if (window.disableTotalXpAutoUpdate) {
      window.disableTotalXpAutoUpdate();
    }

    console.log("XP Calculator initialized");
  }

  // Automatic initialization when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXpCalculator);
  } else {
    // DOM already loaded
    initXpCalculator();
  }
})();
