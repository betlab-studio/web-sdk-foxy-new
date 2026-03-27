import { backOut } from 'svelte/easing';
import { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { createInterruptible } from 'utils-shared/interruptible';

import type { CascadingReelCreateOptions, CascadingReelSpinOptions, SpinType } from './types';

// Global state to coordinate late skip across all reels
let globalLateSkipTimestamp = 0;

// Global state to coordinate early skip across all reels
let globalEarlySkipTimestamp = 0;

// Global spin start time (set by reel 0, used for skipMinDelay calculation)
let globalSpinStartTime = 0;

export type CascadingReelMotion = 'fallingOut' | 'hanging' | 'fallingIn' | 'stopped';
export type CascadingReelSymbolState = 'static' | 'land' | 'spin';

export function createReelForCascading<TRawSymbol extends object, TSymbolState extends string>(
	reelOptions: CascadingReelCreateOptions<TRawSymbol, TSymbolState>,
) {
	// reelSymbols
	const getSymbolY = (symbolIndexOfBoard: number) =>
		(symbolIndexOfBoard + 0.5) * reelOptions.symbolHeight;

	const createReelSymbol = (reelSymbolOptions: { rawSymbol: TRawSymbol; symbolIndex: number }) => {
		const symbolIndexOfBoard = reelSymbolOptions.symbolIndex - 1;
		const rawSymbol = reelSymbolOptions.rawSymbol;
		const symbolState = reelOptions.initialSymbolState;

		const initY = getSymbolY(symbolIndexOfBoard);
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const reelSymbol = $state({
			rawSymbol,
			symbolIndexOfBoard,
			symbolY,
			symbolState,
			oncomplete,
		});

		return reelSymbol;
	};

	type ReelSymbol = ReturnType<typeof createReelSymbol>;

	const createReelSymbols: (value: TRawSymbol[]) => ReelSymbol[] = (rawSymbols) => {
		const reelSymbols = rawSymbols.map((rawSymbol, symbolIndex) =>
			createReelSymbol({ rawSymbol, symbolIndex }),
		);

		return reelSymbols;
	};

	const updateSymbols = (value: TRawSymbol[]) =>
		reelState.symbols.map((reelSymbol, symbolIndex) => {
			reelSymbol.rawSymbol = value[symbolIndex];
			reelSymbol.symbolState = 'static' as TSymbolState;
		});

	// constants
	const reelLength = reelOptions.initialSymbols.length;
	const reelLengthInBoard = reelLength - 2;

	// interruptible
	const interruptible = createInterruptible();

	// reactive states
	const reelState = $state({
		symbols: createReelSymbols(reelOptions.initialSymbols),
		motion: 'stopped' as CascadingReelMotion,
		spinType: 'normal' as SpinType,
		anticipating: false,
		readyToSpin: () => {},
		spinOptions: () => ({}) as CascadingReelSpinOptions,
	});
	const basePaddingSize = () => reelLength * reelState.spinOptions().reelPaddingMultiplierNormal;
	const anticipatedPaddingSize = () =>
		reelLength * reelState.spinOptions().reelPaddingMultiplierAnticipated;

	// internal states
	let targetSymbols = reelOptions.initialSymbols;
	let onSpinFinishing: () => void = () => {};
	let noStop = false;
	let paddingSize = 0;
	let skipRequested = false;

	const delaySpinByReelIndex = async () => {
		const totalDelay = reelState.spinOptions().reelFallOutDelay * reelOptions.reelIndex;
		const startTime = performance.now();
		// Poll for global early skip instead of blocking wait
		while (performance.now() - startTime < totalDelay) {
			// Exit early if global early skip was triggered
			if (globalEarlySkipTimestamp > 0) return;
			await waitForTimeout(5);
		}
	};

	// Calculate time for a symbol to exit the visible frame (accounting for easing)
	const calculateSymbolExitTime = (
		symbolIndexOfBoard: number,
		totalDuration: number,
		totalDistance: number,
	) => {
		const frameBottom = reelLengthInBoard * reelOptions.symbolHeight;
		const halfSymbol = reelOptions.symbolHeight / 2;
		const easing = reelState.spinOptions().symbolFallOutEasing;

		const startY = getSymbolY(symbolIndexOfBoard);
		const exitY = frameBottom + halfSymbol;
		const distanceToExit = exitY - startY;

		const positionRatio = Math.min(1, distanceToExit / totalDistance);

		if (!easing) {
			return totalDuration * positionRatio;
		}

		// Binary search to find t where easing(t) = positionRatio
		let low = 0;
		let high = 1;
		for (let i = 0; i < 10; i++) {
			const mid = (low + high) / 2;
			const easedPosition = easing(mid);
			if (easedPosition < positionRatio) {
				low = mid;
			} else {
				high = mid;
			}
		}
		const timeRatio = (low + high) / 2;

		return totalDuration * timeRatio;
	};

	const preSpin = async ({
		isTurboBeforeAll,
	}: {
		isTurboBeforeAll: boolean; // To avoid previous spinType has effect on "getSpinOption" in "slideDownLoop"
	}) => {
		// Reel 0 resets global state
		if (reelOptions.reelIndex === 0) {
			globalSpinStartTime = performance.now();
			globalEarlySkipTimestamp = 0;
			globalLateSkipTimestamp = 0;
		}
		skipRequested = false;
		reelState.spinType = isTurboBeforeAll ? 'fast' : 'normal';
		if (!isTurboBeforeAll) await delaySpinByReelIndex();

		// When overlap is configured, don't do fallOut here - let spin() handle it via overlappedSpin
		// Set motion to 'hanging' to trigger readyToSpinEffect
		const hasOverlap = reelState.spinOptions().fallOutFallInOverlap !== undefined;
		if (hasOverlap) {
			reelState.motion = 'hanging';
		} else {
			await fallOut();
		}
	};

	const moveAllSymbolsWith = async (moveSymbol: (reelSymbol: ReelSymbol) => Promise<void>) => {
		await Promise.all(reelState.symbols.map(moveSymbol));
	};

	const fallOut = async () => {
		reelState.motion = 'fallingOut';

		await moveAllSymbolsWith(async (reelSymbol) => {
			const oldSymbolY = reelSymbol.symbolY.current;
			const newSymbolY = getSymbolY(reelSymbol.symbolIndexOfBoard + reelLength);
			const distance = newSymbolY - oldSymbolY;
			const duration = distance / reelState.spinOptions().symbolFallOutSpeed;
			const delay =
				reelState.spinOptions().symbolFallOutInterval *
				(reelLengthInBoard - reelSymbol.symbolIndexOfBoard);
			const easing = reelState.spinOptions().symbolFallOutEasing;

			await waitForTimeout(delay);
			reelSymbol.symbolState = 'spin' as TSymbolState;
			await reelSymbol.symbolY.set(newSymbolY, { duration, easing });
		});

		reelState.motion = 'hanging';
	};

	const hanging = async () => {
		updateSymbols(targetSymbols);

		await moveAllSymbolsWith(async (reelSymbol) => {
			const newSymbolY = getSymbolY(reelSymbol.symbolIndexOfBoard - reelLength + 0.5);
			const duration = 0;

			await reelSymbol.symbolY.set(newSymbolY, { duration });
		});
	};

	const fallIn = async () => {
		const fallInDelayMultiplier = paddingSize / reelLength - 1;
		const waitToStartFallingIn = async () =>
			await waitForTimeout(reelState.spinOptions().reelFallInDelay * fallInDelayMultiplier);

		// Q: When to skip the waitToStartFallingIn?
		// A: When stop button is clicked(isTurbo) and is noStop is false
		if (noStop) {
			await waitToStartFallingIn();
		} else if (stateBet.isTurbo) {
			// skip
		} else {
			await interruptible.add(waitToStartFallingIn);
		}

		reelState.motion = 'fallingIn';

		await moveAllSymbolsWith(async (reelSymbol) => {
			const oldSymbolY = reelSymbol.symbolY.current;
			const newSymbolY = getSymbolY(reelSymbol.symbolIndexOfBoard);
			const distance = newSymbolY - oldSymbolY;
			const delay =
				reelState.spinOptions().symbolFallInInterval *
				(reelLengthInBoard - reelSymbol.symbolIndexOfBoard);
			const bounceDistance =
				reelOptions.symbolHeight * reelState.spinOptions().symbolFallInBounceSizeMulti;
			const bounceDuration = bounceDistance / reelState.spinOptions().symbolFallInBounceSpeed;
			const landDuration = (distance - bounceDistance) / reelState.spinOptions().symbolFallInSpeed;
			const easing = reelState.spinOptions().symbolFallInEasing;

			await reelSymbol.symbolY.set(newSymbolY - bounceDistance, {
				duration: landDuration,
				delay,
				easing,
			});
			reelSymbol.symbolState = 'land' as TSymbolState;
			reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
			if (reelSymbol.symbolIndexOfBoard === reelLengthInBoard - 1) {
				onSpinFinishing();
			}
			await reelSymbol.symbolY.set(newSymbolY, {
				duration: bounceDuration,
				easing: backOut,
			});
		});

		reelState.motion = 'stopped';
	};

	// Overlapped spin: per-symbol fallOut → swap → fallIn with visual overlap
	const overlappedSpin = async () => {
		// Reset global spin start time for reel 0 at the start of each spin
		// This ensures correct early/late skip detection for bonus spins
		if (reelOptions.reelIndex === 0) {
			globalSpinStartTime = performance.now();
			globalEarlySkipTimestamp = 0;
			globalLateSkipTimestamp = 0;
		}

		const gapDelay = reelState.spinOptions().fallOutFallInOverlap ?? 0;
		const skipMinDelay = reelState.spinOptions().skipMinDelay ?? 0;
		const lateSkipDelay = reelState.spinOptions().lateSkipDelay ?? 0;
		const lateSkipThreshold = skipMinDelay + lateSkipDelay;
		const skipFallInDuration = reelState.spinOptions().skipFallInDuration ?? 0;
		const skipSymbolInterval = reelState.spinOptions().skipSymbolInterval ?? 0;
		const spinStartTime = performance.now();
		const shouldSkip = () => !noStop && (skipRequested || stateBet.isTurbo);

		// Skip mode: decided once when first symbol detects skip
		let skipMode: 'none' | 'early' | 'late' = 'none';
		let lateSkipExecuted = false;

		const determineSkipMode = () => {
			if (skipMode !== 'none') return skipMode;
			// Use global spin start time for consistent early/late determination across all reels
			const elapsed = performance.now() - globalSpinStartTime;
			skipMode = elapsed >= lateSkipThreshold ? 'late' : 'early';
			return skipMode;
		};

		// Check if global late skip was triggered by another reel
		const checkGlobalLateSkip = () => {
			// Only actually anticipated reels ignore global late skip
			if (reelState.spinType === 'anticipated') return false;
			if (globalLateSkipTimestamp > spinStartTime && !lateSkipExecuted) {
				console.log('[LATE SKIP] Detected global late skip from another reel');
				lateSkipExecuted = true;
				skipMode = 'late';
				reelState.symbols.forEach((reelSymbol, symbolIndex) => {
					const finalY = getSymbolY(reelSymbol.symbolIndexOfBoard);
					reelSymbol.rawSymbol = targetSymbols[symbolIndex];
					reelSymbol.symbolState = 'static' as TSymbolState;
					reelSymbol.symbolY.set(finalY, { duration: 0 });
				});
				return true;
			}
			return false;
		};

		// Teleport ALL symbols at once (for late skip)
		const triggerLateSkip = () => {
			console.log('[LATE SKIP] triggerLateSkip called, lateSkipExecuted:', lateSkipExecuted);
			if (lateSkipExecuted) return;
			lateSkipExecuted = true;
			skipMode = 'late';

			// Set global timestamp to notify other reels
			globalLateSkipTimestamp = performance.now();
			console.log('[LATE SKIP] Set globalLateSkipTimestamp:', globalLateSkipTimestamp);

			reelState.symbols.forEach((reelSymbol, symbolIndex) => {
				const finalY = getSymbolY(reelSymbol.symbolIndexOfBoard);
				reelSymbol.rawSymbol = targetSymbols[symbolIndex];
				reelSymbol.symbolState = 'static' as TSymbolState;
				reelSymbol.symbolY.set(finalY, { duration: 0 });
			});
			console.log('[LATE SKIP] All symbols teleported');
		};

		// Early skip handled flag
		let earlySkipExecuted = false;

		// Check if global early skip was triggered by another reel
		const checkGlobalEarlySkip = () => {
			// Only actually anticipated reels ignore global early skip
			if (reelState.spinType === 'anticipated') return false;
			if (globalEarlySkipTimestamp > spinStartTime && !earlySkipExecuted && !lateSkipExecuted) {
				// Another reel triggered early skip, trigger ours too
				triggerEarlySkip();
				return true;
			}
			return false;
		};

		// Trigger early skip for ALL symbols at once (teleport + animate fallIn together)
		const triggerEarlySkip = async () => {
			if (earlySkipExecuted || lateSkipExecuted) return;
			earlySkipExecuted = true;
			skipMode = 'early';

			// Set global timestamp to notify other reels (only first reel sets it)
			const isFirstToTrigger = globalEarlySkipTimestamp === 0;
			if (isFirstToTrigger) {
				globalEarlySkipTimestamp = performance.now();
			}
			console.log('[EARLY SKIP] triggerEarlySkip called, isFirst:', isFirstToTrigger);

			// Step 1: Wait until globalSpinStartTime + skipMinDelay (fallOut continues during this time)
			const targetStartTime = globalSpinStartTime + skipMinDelay;
			const waitTime = Math.max(0, targetStartTime - performance.now());
			if (waitTime > 0) {
				await waitForTimeout(waitTime);
			}

			if (lateSkipExecuted) return;

			// Step 2: NOW teleport ALL symbols to hanging position with new rawSymbols
			reelState.symbols.forEach((reelSymbol, symbolIndex) => {
				const hangingY = getSymbolY(reelSymbol.symbolIndexOfBoard - reelLength + 0.5);
				reelSymbol.rawSymbol = targetSymbols[symbolIndex];
				reelSymbol.symbolState = 'spin' as TSymbolState;
				reelSymbol.symbolY.set(hangingY, { duration: 0 });
			});

			// Step 3: Start ALL fallIn animations together
			reelState.motion = 'fallingIn';
			const fallInPromises = reelState.symbols.map(async (reelSymbol, symbolIndex) => {
				const symbolIndexOfBoard = reelSymbol.symbolIndexOfBoard;
				const finalY = getSymbolY(symbolIndexOfBoard);
				const delay = (reelLengthInBoard - symbolIndexOfBoard) * skipSymbolInterval;

				await waitForTimeout(delay);
				if (lateSkipExecuted) {
					reelSymbol.symbolY.set(finalY, { duration: 0 });
					return;
				}

				reelSymbol.symbolY.set(finalY, { duration: skipFallInDuration });
				await waitForTimeout(skipFallInDuration);

				if (lateSkipExecuted) {
					reelSymbol.symbolY.set(finalY, { duration: 0 });
					return;
				}

				reelSymbol.symbolState = 'land' as TSymbolState;
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
				if (symbolIndexOfBoard === reelLengthInBoard - 1) {
					onSpinFinishing();
				}
				reelSymbol.symbolState = 'static' as TSymbolState;
			});

			await Promise.all(fallInPromises);
			console.log('[EARLY SKIP] All symbols landed');
		};

		reelState.motion = 'fallingOut';

		console.log('[SPIN] Starting Promise.all for all symbols');
		await Promise.all(
			reelState.symbols.map(async (reelSymbol, symbolIndex) => {
				const symbolIndexOfBoard = reelSymbol.symbolIndexOfBoard;
				console.log(`[SYMBOL ${symbolIndexOfBoard}] Starting`);

				// Check if another reel already triggered skip
				if (checkGlobalLateSkip()) return;
				if (checkGlobalEarlySkip()) return;

				// === FALL OUT ===
				const fallOutDelay =
					reelState.spinOptions().symbolFallOutInterval *
					(reelLengthInBoard - symbolIndexOfBoard);
				const fallOutTargetY = getSymbolY(symbolIndexOfBoard + reelLength);
				const fallOutDistance = fallOutTargetY - reelSymbol.symbolY.current;
				const fallOutDuration = fallOutDistance / reelState.spinOptions().symbolFallOutSpeed;
				const fallOutEasing = reelState.spinOptions().symbolFallOutEasing;

				// Always wait for fallOut delay (no skip here - skip only after symbol exits frame)
				await waitForTimeout(fallOutDelay);
				if (checkGlobalLateSkip()) return;
				if (checkGlobalEarlySkip()) return;
				reelSymbol.symbolState = 'spin' as TSymbolState;

				// Start fallOut animation
				reelSymbol.symbolY.set(fallOutTargetY, {
					duration: fallOutDuration,
					easing: fallOutEasing,
				});

				// Wait for this symbol to exit the visible frame
				// gapDelay negative = start swap earlier (overlap), positive = wait longer (gap)
				const exitTime = calculateSymbolExitTime(
					symbolIndexOfBoard,
					fallOutDuration,
					fallOutDistance,
				);
				const adjustedExitTime = Math.max(0, exitTime + gapDelay);
				await waitForTimeout(adjustedExitTime);
				if (checkGlobalLateSkip()) return;
				if (checkGlobalEarlySkip()) return;

				// Check if early skip was already triggered by another symbol
				if (earlySkipExecuted) return;

				// Skip check after exit
				if (shouldSkip()) {
					const mode = determineSkipMode();
					if (mode === 'late') {
						triggerLateSkip();
						return;
					}
					// Early skip: trigger for ALL symbols at once
					await triggerEarlySkip();
					return;
				}

				// === SWAP & REPOSITION ===
				if (lateSkipExecuted || earlySkipExecuted) {
					return;
				}
				reelSymbol.rawSymbol = targetSymbols[symbolIndex];
				reelSymbol.symbolState = 'static' as TSymbolState;
				const hangingY = getSymbolY(symbolIndexOfBoard - reelLength + 0.5);
				reelSymbol.symbolY.set(hangingY, { duration: 0 });

				// === FALL IN ===
				// Delay between reels
				const reelFallInDelayFromIndex =
					reelOptions.reelIndex * reelState.spinOptions().reelFallInDelay;

				// Anticipation delay only for anticipated reels
				let reelAnticipationDelayFromPadding = 0;
				if (reelState.spinType === 'anticipated') {
					const fallInDelayMultiplier = Math.max(0, paddingSize / reelLength - 1);
					const anticipationDelay = reelState.spinOptions().reelAnticipationDelay ?? 0;
					reelAnticipationDelayFromPadding = anticipationDelay * fallInDelayMultiplier;
				}

				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;
				await waitForTimeout(reelAnticipationDelayFromPadding + reelFallInDelayFromIndex);
				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;
				const fallInDelay =
					reelState.spinOptions().symbolFallInInterval *
					(reelLengthInBoard - symbolIndexOfBoard);
				const fallInTargetY = getSymbolY(symbolIndexOfBoard);
				const fallInDistance = fallInTargetY - hangingY;
				const bounceDistance =
					reelOptions.symbolHeight * reelState.spinOptions().symbolFallInBounceSizeMulti;
				const landDuration =
					(fallInDistance - bounceDistance) / reelState.spinOptions().symbolFallInSpeed;
				const bounceDuration = bounceDistance / reelState.spinOptions().symbolFallInBounceSpeed;
				const fallInEasing = reelState.spinOptions().symbolFallInEasing;

				// Check if late skip was triggered
				if (lateSkipExecuted) {
					reelSymbol.symbolY.set(fallInTargetY, { duration: 0 });
					return;
				}

				// Check if early skip was already triggered by another symbol
				if (earlySkipExecuted) return;

				// Skip check before fallIn
				if (shouldSkip()) {
					const mode = determineSkipMode();
					if (mode === 'late') {
						triggerLateSkip();
						return;
					}
					// Early skip: trigger for ALL symbols at once
					await triggerEarlySkip();
					return;
				}

				await waitForTimeout(fallInDelay);
				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;

				reelSymbol.symbolState = 'spin' as TSymbolState;

				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;

				reelSymbol.symbolY.set(fallInTargetY - bounceDistance, {
					duration: landDuration,
					easing: fallInEasing,
				});
				await waitForTimeout(landDuration);
				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;

				// Check for skip during fallIn animation
				if (shouldSkip()) {
					const elapsed = performance.now() - globalSpinStartTime;
					if (elapsed >= lateSkipThreshold) {
						triggerLateSkip();
						return;
					}
				}

				reelSymbol.symbolState = 'land' as TSymbolState;
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });

				if (symbolIndexOfBoard === reelLengthInBoard - 1) {
					onSpinFinishing();
				}

				// Check for skip during bounce phase
				if (lateSkipExecuted || earlySkipExecuted) return;
				if (shouldSkip()) {
					const elapsed = performance.now() - globalSpinStartTime;
					if (elapsed >= lateSkipThreshold) {
						triggerLateSkip();
						return;
					}
				}

				if (lateSkipExecuted || earlySkipExecuted) return;
				if (bounceDistance > 0) {
					reelSymbol.symbolY.set(fallInTargetY, {
						duration: bounceDuration,
						easing: backOut,
					});
					await waitForTimeout(bounceDuration);
					if (checkGlobalLateSkip()) return;
					if (lateSkipExecuted || earlySkipExecuted) return;
				}
			}),
		);

		console.log('[SPIN] Promise.all completed, lateSkipExecuted:', lateSkipExecuted);

		// If late skip was triggered, call the callbacks now
		if (lateSkipExecuted) {
			console.log('[LATE SKIP] Calling callbacks after Promise.all');
			reelState.symbols.forEach((reelSymbol) => {
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol });
			});
			onSpinFinishing();
			console.log('[LATE SKIP] Callbacks done');
		}

		reelState.motion = 'stopped';
		console.log('[SPIN] Motion set to stopped, spin complete');
	};

	const generalSpin = async () => {
		const isHanging = reelState.motion === 'hanging';
		const hasOverlap = reelState.spinOptions().fallOutFallInOverlap !== undefined;

		// Use overlapped spin when overlap is configured
		if (hasOverlap) {
			await overlappedSpin();
			return;
		}

		if (!isHanging) await fallOut();
		await hanging();
		await fallIn();
	};

	// Keep redundancy here for the comparison to createSpinningReel
	const fastSpin = () => generalSpin();
	const normalSpin = () => generalSpin();
	const anticipatedSpin = () => generalSpin();

	const SPIN_MAP = {
		fast: fastSpin,
		normal: normalSpin,
		anticipated: anticipatedSpin,
	};

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		onSpinFinishing: () => void;
		previousPaddingSize: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		targetSymbols = prepareToSpinOptions.symbols;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;

		const GET_PADDING_SIZE_MAP = {
			fast: 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize(),
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		return paddingSize;
	};

	const spin = async () => {
		skipRequested = false;
		await SPIN_MAP[reelState.spinType]();
	};

	const setSymbolsWithRawSymbols = (value?: TRawSymbol[]) => {
		reelState.motion = 'stopped';
		if (value) {
			updateSymbols(value);
		}
	};

	const stop = () => {
		skipRequested = true;
		interruptible.interrupt();
	};

	const readyToSpinEffect = () => {
		$effect(() => {
			if (reelState.motion === 'hanging') {
				reelState.readyToSpin();
			}
		});
	};

	return {
		// from options
		reelIndex: reelOptions.reelIndex,
		symbolHeight: reelOptions.symbolHeight,
		onReelStopping: reelOptions.onReelStopping,
		reelLength,
		// reactive states
		reelState,
		// methods
		preSpin,
		prepareToSpin,
		spin,
		stop,
		setSymbolsWithRawSymbols,
		readyToSpinEffect,
	};
}
