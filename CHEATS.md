# 🎮 Чит-коды для игры "Дурак"

## 📖 Как использовать

Откройте консоль браузера (F12) и используйте команды ниже.

## 📦 Управление колодой

```javascript
// Установить количество карт в колоде подбора
window.cheats.setDeckSize(10)  // Установить 10 карт
window.cheats.setDeckSize(0)   // Опустошить колоду
window.cheats.setDeckSize(50)  // Добавить 50 карт
```

## 🎯 Чит-режимы

### Игрок может бить любой картой
```javascript
window.cheats.enablePlayerCheat()   // Включить
window.cheats.disablePlayerCheat()  // Выключить
```

### Бот может бить любой картой
```javascript
window.cheats.enableBotCheat()   // Включить
window.cheats.disableBotCheat()  // Выключить
```

## 🎴 Управление картами

### Добавить карту в руку игрока
```javascript
// Формат: window.cheats.givePlayerCard(ранг, масть)
// Масти: 'hearts', 'diamonds', 'clubs', 'spades'
// Ранги: '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'

window.cheats.givePlayerCard('A', 'hearts')    // Туз червей
window.cheats.givePlayerCard('6', 'spades')    // Шестерка пик
window.cheats.givePlayerCard('K', 'diamonds')  // Король бубен
```

### Очистить руки
```javascript
window.cheats.clearPlayerHand()  // Очистить руку игрока
window.cheats.clearBotHand()     // Очистить руку бота
```

## 🏆 Завершение игры

```javascript
window.cheats.winGame()   // Принудительная победа
window.cheats.loseGame()  // Принудительное поражение
```

## 📖 Помощь

```javascript
window.cheats.showHelp()  // Показать справку в консоли
```

## 💡 Примеры использования

### Тестирование погонов
```javascript
// Дать игроку 4 шестерки
window.cheats.clearPlayerHand()
window.cheats.givePlayerCard('6', 'hearts')
window.cheats.givePlayerCard('6', 'diamonds')
window.cheats.givePlayerCard('6', 'clubs')
window.cheats.givePlayerCard('6', 'spades')

// Опустошить колоду для проверки погонов
window.cheats.setDeckSize(0)
```

### Тестирование защитных механик
```javascript
// Включить чит-режим игрока
window.cheats.enablePlayerCheat()

// Теперь можно бить любой картой, даже если она не подходит по масти/рангу
```

### Быстрая победа
```javascript
// Очистить руку игрока
window.cheats.clearPlayerHand()

// Дать одну карту для завершения
window.cheats.givePlayerCard('6', 'hearts')

// Или просто завершить игру
window.cheats.winGame()
```

## ⚠️ Примечания

- Чит-коды работают только в режиме разработки и тестирования
- После перезагрузки страницы чит-режимы сбрасываются
- Изменения размера колоды применяются немедленно
- Чит-режимы не влияют на систему погонов (погоны все равно нельзя отбить)

## 🎯 Доступные масти и ранги

**Масти:**
- `hearts` - черви ♥
- `diamonds` - бубны ♦
- `clubs` - трефы ♣
- `spades` - пики ♠

**Ранги:**
- `6`, `7`, `8`, `9`, `10`
- `J` - валет
- `Q` - дама
- `K` - король
- `A` - туз
