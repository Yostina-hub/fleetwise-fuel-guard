import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact';
  className?: string;
}

const LanguageSelector = ({ variant = 'default', className }: LanguageSelectorProps) => {
  const { i18n } = useTranslation();

  const selectedLanguage = (i18n.resolvedLanguage || i18n.language || languages[0].code).split('-')[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  const currentLang = languages.find((language) => language.code === selectedLanguage) || languages[0];

  if (variant === 'compact') {
    return (
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className={`w-[120px] bg-[#0d1520] border-[#2a3a4d] text-white/80 hover:bg-[#2a3a4d] ${className}`}>
          <Globe className="w-4 h-4 mr-2" />
          <SelectValue>{currentLang.code.toUpperCase()}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#1a2332] border-[#2a3a4d]">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-white/80 hover:bg-[#2a3a4d] focus:bg-[#2a3a4d] focus:text-white">
              <span className="flex items-center gap-2">
                <span>{lang.nativeName}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className={`w-[180px] ${className}`}>
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue>{currentLang.nativeName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center justify-between w-full gap-2">
              <span>{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
