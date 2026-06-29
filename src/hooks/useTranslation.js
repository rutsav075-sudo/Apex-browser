import useBrowserStore from '../store/useBrowserStore';
import { translations } from '../i18n/translations';

export default function useTranslation() {
  const language = useBrowserStore((state) => state.language);
  
  // Fallback to English if the translation doesn't exist
  const langDict = translations[language] || translations['en-US'];
  
  return langDict;
}
