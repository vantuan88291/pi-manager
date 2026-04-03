import { I18nManager } from "react-native"
import * as Localization from "expo-localization"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import "intl-pluralrules"

import { storage } from "@/utils/storage"

// Import EN and VI translations
import en, { Translations } from "./en"
import vi from "./vi"

const fallbackLocale = "en"

// Supported languages: English and Vietnamese only
export const resources = {
  en,
  vi,
} as const

export type LanguageCode = keyof typeof resources

export const LANGUAGE_OPTIONS: { label: string; value: LanguageCode }[] = [
  { label: "English", value: "en" },
  { label: "Tiếng Việt", value: "vi" },
]

const supportedTags = Object.keys(resources)

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = "pimanager.language"

/**
 * Get saved language from storage or use system default
 */
export function getSavedLanguage(): LanguageCode | null {
  try {
    const saved = storage.getString(LANGUAGE_STORAGE_KEY)
    if (saved && saved in resources) {
      return saved as LanguageCode
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Save language preference to storage
 */
export function saveLanguage(language: LanguageCode): void {
  try {
    storage.set(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // ignore
  }
}

/**
 * Get initial language based on saved preference or system locale
 */
function getInitialLanguage(): LanguageCode {
  // First check saved preference
  const saved = getSavedLanguage()
  if (saved) return saved

  // Then check system locale - only support en or vi
  const systemLocales = Localization.getLocales()
  for (const locale of systemLocales) {
    const primaryTag = locale.languageTag.split("-")[0]
    if (primaryTag === "vi") {
      return "vi"
    } else if (primaryTag === "en") {
      return "en"
    }
  }

  return fallbackLocale
}

const initialLanguage = getInitialLanguage()

export let isRTL = false

// Disable RTL for both EN and VI
I18nManager.allowRTL(false)

export const initI18n = async () => {
  i18n.use(initReactI18next)

  await i18n.init({
    resources,
    lng: initialLanguage,
    fallbackLng: fallbackLocale,
    interpolation: {
      escapeValue: false,
    },
  })

  return i18n
}

/**
 * Change language at runtime
 */
export async function changeLanguage(language: LanguageCode): Promise<void> {
  saveLanguage(language)
  await i18n.changeLanguage(language)
}

/**
 * Builds up valid keypaths for translations.
 */
export type TxKeyPath = RecursiveKeyOf<Translations>

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, true>
}[keyof TObj & (string | number)]

type RecursiveKeyOfInner<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, false>
}[keyof TObj & (string | number)]

type RecursiveKeyOfHandleValue<
  TValue,
  Text extends string,
  IsFirstLevel extends boolean,
> = TValue extends any[]
  ? Text
  : TValue extends object
    ? IsFirstLevel extends true
      ? Text | `${Text}:${RecursiveKeyOfInner<TValue>}`
      : Text | `${Text}.${RecursiveKeyOfInner<TValue>}`
    : Text
