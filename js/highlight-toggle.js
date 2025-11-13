// Highlight Toggle Module - функционал для кнопок подсветки в таблицах
// Подключается к app.js для добавления функционала подсветки рядов

(function() {
  'use strict';

  // Инициализация после загрузки DOM
  function initHighlightToggleModule() {
    // Обработчик клика на элементы с кнопками подсветки
    function handleHighlightClick(event) {
      if (event.target.closest('.highlight-toggle') ||
          event.target.closest('label[for*="-hl"]')) {
        return;
      }

      const row = event.target.closest("tr, th");

      if (!row) {
        clearAllHighlights();
        return;
      }

      const hlButton = row.querySelector(".hl-wrapper-checkbox, .hl-charac");

      if (!hlButton) return;

      const isCharac = row.tagName === "TH";

      // Проверяем, активна ли уже эта кнопка
      const isAlreadyActive = hlButton.classList.contains("active");

      // Скрываем все кнопки
      clearAllHighlights();

      // Если кнопка не была активна - активируем её
      if (!isAlreadyActive) {
        hlButton.classList.add("active");
      }
      // Если была активна - она уже скрыта (из clearAllHighlights)
    }

    // Очистка всех активных кнопок подсветки
    function clearAllHighlights() {
      document.querySelectorAll(".hl-wrapper-checkbox.active, .hl-charac.active")
        .forEach(btn => btn.classList.remove("active"));
    }

    // Подключаем обработчик события
    document.addEventListener("click", handleHighlightClick);

    console.log("Highlight Toggle Module initialized");
  }

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHighlightToggleModule);
  } else {
    // DOM уже загружен
    initHighlightToggleModule();
  }

})();
