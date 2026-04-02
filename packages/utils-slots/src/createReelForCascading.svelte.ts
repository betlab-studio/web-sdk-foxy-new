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

// Global skip mode - ensures all reels use the same skip mode (first reel to determine sets it for all)
let globalSkipMode: 'none' | 'early' | 'late' = 'none';

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
	let spinFinishingCalled = false;
	let noStop = false;
	let paddingSize = 0;
	let skipRequested = false;

	// Wrapper to prevent multiple calls to onSpinFinishing
	const callOnSpinFinishing = () => {
		if (spinFinishingCalled) return;
		spinFinishingCalled = true;
		onSpinFinishing();
	};

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
			globalSkipMode = 'none';
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
			reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol, symbolIndexOfBoard: reelSymbol.symbolIndexOfBoard });
			if (reelSymbol.symbolIndexOfBoard === reelLengthInBoard - 1) {
				callOnSpinFinishing();
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
			globalSkipMode = 'none';
		}

		// Cache ALL spin options at the start to avoid inconsistencies if speed changes mid-animation
		const cachedOptions = reelState.spinOptions();
		const gapDelay = cachedOptions.fallOutFallInOverlap ?? 0;
		const skipMinDelay = cachedOptions.skipMinDelay;
		const skipEnabled = skipMinDelay !== undefined;
		const lateSkipDelay = cachedOptions.lateSkipDelay ?? 0;
		const lateSkipThreshold = (skipMinDelay ?? 0) + lateSkipDelay;
		const skipFallInDuration = cachedOptions.skipFallInDuration ?? 0;
		const skipSymbolInterval = cachedOptions.skipSymbolInterval ?? 0;
		const lateSkipBounceSizeMulti = cachedOptions.lateSkipBounceSizeMulti ?? 0.15;
		const lateSkipBounceDuration = cachedOptions.lateSkipBounceDuration ?? 100;
		// Cache animation options to prevent issues when speed changes mid-spin
		const symbolFallOutInterval = cachedOptions.symbolFallOutInterval;
		const symbolFallOutSpeed = cachedOptions.symbolFallOutSpeed;
		const symbolFallOutEasing = cachedOptions.symbolFallOutEasing;
		const symbolFallInInterval = cachedOptions.symbolFallInInterval;
		const symbolFallInSpeed = cachedOptions.symbolFallInSpeed;
		const symbolFallInBounceSizeMulti = cachedOptions.symbolFallInBounceSizeMulti;
		const symbolFallInBounceSpeed = cachedOptions.symbolFallInBounceSpeed;
		const symbolFallInEasing = cachedOptions.symbolFallInEasing;
		const reelFallInDelay = cachedOptions.reelFallInDelay;
		const reelAnticipationDelay = cachedOptions.reelAnticipationDelay ?? 0;

		const spinStartTime = performance.now();
		const shouldSkip = () => skipEnabled && !noStop && (skipRequested || stateBet.isTurbo);

		// Skip mode: decided once when first symbol detects skip
		let skipMode: 'none' | 'early' | 'late' = 'none';
		let lateSkipExecuted = false;

		const determineSkipMode = () => {
			// FIRST: Always check globalSkipMode - if another reel already determined, ALL reels must use it
			// This ensures consistency even if local skipMode was already set
			if (globalSkipMode !== 'none') {
				skipMode = globalSkipMode;
				return skipMode;
			}
			// If local mode already determined (and global not set yet), use local
			if (skipMode !== 'none') {
				return skipMode;
			}
			// Determine mode based on elapsed time and set BOTH local and global
			const elapsed = performance.now() - globalSpinStartTime;
			skipMode = elapsed >= lateSkipThreshold ? 'late' : 'early';
			globalSkipMode = skipMode;
			return skipMode;
		};

		// Check if global late skip was triggered by another reel
		const checkGlobalLateSkip = () => {
			// Skip disabled or anticipated reels ignore global late skip
			if (!skipEnabled) return false;
			if (reelState.spinType === 'anticipated') return false;
			// Don't trigger late skip if early skip is already active on this reel
			// This prevents conflicting animations on the same Tween
			if (earlySkipExecuted) return false;
			if (globalLateSkipTimestamp > spinStartTime && !lateSkipExecuted) {
				// Use triggerLateSkip to get the same bounce animation
				triggerLateSkip();
				return true;
			}
			return false;
		};

		// Late skip animation promise (to wait for it after Promise.all)
		let lateSkipAnimationPromise: Promise<void> | null = null;

		// Teleport ALL symbols at once with bounce animation (for late skip)
		const triggerLateSkip = () => {
			if (lateSkipExecuted || earlySkipExecuted) return;
			lateSkipExecuted = true;
			skipMode = 'late';

			// Set global timestamp to notify other reels
			globalLateSkipTimestamp = performance.now();

			const bounceDistance = reelOptions.symbolHeight * lateSkipBounceSizeMulti;
			const bounceDuration = lateSkipBounceDuration;

			// Step 1: Teleport all symbols to final position
			reelState.symbols.forEach((reelSymbol, symbolIndex) => {
				const finalY = getSymbolY(reelSymbol.symbolIndexOfBoard);
				reelSymbol.rawSymbol = targetSymbols[symbolIndex];
				reelSymbol.symbolState = 'static' as TSymbolState;
				reelSymbol.symbolY.set(finalY, { duration: 0 });
			});

			// Step 2: Animate bounce (down then up) for all symbols
			reelState.motion = 'fallingIn';
			lateSkipAnimationPromise = Promise.all(
				reelState.symbols.map(async (reelSymbol) => {
					const finalY = getSymbolY(reelSymbol.symbolIndexOfBoard);

					// Bounce down (overshoot)
					await reelSymbol.symbolY.set(finalY + bounceDistance, {
						duration: bounceDuration,
					});

					// Bounce back up to final position
					await reelSymbol.symbolY.set(finalY, {
						duration: bounceDuration,
						easing: backOut,
					});

					reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol, symbolIndexOfBoard: reelSymbol.symbolIndexOfBoard });

					if (reelSymbol.symbolIndexOfBoard === reelLengthInBoard - 1) {
						callOnSpinFinishing();
					}
				}),
			);
		};

		// Early skip handled flag
		let earlySkipExecuted = false;

		// Store early skip promise to await at the end (for fire-and-forget calls from checkGlobalEarlySkip)
		let earlySkipAnimationPromise: Promise<void> | null = null;

		// Check if global early skip was triggered by another reel
		// Returns true only if we should return immediately (before fallOutDelay)
		// After fallOutDelay, we trigger but DON'T return - let the symbol start its fallOut animation
		const checkGlobalEarlySkip = (beforeFallOutDelay: boolean = false) => {
			// Skip disabled or anticipated reels ignore global early skip
			if (!skipEnabled) return false;
			if (reelState.spinType === 'anticipated') return false;
			if (globalEarlySkipTimestamp > spinStartTime && !earlySkipExecuted && !lateSkipExecuted) {
				// Another reel triggered early skip, trigger ours too
				// Store the promise so we can await it at the end of overlappedSpin
				earlySkipAnimationPromise = triggerEarlySkip();
				// Only return true if we're before fallOutDelay - we want to skip entirely
				// After fallOutDelay, return false so the symbol starts its fallOut animation
				// triggerEarlySkip will teleport it later
				return beforeFallOutDelay;
			}
			return false;
		};

		// Trigger early skip for ALL symbols at once (teleport + animate fallIn together)
		const triggerEarlySkip = async () => {
			if (earlySkipExecuted || lateSkipExecuted) return;
			earlySkipExecuted = true;
			skipMode = 'early';

			// Set global timestamp to notify other reels (only first reel sets it)
			if (globalEarlySkipTimestamp === 0) {
				globalEarlySkipTimestamp = performance.now();
			}

			// Step 1: Wait until globalSpinStartTime + skipMinDelay (fallOut continues during this time)
			const targetStartTime = globalSpinStartTime + (skipMinDelay ?? 0);
			const waitTime = Math.max(0, targetStartTime - performance.now());
			if (waitTime > 0) {
				await waitForTimeout(waitTime);
			}

			if (lateSkipExecuted) {
				return;
			}

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

				// Bounce effect: down then up
				const bounceDistance = reelOptions.symbolHeight * lateSkipBounceSizeMulti;
				reelSymbol.symbolState = 'static' as TSymbolState;

				await reelSymbol.symbolY.set(finalY + bounceDistance, {
					duration: lateSkipBounceDuration,
				});

				if (lateSkipExecuted) {
					reelSymbol.symbolY.set(finalY, { duration: 0 });
					return;
				}

				await reelSymbol.symbolY.set(finalY, {
					duration: lateSkipBounceDuration,
					easing: backOut,
				});

				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol, symbolIndexOfBoard });
				if (symbolIndexOfBoard === reelLengthInBoard - 1) {
					callOnSpinFinishing();
				}
			});

			await Promise.all(fallInPromises);
		};

		reelState.motion = 'fallingOut';

		await Promise.all(
			reelState.symbols.map(async (reelSymbol, symbolIndex) => {
				const symbolIndexOfBoard = reelSymbol.symbolIndexOfBoard;

				// Check if another reel already triggered skip (before fallOutDelay)
				if (checkGlobalLateSkip()) return;
				if (checkGlobalEarlySkip(true)) return;  // true = before fallOutDelay, should return

				// === FALL OUT ===
				const fallOutDelay = symbolFallOutInterval * (reelLengthInBoard - symbolIndexOfBoard);
				const fallOutTargetY = getSymbolY(symbolIndexOfBoard + reelLength);
				const fallOutDistance = fallOutTargetY - reelSymbol.symbolY.current;
				const fallOutDuration = fallOutDistance / symbolFallOutSpeed;
				const fallOutEasing = symbolFallOutEasing;

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
				if (earlySkipExecuted) {
					return;
				}

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
				const reelFallInDelayFromIndex = reelOptions.reelIndex * reelFallInDelay;

				// Anticipation delay only for anticipated reels
				let reelAnticipationDelayFromPadding = 0;
				if (reelState.spinType === 'anticipated') {
					// Use ONLY the anticipated padding portion for consistent timing
					// This ensures the delay is the same regardless of how many normal reels came before
					const anticipatedPaddingOnly = paddingSize - normalPaddingBeforeAnticipation;
					const fallInDelayMultiplier = Math.max(0, anticipatedPaddingOnly / reelLength - 1);
					reelAnticipationDelayFromPadding = reelAnticipationDelay * fallInDelayMultiplier;
				}

				const totalFallInDelay = reelAnticipationDelayFromPadding + reelFallInDelayFromIndex;

				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;
				await waitForTimeout(totalFallInDelay);
				if (checkGlobalLateSkip()) return;
				if (lateSkipExecuted || earlySkipExecuted) return;
				const fallInDelay = symbolFallInInterval * (reelLengthInBoard - symbolIndexOfBoard);
				const fallInTargetY = getSymbolY(symbolIndexOfBoard);
				const fallInDistance = fallInTargetY - hangingY;
				const bounceDistance = reelOptions.symbolHeight * symbolFallInBounceSizeMulti;
				const landDuration = (fallInDistance - bounceDistance) / symbolFallInSpeed;
				const bounceDuration = bounceDistance / symbolFallInBounceSpeed;
				const fallInEasing = symbolFallInEasing;

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
					const mode = determineSkipMode();
					if (mode === 'late') {
						triggerLateSkip();
						return;
					}
				}

				reelSymbol.symbolState = 'land' as TSymbolState;
				reelOptions.onSymbolLand({ rawSymbol: reelSymbol.rawSymbol, symbolIndexOfBoard });

				if (symbolIndexOfBoard === reelLengthInBoard - 1) {
					callOnSpinFinishing();
				}

				// Check for skip during bounce phase
				if (lateSkipExecuted || earlySkipExecuted) return;
				if (shouldSkip()) {
					const mode = determineSkipMode();
					if (mode === 'late') {
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

		// If late skip was triggered, wait for the bounce animation to complete
		if (lateSkipExecuted && lateSkipAnimationPromise) {
			await lateSkipAnimationPromise;
		}

		// If early skip was triggered via checkGlobalEarlySkip (fire-and-forget), wait for it to complete
		if (earlySkipExecuted && earlySkipAnimationPromise) {
			await earlySkipAnimationPromise;
		}

		reelState.motion = 'stopped';
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

	// Store the normal padding accumulated before first anticipated reel (for delay calculation)
	let normalPaddingBeforeAnticipation = 0;

	const prepareToSpin = (prepareToSpinOptions: {
		noStop: boolean;
		spinType: SpinType;
		symbols: TRawSymbol[];
		paddingPosition: number;
		onSpinFinishing: () => void;
		previousPaddingSize: number;
		paddingBeforeFirstAnticipated?: number;
	}) => {
		reelState.spinType = prepareToSpinOptions.spinType;

		noStop = prepareToSpinOptions.noStop;
		targetSymbols = prepareToSpinOptions.symbols;
		onSpinFinishing = prepareToSpinOptions.onSpinFinishing;
		spinFinishingCalled = false;

		const GET_PADDING_SIZE_MAP = {
			fast: 0,
			normal: prepareToSpinOptions.previousPaddingSize + basePaddingSize(),
			anticipated: prepareToSpinOptions.previousPaddingSize + anticipatedPaddingSize(),
		};

		paddingSize = GET_PADDING_SIZE_MAP[prepareToSpinOptions.spinType];

		// Store the normal padding for anticipated delay calculation
		normalPaddingBeforeAnticipation = prepareToSpinOptions.paddingBeforeFirstAnticipated ?? 0;

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
