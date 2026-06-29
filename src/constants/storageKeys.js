/**
 * Centralized localStorage key constants.
 * Prevents typo-related bugs and makes key usage searchable.
 */
export const STORAGE_KEYS = {
  // Session & Tabs
  SESSION_TABS: 'apex_session_tabs',
  RECENTLY_CLOSED: 'apex_recently_closed',

  // AI
  AI_API_KEY: 'apex_ai_api_key',
  AI_API_KEY_SECURE: 'apex_ai_api_key_secure',
  AI_PROVIDER: 'apex_ai_provider',
  AI_CUSTOM_URL: 'apex_ai_custom_url',
  AI_CHAT: 'apex_ai_chat',
  AI_SESSIONS: 'apex_ai_sessions',
  OLLAMA_URL: 'apex_ollama_url',
  OLLAMA_MODEL: 'apex_ollama_model',
  MIC_ENABLED: 'apex_mic_enabled',

  // Bookmarks & Search
  BOOKMARKS: 'apex_bookmarks',
  BOOKMARK_FOLDERS: 'apex_bookmark_folders',
  SEARCH_ENGINE: 'apex_search_engine',

  // Dashboard
  WEATHER_LOC: 'apex_weather_loc',
  QUICK_NOTE: 'apex_quicknote',
  DASH_BLUR: 'apex_dash_blur',
  DASH_LAYOUT: 'apex_dash_layout',

  // UI
  BG_IMAGE: 'apex_bg_image',
  SHORTCUTS: 'apex_shortcuts',
  DARK_MODE: 'apex_dark_mode',
  FORCE_DARK_WEBSITES: 'apex_force_dark_websites',
  LANGUAGE: 'apex_language',
  WIDGETS: 'apex_widgets',
  EXTENSIONS: 'apex_extensions',

  // Performance
  AUTO_DISCARD: 'apex_auto_discard',
  GAMING_MODE: 'apex_gaming_mode',
  FOCUS_MODE: 'apex_focus_mode',

  // RGB
  RGB_ON: 'apex_rgb_on',
  RGB_MODE: 'apex_rgb_mode',
  RGB_COLOR: 'apex_rgb_color',
  RGB_SPEED: 'apex_rgb_speed',

  // History
  HISTORY: 'apex_history',

  // Passwords
  PASSWORDS: 'apex_passwords',
  PASSWORDS_SECURE: 'apex_passwords_secure',

  // Proxy
  PROXY_URL: 'apex_proxy_url',
  PROXY_ACTIVE: 'apex_proxy_active',

  // Settings Preferences
  SHOW_HOME_BUTTON: 'apex_show_home_button',
  SHOW_BOOKMARKS_BAR: 'apex_show_bookmarks_bar',
  FONT_SIZE: 'apex_font_size',
  PAGE_ZOOM: 'apex_page_zoom',
  STARTUP_MODE: 'apex_startup_mode',
  USE_TRANSLATE: 'apex_use_translate',
  SPELL_CHECK: 'apex_spell_check',
  ASK_DOWNLOAD_LOCATION: 'apex_ask_download_location',
  DOWNLOADS_PATH: 'apex_downloads_path',
  MEMORY_SAVER: 'apex_memory_saver',
  ENERGY_SAVER: 'apex_energy_saver',
  PRELOAD_PAGES: 'apex_preload_pages',
  BG_APPS_ON_CLOSE: 'apex_bg_apps_on_close',
  HW_ACCELERATION: 'apex_hw_acceleration',
  AD_BLOCKER: 'apex_ad_blocker',
  UNSAFE_SITE_DETECTION: 'apex_unsafe_site_detection',
  COOKIE_POLICY: 'apex_cookie_policy',
  SECURITY_LEVEL: 'apex_security_level',

};
