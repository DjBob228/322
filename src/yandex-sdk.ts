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
      // Add timeout to prevent blocking if SDK doesn't respond
      const initPromise = (window as any).YaGames.init();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });
      
      ysdk = await Promise.race([initPromise, timeoutPromise]);
      
      if (ysdk) {
        detectedLang = ysdk.environment.i18n.lang;
        console.log('Yandex SDK initialized, language:', detectedLang);
      } else {
        console.log('Yandex SDK initialization timed out, using default language: ru');
        detectedLang = 'ru';
      }
    } else {
      console.log('Yandex SDK not available, using default language: ru');
      detectedLang = 'ru';
    }
  } catch (error) {
    console.warn('Failed to initialize Yandex SDK:', error);
    detectedLang = 'ru';
  }
}

export function getDetectedLanguage(): string {
  return detectedLang;
}

export function getSDK(): YaGamesSDK | null {
  return ysdk;
}
