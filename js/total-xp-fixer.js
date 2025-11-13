// Total XP Fixer - синхронизация обновления total-xp
// Должен быть подключен ПЕРЕД app.js!

(function() {
  'use strict';

  function initTotalXpFixer() {
    const totalOutput = document.getElementById('total-xp');
    const currentInput = document.getElementById('current-xp');
    const spentInput = document.getElementById('spent-xp');

    if (!totalOutput || !currentInput || !spentInput) {
      console.warn('Total XP Fixer: elements not found');
      return;
    }

    // КРИТИЧНО: Удаляем атрибут "for" чтобы браузер не обновлял total автоматически
    // Это отключает form-associated custom element поведение браузера
    totalOutput.removeAttribute('for');

    // Функция для ручного обновления total
    function updateTotal() {
      const current = parseInt(currentInput.value, 10) || 0;
      const spent = parseInt(spentInput.value, 10) || 0;
      totalOutput.textContent = current + spent;
    }

    // Обновляем total при любом изменении обоих полей (change событие)
    currentInput.addEventListener('change', updateTotal);
    spentInput.addEventListener('change', updateTotal);

    // Первоначальное обновление при загрузке страницы
    updateTotal();

    // Экспортируем функцию для использования из xp-calculator.js и других модулей
    window.updateTotalXp = updateTotal;

    console.log('Total XP Fixer initialized');
  }

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTotalXpFixer);
  } else {
    // DOM уже загружен
    initTotalXpFixer();
  }
})();
