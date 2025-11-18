// Advanced Advancement Calculator with Preview System
(function () {
  'use strict';

  let currentPreviews = [];
  let originalValues = {};
  let currentField = null;

  function initAdvancementCalculator() {
    if (!window.ExpressionParser) {
      console.error("Advancement Calculator: ExpressionParser not found");
      return;
    }

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

    console.log("Advanced Advancement Calculator initialized");
  }

  function attachHandler(field, isCharacteristic) {
    let inputTimeout;
    
    field.addEventListener("focus", (e) => {
      // Save original value on focus - сохраняем РАСПАРСЕННОЕ значение
      const originalValue = e.target.value;
      const parsedResult = window.ExpressionParser.parseExpression(originalValue, "0");
      const parsedValue = parsedResult && parsedResult.isValid ? parsedResult.value : parseInt(originalValue, 10) || 0;
      
      e.target.dataset.originalValue = parsedValue.toString();
      e.target.dataset.isCharacteristic = isCharacteristic;
      e.target.dataset.originalRawValue = originalValue; // Сохраняем также исходное сырое значение
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
      if (currentPreviews.length > 0 && currentField === e.target) {
        if (!currentPreviews.some(tooltip => tooltip.contains(document.activeElement))) {
          cancelPreview(e.target);
        }
      }
    });

    field.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelPreview(e.target);
      } else if (e.key === 'Enter' && currentPreviews.length > 0) {
        const mainTooltip = currentPreviews.find(t => t.classList.contains('main-tooltip'));
        if (mainTooltip) {
          const okButton = mainTooltip.querySelector('.preview-btn.ok');
          if (okButton && !okButton.disabled) {
            const preview = calculatePreview(e.target, e.target.value);
            if (preview.isValid && !preview.error) {
              applyChanges(e.target, preview);
            }
          }
        }
      }
    });
  }

  function createTooltip(element, content, type = 'main', additionalClass = '', position = 'top') {
    const tooltip = document.createElement('div');
    tooltip.className = `preview-tooltip ${type}-tooltip ${additionalClass} ${position}-position`;
    tooltip.innerHTML = content;
    
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    tooltip.style.position = 'absolute';
    
    if (type === 'main') {
      let left = rect.left + scrollX;
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 140;
      
      if (left + tooltipWidth > viewportWidth - 10) {
        left = viewportWidth - tooltipWidth - 10;
      }
      
      // Главный тултип располагаем над полем, хвостик указывает на поле
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${rect.top + scrollY - 5}px`; // Поднимаем выше
    } else if (type === 'value') {
      if (position === 'right') {
        // Справа от поля, центрируем по вертикали
        tooltip.style.left = `${rect.right + scrollX}px`;
        tooltip.style.top = `${rect.top + scrollY + rect.height / 2}px`;
      } else {
        // Над полем (для XP)
        tooltip.style.left = `${rect.left + scrollX + rect.width / 2}px`;
        tooltip.style.top = `${rect.top + scrollY - 5}px`; // Поднимаем выше
      }
    }
    
    document.body.appendChild(tooltip);
    currentPreviews.push(tooltip);
    return tooltip;
  }

  function calculatePreview(field, inputValue) {
    const isCharacteristic = field.dataset.isCharacteristic === 'true';
    const originalSteps = parseInt(field.dataset.originalValue || "0", 10);
    
    const result = window.ExpressionParser.parseExpression(inputValue, field.dataset.originalValue || "0");
    
    if (result === null) {
      return { 
        isValid: false, 
        newSteps: originalSteps,
        error: 'Неверное выражение'
      };
    }
    
    let newSteps = Math.max(0, result.value);
    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");
    
    if (!currentXpField || !spentXpField) {
      return { 
        isValid: false, 
        newSteps: originalSteps,
        error: 'Не найдены поля опыта'
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
        error = `Недостаточно XP. Нужно: ${xpChange}, есть: ${currentXp}`;
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
    if (isCharacteristic) {
      const baseName = fieldId.replace(/-a$/, '');
      const iField = document.getElementById(baseName + '-i');
      const iValue = parseInt(iField?.value || "0", 10);
      return iValue + newSteps;
    } else {
      const baseName = fieldId.replace(/-aug$/, '');
      const currentField = document.getElementById(baseName + '-current');
      const currentValue = parseInt(currentField?.value || "0", 10);
      const augField = document.getElementById(baseName + '-aug');
      const originalAug = parseInt(augField?.dataset.originalValue || "0", 10);
      
      return currentValue - originalAug + newSteps;
    }
  }

  function showPreview(field, inputValue) {
    hidePreview();
    currentField = field;
    
    const preview = calculatePreview(field, inputValue);
    
    if (!preview.isValid) {
      showInvalidPreview(field, inputValue, preview.error);
      return;
    }

    showMainTooltip(field, preview);
    showValueTooltips(field, preview);

    if (!originalValues[field.id]) {
      // Сохраняем РАСПАРСЕННОЕ оригинальное значение, а не сырое
      originalValues[field.id] = {
        value: field.dataset.originalValue, // Используем распарсенное значение
        originalValue: field.dataset.originalValue,
        rawValue: field.value // Сохраняем сырое значение для отображения
      };
    }
  }

  function showMainTooltip(field, preview) {
    let content = '';
    
    if (preview.error) {
      content = `
        <div class="preview-tooltip-content">
          <div class="preview-main-value" style="color: #dc3545;">${preview.newSteps}</div>
          <div class="preview-error">${preview.error}</div>
          <div class="preview-buttons">
            <button class="preview-btn cancel" type="button">Отмена</button>
          </div>
        </div>
      `;
    } else {
      const costText = preview.xpChange > 0 ? 
        `Стоимость: ${preview.xpChange} XP` : 
        preview.xpChange < 0 ? 
        `Возврат: ${Math.abs(preview.xpChange)} XP` : 
        'Без изменений';

      content = `
        <div class="preview-tooltip-content">
          <div class="preview-main-value">${preview.newSteps}</div>
          <div class="preview-cost">${costText}</div>
          <div class="preview-buttons">
            <button class="preview-btn cancel" type="button">Отмена</button>
            <button class="preview-btn ok" type="button">OK</button>
          </div>
        </div>
      `;
    }

    const tooltip = createTooltip(field, content, 'main', preview.error ? 'invalid' : '');
    
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

  function showValueTooltips(field, preview) {
    const currentValueDisplay = getCurrentValueDisplay(
      preview.fieldId, 
      preview.isCharacteristic, 
      preview.newSteps
    );
    
    if (preview.isCharacteristic) {
      const baseName = preview.fieldId.replace(/-a$/, '');
      const currentField = document.getElementById(`current-${baseName}`);
      if (currentField) {
        createTooltip(currentField, 
          `<div class="preview-simple-value">${currentValueDisplay}</div>`, 
          'value', '', 'right'
        );
      }
    } else {
      const baseName = preview.fieldId.replace(/-aug$/, '');
      const finalField = document.getElementById(`${baseName}-final`);
      if (finalField) {
        createTooltip(finalField, 
          `<div class="preview-simple-value">${currentValueDisplay}</div>`, 
          'value', '', 'right'
        );
      }
    }

    const currentXpField = document.getElementById("current-xp");
    if (currentXpField) {
      const xpClass = preview.newCurrentXp < 0 ? 'negative' : 'xp-tooltip';
      createTooltip(currentXpField, 
        `<div class="preview-simple-value">${preview.newCurrentXp}</div>`, 
        'value', xpClass, 'top'
      );
    }

    const spentXpField = document.getElementById("spent-xp");
    if (spentXpField) {
      createTooltip(spentXpField, 
        `<div class="preview-simple-value">${preview.newSpentXp}</div>`, 
        'value', 'xp-tooltip', 'top'
      );
    }
  }

  function showInvalidPreview(field, inputValue, error) {
    const content = `
      <div class="preview-tooltip-content">
        <div class="preview-main-value" style="color: #dc3545;">${inputValue}</div>
        <div class="preview-error">${error}</div>
        <div class="preview-buttons">
          <button class="preview-btn cancel" type="button">Отмена</button>
        </div>
      </div>
    `;

    const tooltip = createTooltip(field, content, 'main', 'invalid');
    
    tooltip.querySelector('.preview-btn.cancel').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      cancelPreview(field);
    });

    if (!originalValues[field.id]) {
      originalValues[field.id] = {
        value: field.dataset.originalValue, // Используем распарсенное значение
        originalValue: field.dataset.originalValue,
        rawValue: field.value
      };
    }
  }

  function applyChanges(field, preview) {
    console.log('Applying changes for field:', field.id);
    
    // Apply all changes directly
    field.value = preview.newSteps.toString(); // Сохраняем число, а не выражение
    
    // Update XP fields
    const currentXpField = document.getElementById("current-xp");
    const spentXpField = document.getElementById("spent-xp");
    if (currentXpField && spentXpField) {
      currentXpField.value = preview.newCurrentXp;
      spentXpField.value = preview.newSpentXp;
    }
    
    // Save to storage
    if (window.saveToStorage) {
      window.saveToStorage(field.id, preview.newSteps.toString());
      window.saveToStorage("current-xp", preview.newCurrentXp.toString());
      window.saveToStorage("spent-xp", preview.newSpentXp.toString());
    }
    
    // Update display values
    updateAdvancementDisplay(field.id, preview.isCharacteristic, preview.newSteps);
    
    // Update total XP
    if (window.updateTotalXp) {
      window.updateTotalXp();
    }
    
    // Обновляем originalValue для будущих изменений
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
      // Восстанавливаем РАСПАРСЕННОЕ значение, а не сырое
      field.value = originalValues[field.id].value;
      field.dataset.originalValue = originalValues[field.id].originalValue;
    }
    
    hidePreview();
    delete originalValues[field.id];
    currentField = null;
  }

  function hidePreview() {
    currentPreviews.forEach(tooltip => {
      if (tooltip && tooltip.parentNode) {
        tooltip.remove();
      }
    });
    currentPreviews = [];
  }

  function handleClickOutside(event) {
    if (currentPreviews.length > 0 && currentField) {
      const clickedInside = currentPreviews.some(tooltip => 
        tooltip.contains(event.target)
      ) || currentField.contains(event.target);
      
      if (!clickedInside) {
        cancelPreview(currentField);
      }
    }
  }

  // Global click handler
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);

  // Initialize when DOM is ready
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