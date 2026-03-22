/**
 * SwimEx EDGE — Internationalization (i18n) Module
 * Loads translations from the server and provides a t() lookup function.
 */
var EdgeI18n = (function () {
  'use strict';

  var LOCALE_KEY = 'swimex_locale';
  var currentLocale = 'en';
  var translations = {};
  var availableLocales = [];
  var defaultLocale = 'en';
  var autoDetect = false;

  function t(key, params) {
    var str = translations[key] || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return str;
  }

  function getLocale() {
    return currentLocale;
  }

  function getSavedLocale() {
    try { return localStorage.getItem(LOCALE_KEY); }
    catch (_) { return null; }
  }

  function saveLocale(locale) {
    try { localStorage.setItem(LOCALE_KEY, locale); }
    catch (_) { /* ignore */ }
  }

  function getAvailableLocales() {
    return availableLocales;
  }

  function getDefaultLocale() {
    return defaultLocale;
  }

  function isAutoDetect() {
    return autoDetect;
  }

  function detectBrowserLocale() {
    try {
      var lang = navigator.language || navigator.userLanguage || '';
      var code = lang.split('-')[0].toLowerCase();
      var match = availableLocales.find(function (l) { return l.locale === code; });
      return match ? match.locale : null;
    } catch (_) {
      return null;
    }
  }

  function fetchTranslations(locale) {
    return EdgeAPI.getTranslations(locale).then(function (data) {
      if (data && typeof data === 'object') {
        translations = data;
        currentLocale = locale;
        saveLocale(locale);
        return true;
      }
      return false;
    }).catch(function () {
      return false;
    });
  }

  function setLocale(locale) {
    return fetchTranslations(locale).then(function (ok) {
      if (!ok && locale !== 'en') {
        return fetchTranslations('en');
      }
      return ok;
    }).then(function () {
      if (EdgeAPI.isLoggedIn()) {
        EdgeAPI.updatePreferences({ language: currentLocale }).catch(function () {});
      }
    });
  }

  function init() {
    return EdgeAPI.getI18nConfig().then(function (config) {
      if (config) {
        defaultLocale = config.defaultLocale || 'en';
        autoDetect = Boolean(config.autoDetect);
      }
      return EdgeAPI.getLanguages();
    }).then(function (languages) {
      availableLocales = languages || [];
      var saved = getSavedLocale();
      var locale = saved || null;

      if (!locale && autoDetect) {
        locale = detectBrowserLocale();
      }

      if (!locale) {
        locale = defaultLocale;
      }

      return fetchTranslations(locale);
    }).then(function (ok) {
      if (!ok) {
        return fetchTranslations('en');
      }
    }).catch(function () {
      currentLocale = 'en';
      translations = {};
    });
  }

  return {
    t: t,
    setLocale: setLocale,
    getLocale: getLocale,
    init: init,
    getAvailableLocales: getAvailableLocales,
    getDefaultLocale: getDefaultLocale,
    isAutoDetect: isAutoDetect
  };
})();
