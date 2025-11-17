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

const isCharacteristic = field.dataset.isCharacteristic === 'true';

let value = field.value.trim();

const originalSteps = parseInt(field.dataset.originalValue || "0", 10);

// Do nothing if empty

if (!value) {

field.value = originalSteps;

// Immediately persist the original value to localStorage to prevent app.js overwriting

persistFieldValue(field.id, originalSteps.toString());

return;

}

// Parse expression using ExpressionParser

const result = window.ExpressionParser.parseExpression(value, field.dataset.originalValue || "0");

if (result === null) {

// Invalid expression - restore original value

field.value = originalSteps;

// Immediately save the original value to localStorage

persistFieldValue(field.id, originalSteps.toString());

// Show error dialog after storage is secured

window.ExpressionParser.showModal('modal-advancement-invalid');

return;

}

let newSteps = result.value;

// CRITICAL: Clamp to zero if result is negative

newSteps = Math.max(0, newSteps);

if (newSteps === originalSteps) return;

// Get XP fields

const currentXpField = document.getElementById("current-xp");

const spentXpField = document.getElementById("spent-xp");

if (!currentXpField || !spentXpField) {

field.value = originalSteps;

// Persist original value on error

persistFieldValue(field.id, originalSteps.toString());

console.error("Cannot find XP fields");

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

// Persist original value on insufficient experience

persistFieldValue(field.id, originalSteps.toString());

const typeLabel = isCharacteristic ? "characteristic" : "skill";

window.ExpressionParser.showModal('modal-advancement-insufficient', {

current: currentXp,

cost: cost,

type: typeLabel

});

return;

}

// Apply advancement: deduct from current, add to spent

const newCurrentXp = currentXp - cost;

const newSpentXp = spentXp + cost;

currentXpField.value = newCurrentXp;

spentXpField.value = newSpentXp;

field.value = newSteps;

// Save to storage ONLY if successful

if (typeof saveToStorage === 'function') {

saveToStorage("current-xp", newCurrentXp.toString());

saveToStorage("spent-xp", newSpentXp.toString());

saveToStorage(field.id, newSteps.toString());

} else {

localStorage.setItem("current-xp", newCurrentXp.toString());

localStorage.setItem("spent-xp", newSpentXp.toString());

localStorage.setItem(field.id, newSteps.toString());

}

} else if (newSteps < originalSteps) {

// REVERSAL: returning XP back

const refund = window.ExpressionParser.getAdvancementRefund(originalSteps, newSteps, isCharacteristic);

// Return XP from spent to current

const newCurrentXp = currentXp + refund;

const newSpentXp = Math.max(0, spentXp - refund);

currentXpField.value = newCurrentXp;

spentXpField.value = newSpentXp;

field.value = newSteps;

// Save to storage

if (typeof saveToStorage === 'function') {

saveToStorage("current-xp", newCurrentXp.toString());

saveToStorage("spent-xp", newSpentXp.toString());

saveToStorage(field.id, newSteps.toString());

} else {

localStorage.setItem("current-xp", newCurrentXp.toString());

localStorage.setItem("spent-xp", newSpentXp.toString());

localStorage.setItem(field.id, newSteps.toString());

}

}

// Update total XP

if (window.updateTotalXp) {

window.updateTotalXp();

}

// Update the display value of this characteristic/skill immediately

updateAdvancementDisplay(field.id, isCharacteristic);

}

// Automatic initialization when DOM is loaded

if (document.readyState === 'loading') {

document.addEventListener('DOMContentLoaded', initAdvancementCalculator);

} else {

initAdvancementCalculator();

}

})();