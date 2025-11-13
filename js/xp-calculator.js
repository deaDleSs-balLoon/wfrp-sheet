// XP Calculator Module - расширение для вычислений в полях опыта
// Подключается к app.js для добавления функционала вычислений в current-xp и spent-xp

(function() {
  'use strict';

  // Инициализация после загрузки DOM
  function initXpCalculator() {
    const currentXpInput = document.getElementById("current-xp");
    const spentXpInput = document.getElementById("spent-xp");

    if (!currentXpInput || !spentXpInput) {
      console.warn("XP Calculator: поля current-xp или spent-xp не найдены");
      return;
    }

    // Обработчик для полей опыта с поддержкой трёх форматов
    function handleExperienceExpression(event) {
      const input = event.target;
      let value = input.value.trim();

      // Если пусто - ничего не делаем
      if (!value) return;

      // Проверяем, что введено
      let result;

      // Вариант 1: Просто число (абсолютное значение)
      if (/^\d+$/.test(value)) {
        result = {
          type: "absolute",
          value: parseInt(value, 10)
        };
      }
      // Вариант 2: Выражение (содержит + или -)
      else if (value.includes("+") || value.includes("-")) {
        result = parseExpression(value, input.dataset.originalValue || "0");
        if (result === null) {
          // Невалидное выражение
          console.warn("Invalid expression:", value);
          input.classList.add("error");
          setTimeout(() => input.classList.remove("error"), 1500);
          input.value = input.dataset.originalValue || "";
          return;
        }
      }
      // Вариант 3: Невалидный ввод
      else {
        console.warn("Invalid input:", value);
        input.classList.add("error");
        setTimeout(() => input.classList.remove("error"), 1500);
        input.value = input.dataset.originalValue || "";
        return;
      }

      // Применяем результат в зависимости от типа поля
      if (input.id === "current-xp") {
        handleCurrentXpResult(result);
      } else if (input.id === "spent-xp") {
        handleSpentXpResult(result, input.dataset.originalValue);
      }
    }

    // Функция парсинга для выражений
    function parseExpression(expression, currentFieldValue) {
      const cleaned = expression.trim();

      // Вариант 1: Выражение начинается с оператора (+10 или -20)
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

      // Вариант 2: Полное выражение (100+10 или 100-20)
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

      // Невалидное выражение
      return null;
    }

    // Обработчик результата для current-xp
    function handleCurrentXpResult(result) {
      const currentInput = document.getElementById("current-xp");

      if (!currentInput) return;

      // Устанавливаем новое значение
      currentInput.value = result.value;

      // Явно сохраняем только вычисленное значение
      if (typeof saveToStorage === 'function') {
        saveToStorage("current-xp", result.value.toString());
      } else {
        localStorage.setItem("current-xp", result.value.toString());
      }
    }

    // Обработчик результата для spent-xp
    function handleSpentXpResult(result, originalValue) {
      const currentInput = document.getElementById("current-xp");
      const spentInput = document.getElementById("spent-xp");

      if (!currentInput || !spentInput) return;

      // Сохранённое исходное значение spent ДО редактирования
      const oldSpentValue = parseInt(spentInput.dataset.originalValue, 10) || 0;
      const currentValue = parseInt(currentInput.value, 10) || 0;
      const newSpentValue = result.value;

      // Вычисляем разницу ТОЛЬКО от oldSpentValue
      const diff = newSpentValue - oldSpentValue;

      // Применяем разницу к current-xp
      if (diff > 0) {
        // Тратим опыт: вычитаем из current, добавляем к spent
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
        // Возвращаем опыт: добавляем к current, вычитаем из spent
        const refund = Math.abs(diff);

        currentInput.value = currentValue + refund;
        spentInput.value = newSpentValue;
      } else {
        // Разница 0 - ничего не меняется
        spentInput.value = newSpentValue;
      }

      // Явно сохраняем только вычисленные значения (не выражения!)
      if (typeof saveToStorage === 'function') {
        saveToStorage("current-xp", currentInput.value);
        saveToStorage("spent-xp", spentInput.value);
      } else {
        localStorage.setItem("current-xp", currentInput.value);
        localStorage.setItem("spent-xp", spentInput.value);
      }

      // Принудительно обновляем total-xp
      if (window.updateTotalXp) {
        window.updateTotalXp();
      }
    }

    // Обновление total-xp
    function updateTotalXp() {
      const currentInput = document.getElementById("current-xp");
      const spentInput = document.getElementById("spent-xp");
      const totalOutput = document.getElementById("total-xp");

      if (!currentInput || !spentInput || !totalOutput) return;

      const current = parseInt(currentInput.value, 10) || 0;
      const spent = parseInt(spentInput.value, 10) || 0;
      totalOutput.textContent = current + spent;
    }

    // Инициализация событий
    if (currentXpInput) {
      currentXpInput.addEventListener("focus", (e) => {
        e.target.dataset.originalValue = e.target.value;
      });
      currentXpInput.addEventListener("change", handleExperienceExpression);
    }

    if (spentXpInput) {
      spentXpInput.addEventListener("focus", (e) => {
        e.target.dataset.originalValue = e.target.value;
      });
      spentXpInput.addEventListener("change", handleExperienceExpression);
    }

    console.log("XP Calculator initialized");
  }

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXpCalculator);
  } else {
    // DOM уже загружен
    initXpCalculator();
  }

})();
