// Чит-коды для тестирования игры
// Использование в консоли браузера: window.cheats.метод(параметры)

import { type Card, type Suit } from './types';

export interface CheatCodes {
  setDeckSize: (size: number) => void;
  enablePlayerCheat: () => void;
  disablePlayerCheat: () => void;
  enableBotCheat: () => void;
  disableBotCheat: () => void;
  givePlayerCard: (rank: string, suit: Suit) => void;
  clearPlayerHand: () => void;
  clearBotHand: () => void;
  winGame: () => void;
  loseGame: () => void;
  showHelp: () => void;
}

let playerCheatMode = false;
let botCheatMode = false;

export const cheats: CheatCodes = {
  setDeckSize: (size: number) => {
    console.log(`🎴 Колода подбора установлена на ${size} карт`);
    if (typeof window !== 'undefined') {
      (window as any).__setDeckSize = size;
    }
  },

  enablePlayerCheat: () => {
    playerCheatMode = true;
    console.log('✅ Чит-режим игрока ВКЛЮЧЕН: теперь вы можете бить любой картой');
  },

  disablePlayerCheat: () => {
    playerCheatMode = false;
    console.log('❌ Чит-режим игрока ВЫКЛЮЧЕН');
  },

  enableBotCheat: () => {
    botCheatMode = true;
    if (typeof window !== 'undefined') {
      (window as any).__botCheatMode = true;
    }
    console.log('✅ Чит-режим бота ВКЛЮЧЕН: бот может бить любой картой');
  },

  disableBotCheat: () => {
    botCheatMode = false;
    if (typeof window !== 'undefined') {
      (window as any).__botCheatMode = false;
    }
    console.log('❌ Чит-режим бота ВЫКЛЮЧЕН');
  },

  givePlayerCard: (rank: string, suit: Suit) => {
    console.log(`🎴 Добавлена карта ${rank} ${suit} в руку игрока`);
    if (typeof window !== 'undefined') {
      (window as any).__giveCard = { rank, suit };
    }
  },

  clearPlayerHand: () => {
    console.log('🗑️ Рука игрока очищена');
    if (typeof window !== 'undefined') {
      (window as any).__clearPlayerHand = true;
    }
  },

  clearBotHand: () => {
    console.log('🗑️ Рука бота очищена');
    if (typeof window !== 'undefined') {
      (window as any).__clearBotHand = true;
    }
  },

  winGame: () => {
    console.log('🏆 Принудительная победа!');
    if (typeof window !== 'undefined') {
      (window as any).__winGame = true;
    }
  },

  loseGame: () => {
    console.log('💀 Принудительное поражение!');
    if (typeof window !== 'undefined') {
      (window as any).__loseGame = true;
    }
  },

  showHelp: () => {
    console.log(`
🎮 ЧИТ-КОДЫ ДЛЯ ИГРЫ "ДУРАК"
================================

📦 Управление колодой:
  window.cheats.setDeckSize(число) - установить количество карт в колоде

🎯 Чит-режимы:
  window.cheats.enablePlayerCheat() - игрок может бить любой картой
  window.cheats.disablePlayerCheat() - выключить чит игрока
  window.cheats.enableBotCheat() - бот может бить любой картой
  window.cheats.disableBotCheat() - выключить чит бота

🎴 Управление картами:
  window.cheats.givePlayerCard('A', 'hearts') - добавить карту в руку игрока
  window.cheats.clearPlayerHand() - очистить руку игрока
  window.cheats.clearBotHand() - очистить руку бота

🏆 Завершение игры:
  window.cheats.winGame() - принудительная победа
  window.cheats.loseGame() - принудительное поражение

📖 Помощь:
  window.cheats.showHelp() - показать эту справку

Примеры:
  window.cheats.setDeckSize(10)
  window.cheats.enablePlayerCheat()
  window.cheats.givePlayerCard('6', 'spades')
`);
  }
};

export function isPlayerCheatEnabled(): boolean {
  return playerCheatMode;
}

export function isBotCheatEnabled(): boolean {
  return typeof window !== 'undefined' && (window as any).__botCheatMode === true;
}

// Инициализация читов при загрузке
if (typeof window !== 'undefined') {
  (window as any).cheats = cheats;
  console.log('🎮 Чит-коды загружены! Введите window.cheats.showHelp() для справки');
}
