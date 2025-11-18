// Core Expression Parser

// Handles expression parsing and modal display

// Works with pre-rendered Liquid modal templates with i18n

// CRITICAL: Cost calculation is based on THE STEP BEING COMPLETED, not the step being left

(function () {
  'use strict';
  let ADVANCEMENT_COSTS = [];

  async function loadAdvancementCosts() {
    try {
      const response = await fetch('../data/advancement-costs.json');
      const data = await response.json();
      ADVANCEMENT_COSTS = data.advancementCosts;
    } catch (error) {
      // Fallback to hardcoded
      ADVANCEMENT_COSTS = [
        { stepsFrom: 0, stepsTo: 5, characteristicCost: 25, skillCost: 10 },
        { stepsFrom: 6, stepsTo: 10, characteristicCost: 30, skillCost: 15 },
        { stepsFrom: 11, stepsTo: 15, characteristicCost: 40, skillCost: 20 },
        { stepsFrom: 16, stepsTo: 20, characteristicCost: 50, skillCost: 30 },
        { stepsFrom: 21, stepsTo: 25, characteristicCost: 70, skillCost: 40 },
        { stepsFrom: 26, stepsTo: 30, characteristicCost: 90, skillCost: 60 },
        { stepsFrom: 31, stepsTo: 35, characteristicCost: 120, skillCost: 80 },
        { stepsFrom: 36, stepsTo: 40, characteristicCost: 150, skillCost: 110 },
        { stepsFrom: 41, stepsTo: 45, characteristicCost: 190, skillCost: 140 },
        { stepsFrom: 46, stepsTo: 50, characteristicCost: 230, skillCost: 180 },
        { stepsFrom: 51, stepsTo: 55, characteristicCost: 280, skillCost: 220 },
        { stepsFrom: 56, stepsTo: 60, characteristicCost: 330, skillCost: 270 },
        { stepsFrom: 61, stepsTo: 65, characteristicCost: 390, skillCost: 320 },
        { stepsFrom: 66, stepsTo: 70, characteristicCost: 450, skillCost: 380 },
        { stepsFrom: 71, stepsTo: 999, characteristicCost: 520, skillCost: 440 }
      ];
    }
  }

  // Get cost for completing a specific step number
  // This is the cost to ACHIEVE step N (not the cost to leave it)
  // Example: getCostForStep(6, true) = cost to COMPLETE the 6th step = 30
  // getCostForStep(5, true) = cost to COMPLETE the 5th step = 25
  function getCostForStep(stepNumber, isCharacteristic) {
    const costKey = isCharacteristic ? 'characteristicCost' : 'skillCost';
    // Find which bracket this step belongs to
    for (let row of ADVANCEMENT_COSTS) {
      if (stepNumber >= row.stepsFrom && stepNumber <= row.stepsTo) {
        return row[costKey];
      }
    }

    return ADVANCEMENT_COSTS[ADVANCEMENT_COSTS.length - 1][costKey];
  }

  // Calculate total cost to advance from currentSteps to newSteps
  // Example: getAdvancementCost(1, 7, true)
  // Steps to complete: 2, 3, 4, 5, 6, 7
  // Costs: 25 + 25 + 25 + 25 + 30 + 30 = 160
  function getAdvancementCost(currentSteps, newSteps, isCharacteristic) {
    if (newSteps <= currentSteps) return 0;
    let totalCost = 0;
    // We complete steps from (currentSteps + 1) to newSteps inclusive
    for (let step = currentSteps + 1; step <= newSteps; step++) {
      totalCost += getCostForStep(step, isCharacteristic);
    }
    return totalCost;
  }

  // Calculate refund for going back from currentSteps to newSteps
  // Example: getAdvancementRefund(7, 5, true)
  // We remove steps: 7, 6
  // Costs: 30 + 30 = 60
  function getAdvancementRefund(currentSteps, newSteps, isCharacteristic) {
    if (newSteps >= currentSteps) return 0;
    let totalRefund = 0;
    // We remove steps from currentSteps down to (newSteps + 1) inclusive
    for (let step = currentSteps; step > newSteps; step--) {
      totalRefund += getCostForStep(step, isCharacteristic);
    }
    return totalRefund;
  }

  function parseExpression(value, currentFieldValue) {
    const cleaned = value.trim();
    // Absolute value: any positive number (not negative, as negative numbers are expressions)
    // Matches: 1, 42, 99
    if (/^\d+$/.test(cleaned)) {
      return { type: "absolute", value: parseInt(cleaned, 10) };
    }

    // Shortform with operator: +/- followed by digits
    // Matches: +5, -10
    const shortformMatch = cleaned.match(/^([+\-])(\d+)$/);
    if (shortformMatch) {
      const operator = shortformMatch[1];
      const operand = parseInt(shortformMatch[2], 10);
      const current = parseInt(currentFieldValue, 10) || 0;
      const resultValue = operator === "+" ? current + operand : current - operand;
      if (resultValue < 0) return { type: "shortform", value: 0 };
      // Clamp to zero if result is negative
      return { type: "shortform", value: Math.max(0, resultValue) };
    }

    // Fullform with two numbers and operator: number +/- number
    // Matches: 5 + 3, 10-2, 7 - 4
    const fullformMatch = cleaned.match(/^(\d+)\s*([\+\-])\s*(\d+)$/);
    if (fullformMatch) {
      const left = parseInt(fullformMatch[1], 10);
      const operator = fullformMatch[2];
      const right = parseInt(fullformMatch[3], 10);
      const resultValue = operator === "+" ? left + right : left - right;
      // Clamp to zero if result is negative
      return { type: "fullform", value: Math.max(0, resultValue) };
    }

    return null;
  }

  // Show modal by ID with variable substitution
  function showModal(modalId, variables = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return;
    }

    if (Object.keys(variables).length > 0) {
      const messageEl = modal.querySelector('.xp-error-message');
      if (messageEl) {
        let templateText = messageEl.dataset.template;
        if (!templateText) {
          templateText = messageEl.textContent;
          messageEl.dataset.template = templateText;
        }
        let finalText = templateText;
        Object.entries(variables).forEach(([key, value]) => {
          finalText = finalText.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
        messageEl.textContent = finalText;
      }
    }

    modal.style.display = 'flex';
  }

  function showError(titleText, messageText) {
    console.warn("showError() called with hardcoded strings. Consider using showModal() with i18n templates.");
    alert(titleText + "\n\n" + messageText);
  }

  window.ExpressionParser = {
    parseExpression: parseExpression,
    showModal: showModal,
    showError: showError,
    getAdvancementCost: getAdvancementCost,
    getAdvancementRefund: getAdvancementRefund,
    getCostForStep: getCostForStep,
    loadAdvancementCosts: loadAdvancementCosts
  };
  loadAdvancementCosts();
  console.log("Expression Parser initialized");
})();