import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enAuth from "@/i18n/locales/en/auth.json";
import zhTWAuth from "@/i18n/locales/zh-TW/auth.json";

/**
 * App-wide i18next instance. Default locale is zh-TW with an en fallback; the
 * `auth` namespace is the default so feature code calls `t("login.title")`.
 */
void i18n.use(initReactI18next).init({
	resources: {
		en: { auth: enAuth },
		"zh-TW": { auth: zhTWAuth },
	},
	lng: "zh-TW",
	fallbackLng: "en",
	defaultNS: "auth",
	interpolation: { escapeValue: false },
});

export default i18n;
