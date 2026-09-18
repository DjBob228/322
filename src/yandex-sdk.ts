// Yandex Games SDK initialization
export interface YaGamesSDK {
  environment: {
    i18n: {
      lang: string;
    };
  };
}

let ysdk: YaGamesSDK | null = null;
let detectedLang: string = 'ru';

export async function initYaGamesSDK(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as any).YaGames) {
      ysdk = await (window as any).YaGames.init();
      if (ysdk) {
        detectedLang = ysdk.environment.i18n.lang;
        console.log('Yandex SDK initialized, language:', detectedLang);
      }
    } else {
      console.log('Yandex SDK not available, using default language: ru');
      detectedLang = 'ru';
    }
  } catch (error) {
    console.error('Failed to initialize Yandex SDK:', error);
    detectedLang = 'ru';
  }
}

export function getDetectedLanguage(): string {
  return detectedLang;
}

export function getSDK(): YaGamesSDK | null {
  return ysdk;
}
