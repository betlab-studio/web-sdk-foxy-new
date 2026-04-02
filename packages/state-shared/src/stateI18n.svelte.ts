import { i18n, type Messages } from '@lingui/core';
import { type Language } from './stateUrl.svelte';

export const stateI18n = $state({
	i18n
});

let messages: Messages = {};

export const stateI18nDerived = {
	init: (lang: Language, msgs: Messages) => {
		messages = msgs ?? {};
		stateI18n.i18n.load(lang, messages);
		stateI18n.i18n.activate(lang);
	},
	translate: (value: string) => (messages?.[value] as string) ?? value,
};