// Advancement Calculator with Template System
(function () {
  'use strict';

  let currentPreviews = [];
  let originalValues = {};
  let currentField = null;

  // Template cache
  const templates = {
    // Main tooltips
    cost: null,
    refund: null,
    nochange: null,
    // Error tooltips
    errorInvalid: null,
    errorXpFields: null,
    errorInsufficient: null,
    // Value tooltip
    value: null
  };

  function initAdvancementCalculator() {
    if (!window.ExpressionParser) {
      console.error("Advancement Calculator: ExpressionParser not found");
      return;
    }

    // Cache templates
    cacheTemplates();

    // Find all advancement fields
    document.querySelectorAll('input[aria-labelledby*="advances"]').forEach(field => {
      attachHandler(field, true);
    });

    document.querySelectorAll('input[id$="-aug"]').forEach(field => {
      if (!field.id.startsWith('custom-skill')) {
        attachHandler(field, false);
      }
    });

    document.querySelectorAll('input[id^="custom-skill-aug-"]').forEach(field => {
      attachHandler(field, false);
    });

    console.log("Advancement Calculator initialized");
  }

  function cacheTemplates() {
    // Main tooltips
    templates.cost = document.getElementById('preview-tooltip-cost');
    templates.refund = document.getElementById('preview-tooltip-refund');
    templates.nochange = document.getElementById('preview-tooltip-nochange');
    // Error tooltips
    templates.errorInvalid = document.getElementById('preview-tooltip-error-invalid');
    templates.errorXpFields = document.getElementById('preview-tooltip-error-xpfields');
    templates.errorInsufficient = document.getElementById('preview-tooltip-error-insufficient');
    // Value tooltip
    templates.value = document.getElementById('preview-tooltip-value');

    // Check if all templates are loaded
    const missingTemplates = Object.entries(templates).filter(([name, template]) => !template).map(([name]) => name);
    if (missingTemplates.length > 0) {
      console.warn("Missing templates:", missingTemplates);
    }
  }

  function createTooltipFromTemplate(templateName, referenceElement, isMainTooltip = false, additionalClass = '') {
      const template = templates[templateName];
      if (!template) {
          console.error(`Template ${templateName} not found`);
          return null;
      }

      // Remove old tooltip of the same type
      const oldTooltip = document.querySelector('.preview-tooltip-content.' + (isMainTooltip ? 'main-tooltip' : 'value-tooltip'));
      if (oldTooltip) {
          oldTooltip.remove();
      }
      
      // Clone the template content
      const tooltip = template.content.cloneNode(true);
      const contentElement = tooltip.firstElementChild;
      
      // Add positioning class based on tooltip type
      if (isMainTooltip) {
          contentElement.classList.add('main-tooltip');
      } else {
          contentElement.classList.add('value-tooltip');
          if (additionalClass) {
              contentElement.classList.add(additionalClass);
          }
      }
      
      // Append to body for fixed positioning
      document.body.appendChild(contentElement);
      
      // Принудительно применяем стили ДО позиционирования
      void contentElement.offsetWidth;
      
      // Position the tooltip (пока без контента)
      positionTooltip(contentElement, referenceElement, isMainTooltip);
      
      currentPreviews.push(contentElement);
      
      console.log('Tooltip created (before content):', {
          id: referenceElement.id,
          type: isMainTooltip ? 'main' : 'value', 
          size: contentElement.getBoundingClientRect(),
          html: contentElement.innerHTML
      });
      
      return contentElement;
  }

  function positionTooltip(tooltip, referenceElement, isMainTooltip = false) {
      if (!tooltip || !referenceElement) {
          console.log('❌ Cannot position tooltip - missing element');
          return;
      }

      const rect = referenceElement.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
      };

      console.log('Positioning tooltip for:', referenceElement.id);
      console.log('Reference element rect:', rect);
      console.log('Tooltip rect:', tooltipRect);
      console.log('Viewport:', viewport);

      let top, left;

      if (isMainTooltip) {
          // Position main tooltip above the input field
          top = rect.top - tooltipRect.height - 8;
          left = rect.left;

          // Adjust if tooltip goes above viewport
          if (top < 10) {
              top = rect.bottom + 8; // Show below instead
          }
      } else {
          // Position value tooltip above the field (for XP fields) or to the right (for values)
          const isXpField = referenceElement.id.includes('xp');

          if (isXpField) {
              // For XP fields - position above
              top = rect.top - tooltipRect.height - 8;
              left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

              // Adjust if goes above viewport
              if (top < 10) {
                  top = rect.bottom + 8;
              }
          } else {
              // For value fields - position to the right
              top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
              left = rect.right + 8;

              // Adjust if goes beyond right edge
              if (left + tooltipRect.width > viewport.width - 10) {
                  left = rect.left - tooltipRect.width - 8;
              }
          }

          // Adjust vertical position if needed
          if (top < 10) {
              top = 10;
          } else if (top + tooltipRect.height > viewport.height - 10) {
              top = viewport.height - tooltipRect.height - 10;
          }
      }

      // Adjust horizontal position if needed
      if (left < 10) {
          left = 10;
      } else if (left + tooltipRect.width > viewport.width - 10) {
          left = viewport.width - tooltipRect.width - 10;
      }

      tooltip.style.top = Math.max(10, top) + 'px';
      tooltip.style.left = Math.max(10, left) + 'px';

      console.log('Final tooltip position:', { top: tooltip.style.top, left: tooltip.style.left });
  }

  function showPreview(field, inputValue) {
    hidePreview();
    currentField = field;

    const preview = calculatePreview(field, inputValue);

    if (!preview.isValid) {
      showInvalidPreview(field, inputValue, preview);
      return;
    }

    showMainTooltip(field, preview);
    showValueTooltips(preview);

    if (!originalValues[field.id]) {
      originalValues[field.id] = {
        value: field.dataset.originalValue,
        originalValue: field.dataset.originalValue,
        rawValue: field.value
      };
    }
  }

  function showMainTooltip(field, preview) {
      let templateName;
      
      // Choose the right template based on XP change
      if (preview.xpChange > 0) {
          templateName = 'cost';
      } else if (preview.xpChange < 0) {
          templateName = 'refund';
      } else {
          templateName = 'nochange';
      }
      
      const tooltip = createTooltipFromTemplate(templateName, field, true);
      if (!tooltip) return;
      
      // Update dynamic content
      const mainValue = tooltip.querySelector('.preview-main-value');
      const costElement = tooltip.querySelector('.preview-cost');
      
      if (mainValue) mainValue.textContent = preview.newSteps;
      
      // Update cost text with actual XP values
      if (costElement && preview.xpChange !== 0) {
          const xpValue = Math.abs(preview.xpChange);
          // Get the translated text and replace placeholder
          let costText = costElement.textContent || costElement.innerText;
          console.log('Original cost text:', costText);
          
          // Replace {{xp}} placeholder with actual value
          costText = costText.replace('{{xp}}', xpValue);
          costElement.textContent = costText;
          console.log('Updated cost text:', costText, 'with XP:', xpValue);
      } else if (costElement) {
          console.log('Cost element found but no XP change:', costElement.textContent);
      }
      
      // Add event listeners
      const okButton = tooltip.querySelector('.preview-btn.ok');
      if (okButton) {
          okButton.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              applyChanges(field, preview);
          });
      }
      
      const cancelButton = tooltip.querySelector('.preview-btn.cancel');
      if (cancelButton) {
          cancelButton.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              cancelPreview(field);
          });
      }
  }

  function showInvalidPreview(field, inputValue, preview) {
    let templateName;

    // Choose the right error template
    switch (preview.error) {
        case 'invalid_expression':
            templateName = 'errorInvalid';
            break;
        case 'xp_fields_not_found':
            templateName = 'errorXpFields';
            break;
        case 'insufficient_xp':
            templateName = 'errorInsufficient';
            break;
        default:
            templateName = 'errorInvalid';
    }

    const tooltip = createTooltipFromTemplate(templateName, field, true);
    if (!tooltip) return;

    // Update dynamic content
    const mainValue = tooltip.querySelector('.preview-main-value');
    const errorElement = tooltip.querySelector('.preview-error');

    if (mainValue) mainValue.textContent = inputValue;

    // Update error message with actual values for insufficient XP
    if (preview.error === 'insufficient_xp' && errorElement) {
        const currentXpField = document.getElementById("current-xp");
        const currentXp = currentXpField ? parseInt(currentXpField.value, 10) || 0 : 0;

        let errorText = errorElement.textContent;
        errorText = errorText.replace('{{xp}}', preview.xpChange);
        errorText = errorText.replace('{{current}}', currentXp);
        errorElement.textContent = errorText;
    }

    tooltip.querySelector('.preview-btn.cancel').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cancelPreview(field);
    });

    if (!originalValues[field.id]) {
        originalValues[field.id] = {
            value: field.dataset.originalValue,
            originalValue: field.dataset.originalValue,
            rawValue: field.value
        };
    }
  }

  function showValueTooltips(preview) {
      const currentValueDisplay = getCurrentValueDisplay(
          preview.fieldId, 
          preview.isCharacteristic, 
          preview.newSteps
      );
      
      console.log('=== DEBUG VALUE TOOLTIPS ===');
      console.log('Field ID:', preview.fieldId);
      console.log('Is characteristic:', preview.isCharacteristic);
      console.log('New steps:', preview.newSteps);
      console.log('Calculated value:', currentValueDisplay);
      
      // Show tooltip for final value
      let valueField = null;
      let fieldType = '';
      
      if (preview.isCharacteristic) {
          const baseName = preview.fieldId.replace(/-a$/, '');
          valueField = document.getElementById(`current-${baseName}`);
          fieldType = 'characteristic';
      } else {
          const baseName = preview.fieldId.replace(/-aug$/, '');
          valueField = document.getElementById(`${baseName}-final`);
          fieldType = 'skill';
          
          // For professional skills
          if (!valueField && baseName.startsWith('custom-skill-')) {
              const skillNumber = baseName.replace('custom-skill-', '');
              valueField = document.getElementById(`custom-skill-current-${skillNumber}`);
              fieldType = 'custom skill';
          }
      }
      
      if (valueField) {
          console.log('✅ Found value field:', valueField.id, 'Type:', fieldType);
          
          const tooltip = createTooltipFromTemplate('value', valueField, false);
          if (tooltip) {
              console.log('✅ Tooltip created successfully');
              
              // ОБНОВЛЯЕМ ЗНАЧЕНИЕ В ТУЛТИПЕ
              const valueElement = tooltip.querySelector('.preview-simple-value');
              if (valueElement) {
                  valueElement.textContent = currentValueDisplay;
                  console.log('✅ Set value tooltip content to:', currentValueDisplay);
                  
                  // Принудительно обновляем стили после изменения контента
                  void tooltip.offsetWidth;
                  
                  // Перепозиционируем тултип с учетом нового размера
                  positionTooltip(tooltip, valueField, false);
              } else {
                  console.log('❌ Value element not found in tooltip');
                  console.log('Tooltip HTML:', tooltip.innerHTML);
              }
          } else {
              console.log('❌ Failed to create tooltip');
          }
      } else {
          console.log('❌ Value field not found for:', preview.fieldId, 'Type:', fieldType);
      }

      // Show tooltips for XP fields
      const currentXpField = document.getElementById("current-xp");
      if (currentXpField) {
          console.log('Creating XP tooltip for current-xp');
          const additionalClass = preview.newCurrentXp < 0 ? 'negative' : 'xp-tooltip';
          const tooltip = createTooltipFromTemplate('value', currentXpField, false, additionalClass);
          if (tooltip) {
              const valueElement = tooltip.querySelector('.preview-simple-value');
              if (valueElement) {
                  valueElement.textContent = preview.newCurrentXp;
                  // Перепозиционируем после обновления контента
                  void tooltip.offsetWidth;
                  positionTooltip(tooltip, currentXpField, false);
              }
          }
      }

      const spentXpField = document.getElementById("spent-xp");
      if (spentXpField) {
          console.log('Creating XP tooltip for spent-xp');
          const tooltip = createTooltipFromTemplate('value', spentXpField, false, 'xp-tooltip');
          if (tooltip) {
              const valueElement = tooltip.querySelector('.preview-simple-value');
              if (valueElement) {
                  valueElement.textContent = preview.newSpentXp;
                  // Перепозиционируем после обновления контента
                  void tooltip.offsetWidth;
                  positionTooltip(tooltip, spentXpField, false);
              }
          }
      }
      
      console.log('=== END DEBUG ===');
  }

  function attachHandler(field, isCharacteristic) {
      let inputTimeout;

      field.addEventListener("focus", (e) => {
          // Save original value on focus - store PARSED value
          const originalValue = e.target.value;
          const parsedResult = window.ExpressionParser.parseExpression(originalValue, "0");
          const parsedValue = parsedResult && parsedResult.isValid ? parsedResult.value : parseInt(originalValue, 10) || 0;

          e.target.dataset.originalValue = parsedValue.toString();
          e.target.dataset.isCharacteristic = isCharacteristic;
          e.target.dataset.originalRawValue = originalValue;
      });

      field.addEventListener('input', (e) => {
          clearTimeout(inputTimeout);

          inputTimeout = setTimeout(() => {
              if (e.target.value.trim() !== '' && e.target.value !== e.target.dataset.originalRawValue) {
                  showPreview(e.target, e.target.value);
              } else {
                  hidePreview();
              }
          }, 300);
      });

      field.addEventListener('blur', (e) => {
          clearTimeout(inputTimeout);

          // Use a longer timeout to allow clicking buttons
          setTimeout(() => {
              if (currentPreviews.length > 0 && currentField === e.target) {
                  // Check if the blur was caused by clicking a tooltip button
                  const relatedTarget = e.relatedTarget;
                  const clickedTooltipButton = relatedTarget &&
                      (relatedTarget.classList.contains('preview-btn') ||
                      relatedTarget.closest('.preview-tooltip-content'));

                  if (!clickedTooltipButton) {
                      cancelPreview(e.target);
                  }
              }
          }, 150);
      });

      field.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
              cancelPreview(e.target);
              e.preventDefault(); // Prevent default escape behavior
          } else if (e.key === 'Enter' && currentPreviews.length > 0) {
              const preview = calculatePreview(e.target, e.target.value);
              if (preview.isValid && !preview.error) {
                  applyChanges(e.target, preview);
                  e.preventDefault(); // Prevent form submission
              }
          }
      });
  }

  function calculatePreview(field, inputValue) {
    const isCharacteristic = field.dataset.isCharacteristic === 'true';
    const originalSteps = parseInt(field.dataset.originalValue || "0", 10);

    const result = window.ExpressionParser.parseExpression(inputValue, field.dataset.originalValue || "0");

    if (result === null) {
      return {
        isValid: false,
        newSteps: originalSteps,
        error: 'invalid_expression'
      };
    }

    let newSteps = Math.max(0, result.value);
    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");

    if (!currentXpField || !spentXpField) {
      return {
        isValid: false,
        newSteps: originalSteps,
        error: 'xp_fields_not_found'
      };
    }

    const currentXp = parseInt(currentXpField.value, 10) || 0;
    const spentXp = parseInt(spentXpField.value, 10) || 0;

    let xpChange = 0;
    let canAfford = true;
    let error = null;

    if (newSteps > originalSteps) {
      xpChange = window.ExpressionParser.getAdvancementCost(originalSteps, newSteps, isCharacteristic);
      canAfford = xpChange <= currentXp;
      if (!canAfford) {
        error = 'insufficient_xp';
      }
    } else if (newSteps < originalSteps) {
      xpChange = -window.ExpressionParser.getAdvancementRefund(originalSteps, newSteps, isCharacteristic);
    }

    return {
      isValid: error ? false : true,
      newSteps: newSteps,
      xpChange: xpChange,
      newCurrentXp: currentXp - xpChange,
      newSpentXp: spentXp + xpChange,
      canAfford: canAfford,
      isCharacteristic: isCharacteristic,
      fieldId: field.id,
      originalSteps: originalSteps,
      error: error
    };
  }

  function getCurrentValueDisplay(fieldId, isCharacteristic, newSteps) {
      console.log('=== DEBUG getCurrentValueDisplay ===');
      console.log('Input - fieldId:', fieldId, 'isCharacteristic:', isCharacteristic, 'newSteps:', newSteps);

      if (isCharacteristic) {
          const baseName = fieldId.replace(/-a$/, '');
          const iField = document.getElementById(baseName + '-i');
          const iValue = parseInt(iField?.value || "0", 10);
          const result = iValue + newSteps;
          console.log('Characteristic calculation:', iValue, '+', newSteps, '=', result);
          console.log('iField:', iField, 'value:', iField?.value);
          return result;
      } else {
          const baseName = fieldId.replace(/-aug$/, '');
          const currentField = document.getElementById(baseName + '-current');
          const currentValue = parseInt(currentField?.value || "0", 10);
          const augField = document.getElementById(baseName + '-aug');
          const originalAug = parseInt(augField?.dataset.originalValue || "0", 10);

          const result = currentValue - originalAug + newSteps;
          console.log('Skill calculation:', currentValue, '-', originalAug, '+', newSteps, '=', result);
          console.log('currentField:', currentField, 'value:', currentField?.value);
          console.log('augField:', augField, 'dataset.originalValue:', augField?.dataset.originalValue);
          return result;
      }
  }

  function applyChanges(field, preview) {
    console.log('Applying changes for field:', field.id);

    field.value = preview.newSteps.toString();

    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");
    if (currentXpField && spentXpField) {
      currentXpField.value = preview.newCurrentXp;
      spentXpField.value = preview.newSpentXp;
    }

    if (window.saveToStorage) {
      window.saveToStorage(field.id, preview.newSteps.toString());
      window.saveToStorage("current-xp", preview.newCurrentXp.toString());
      window.saveToStorage("spent-xp", preview.newSpentXp.toString());
    }

    updateAdvancementDisplay(field.id, preview.isCharacteristic, preview.newSteps);

    if (window.updateTotalXp) {
      window.updateTotalXp();
    }

    field.dataset.originalValue = preview.newSteps.toString();

    hidePreview();
    delete originalValues[field.id];
    currentField = null;
  }

  function updateAdvancementDisplay(fieldId, isCharacteristic, newSteps) {
    if (isCharacteristic) {
      const baseName = fieldId.replace(/-a$/, '');
      const iField = document.getElementById(baseName + '-i');
      const aField = document.getElementById(baseName + '-a');
      const currentField = document.getElementById('current-' + baseName);

      if (iField && aField && currentField) {
        const iValue = parseInt(iField.value, 10) || 0;
        const totalValue = iValue + newSteps;
        currentField.value = totalValue;

        if (window.saveToStorage) {
          window.saveToStorage(currentField.id, totalValue.toString());
        }
      }
    } else {
      const baseName = fieldId.replace(/-aug$/, '');
      const currentField = document.getElementById(baseName + '-current');
      const augField = document.getElementById(baseName + '-aug');
      const finalField = document.getElementById(baseName + '-final');

      if (currentField && augField && finalField) {
        const currentValue = parseInt(currentField.value, 10) || 0;
        const augValue = parseInt(augField.dataset.originalValue || "0", 10);
        const finalValue = currentValue - augValue + newSteps;
        finalField.value = finalValue;

        if (window.saveToStorage) {
          window.saveToStorage(finalField.id, finalValue.toString());
        }
      }
    }
  }

  function cancelPreview(field) {
      console.log('Cancelling preview for field:', field.id);

      if (originalValues[field.id]) {
          // Restore PARSED value, not raw value
          field.value = originalValues[field.id].rawValue; // Restore the original raw value
          field.dataset.originalValue = originalValues[field.id].originalValue;
      }

      hidePreview();
      delete originalValues[field.id];
      currentField = null;

      // Refocus the field after cancellation
      setTimeout(() => {
          if (field && field.parentNode) {
              field.focus();
          }
      }, 10);
  }

  function hidePreview() {
    currentPreviews.forEach(tooltip => {
      if (tooltip && tooltip.parentNode) {
        tooltip.remove();
      }
    });
    currentPreviews = [];
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancementCalculator);
  } else {
    initAdvancementCalculator();
  }

  window.AdvancementCalculator = {
    init: initAdvancementCalculator,
    showPreview: showPreview,
    hidePreview: hidePreview
  };
})();