import Modals from './src/components/Modals.svelte';
import GameVersion from './src/components/GameVersion.svelte';
import GlobalStyle from './src/components/GlobalStyle.svelte';

// Individual modals for custom Modals compositions
import ModalError from './src/components/ModalError.svelte';
import ModalBetMenu from './src/components/ModalBetMenu.svelte';
import ModalBuyBonus from './src/components/ModalBuyBonus.svelte';
import ModalBuyBonusConfirm from './src/components/ModalBuyBonusConfirm.svelte';
import ModalAutoSpin from './src/components/ModalAutoSpin.svelte';
import ModalAutoSpinMessage from './src/components/ModalAutoSpinMessage.svelte';
import ModalPayTable from './src/components/ModalPayTable.svelte';
import ModalGameRules from './src/components/ModalGameRules.svelte';
import ModalSettings from './src/components/ModalSettings.svelte';

import messagesMap from './src/i18n/messagesMap';
import { i18nDerived } from './src/i18n/i18nDerived';

export * from './src/types';

export {
	messagesMap,
	i18nDerived,
	Modals,
	GameVersion,
	GlobalStyle,
	// Individual modals
	ModalError,
	ModalBetMenu,
	ModalBuyBonus,
	ModalBuyBonusConfirm,
	ModalAutoSpin,
	ModalAutoSpinMessage,
	ModalPayTable,
	ModalGameRules,
	ModalSettings,
};
