// Yandex Games SDK loader
(function() {
  if (typeof window !== 'undefined') {
    window.YaGames = {
      init: async function() {
        // In production, this will be replaced by actual Yandex SDK
        // For now, return mock data
        return {
          environment: {
            i18n: {
              lang: navigator.language.split('-')[0] || 'ru'
            }
          }
        };
      }
    };
  }
})();
