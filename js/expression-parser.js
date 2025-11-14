// Core Expression Parser & Calculator - shared utilities for all field calculators
// Exports: parseExpression, showError, getAdvancementCost

(function() {
  'use strict';

  // Error modal element (shared)
  let errorModalElement = null;

  // Advancement cost table [steps_from, steps_to, characteristic_cost, skill_cost]
  const ADVANCEMENT_COSTS = [
    [0, 5, 25, 10],
    [6, 10, 30, 15],
    [11, 15, 40, 20],
    [16, 20, 50, 30],
    [21, 25, 70, 40],
    [26, 30, 90, 60],
    [31, 35, 120, 80],
    [36, 40, 150, 110],
    [41, 45, 190, 140],
    [46, 50, 230, 180],
    [51, 55, 280, 220],
    [56, 60, 330, 270],
    [61, 65, 390, 320],
    [66, 70, 450, 380],
    [71, Infinity, 520, 440]
  ];

  // Get cost for one step at given level
  function getCostForStep(stepNumber, isCharacteristic) {
    const costIndex = isCharacteristic ? 2 : 3;
    for (let row of ADVANCEMENT_COSTS) {
      if (stepNumber >= row[0] && stepNumber <= row[1]) {
        return row[costIndex];
      }
    }
    return ADVANCEMENT_COSTS[ADVANCEMENT_COSTS.length - 1][costIndex];
  }

  // Calculate total cost to advance from currentSteps to newSteps
  function getAdvancementCost(currentSteps, newSteps, isCharacteristic) {
    if (newSteps <= currentSteps) return 0;
    
    let totalCost = 0;
    for (let step = currentSteps; step < newSteps; step++) {
      totalCost += getCostForStep(step, isCharacteristic);
    }
    return totalCost;
  }

  // Calculate refund (negative difference)
  function getAdvancementRefund(currentSteps, newSteps, isCharacteristic) {
    if (newSteps >= currentSteps) return 0;
    
    let totalRefund = 0;
    for (let step = newSteps; step < currentSteps; step++) {
      totalRefund += getCostForStep(step, isCharacteristic);
    }
    return totalRefund;
  }

  // Parse expression: number, +number, -number, or number+number
  // For number inputs, also support expressions like "5+1"
  function parseExpression(value, currentFieldValue) {
    const cleaned = value.trim();

    // Format 1: Plain number (absolute value)
    if (/^\d+$/.test(cleaned)) {
      return {
        type: "absolute",
        value: parseInt(cleaned, 10)
      };
    }

    // Format 2: Shortform expression (+10 or -20)
    const shortformMatch = cleaned.match(/^([+\-])(\d+)$/);
    if (shortformMatch) {
      const operator = shortformMatch[1];
      const operand = parseInt(shortformMatch[2], 10);
      const current = parseInt(currentFieldValue, 10) || 0;

      let resultValue;
      if (operator === "+") {
        resultValue = current + operand;
      } else {
        resultValue = current - operand;
      }

      return {
        type: "shortform",
        value: Math.max(0, resultValue)
      };
    }

    // Format 3: Full expression (100+10 or 100-20)
    const fullformMatch = cleaned.match(/^(\d+)\s*([+\-])\s*(\d+)$/);
    if (fullformMatch) {
      const left = parseInt(fullformMatch[1], 10);
      const operator = fullformMatch[2];
      const right = parseInt(fullformMatch[3], 10);

      let resultValue;
      if (operator === "+") {
        resultValue = left + right;
      } else {
        resultValue = left - right;
      }

      return {
        type: "fullform",
        value: Math.max(0, resultValue)
      };
    }

    // Invalid expression
    return null;
  }

  // Initialize error modal
  function initErrorModal() {
    if (!errorModalElement) {
      errorModalElement = document.createElement('div');
      errorModalElement.className = 'xp-error-modal';
      errorModalElement.innerHTML = `
        <div class="xp-error-dialog">
          <div class="xp-error-title" id="error-title">Error</div>
          <div class="xp-error-message" id="error-message"></div>
          <button class="xp-error-close-btn" id="error-close">Close</button>
        </div>
      `;
      document.body.appendChild(errorModalElement);

      document.getElementById('error-close').addEventListener('click', () => {
        errorModalElement.classList.remove('active');
      });

      errorModalElement.addEventListener('click', (e) => {
        if (e.target === errorModalElement) {
          errorModalElement.classList.remove('active');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && errorModalElement.classList.contains('active')) {
          errorModalElement.classList.remove('active');
        }
      });
    }
  }

  // Show error modal
  function showError(title, message) {
    if (!errorModalElement) {
      initErrorModal();
    }
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    errorModalElement.classList.add('active');
  }

  // Export functions to global scope
  window.ExpressionParser = {
    parseExpression: parseExpression,
    showError: showError,
    getAdvancementCost: getAdvancementCost,
    getAdvancementRefund: getAdvancementRefund
  };

  console.log("Expression Parser & Calculator initialized");
})();
