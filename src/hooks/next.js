// import { useEffect, useRef, useCallback, useState } from 'react';
// import { supabase } from '@/integrations/supabase/client';

// interface AntiCheatConfig {
//     attemptId: string;
//     userId: string;
//     tabSwitchLimit: number;
//     fullscreenRequired: boolean;
//     onViolationLimitReached?: () => void;
//     onTerminate?: () => void;
// }

// interface ViolationCounts {
//     tabSwitches: number;
//     fullscreenExits: number;
//     copyAttempts: number;
//     rightClickAttempts: number;
// }

// export function useAntiCheat(config: AntiCheatConfig) {
//     const { attemptId, userId, tabSwitchLimit, fullscreenRequired, onViolationLimitReached, onTerminate } = config;

//     const [violations, setViolations] = useState < ViolationCounts > ({
//         tabSwitches: 0,
//         fullscreenExits: 0,
//         copyAttempts: 0,
//         rightClickAttempts: 0,
//     });
//     const [isFullscreen, setIsFullscreen] = useState(false);
//     const [warningMessage, setWarningMessage] = useState < string | null > (null);

//     const isInitialized = useRef(false);

//     const logViolation = useCallback(async (violationType: string, details?: Record<string, unknown>) => {
//         try {
//             await supabase.from('anti_cheat_logs').insert([{
//                 attempt_id: attemptId,
//                 user_id: userId,
//                 violation_type: violationType,
//                 violation_details: details ? JSON.parse(JSON.stringify(details)) : null,
//             }]);
//         } catch (error) {
//             console.error('Failed to log violation:', error);
//         }
//     }, [attemptId, userId]);

//     const updateAttemptViolations = useCallback(async (field: string, value: number) => {
//         try {
//             await supabase
//                 .from('student_test_attempts')
//                 .update({ [field]: value })
//                 .eq('id', attemptId);
//         } catch (error) {
//             console.error('Failed to update attempt violations:', error);
//         }
//     }, [attemptId]);

//     // Tab switch detection
//     useEffect(() => {
//         const handleVisibilityChange = () => {
//             if (document.hidden) {
//                 setViolations(prev => {
//                     const newCount = prev.tabSwitches + 1;
//                     logViolation('tab_switch', { count: newCount });
//                     updateAttemptViolations('tab_switches', newCount);

//                     if (newCount >= tabSwitchLimit) {
//                         setWarningMessage('Tab switch limit reached! Test will be auto-submitted.');
//                         onViolationLimitReached?.();
//                     } else {
//                         setWarningMessage(`Warning: Tab switch detected (${newCount}/${tabSwitchLimit})`);
//                         setTimeout(() => setWarningMessage(null), 3000);
//                     }

//                     return { ...prev, tabSwitches: newCount };
//                 });
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);
//         return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
//     }, [tabSwitchLimit, logViolation, updateAttemptViolations, onViolationLimitReached]);

//     // Fullscreen detection
//     useEffect(() => {
//         if (!fullscreenRequired) return;

//         const handleFullscreenChange = () => {
//             const isNowFullscreen = !!document.fullscreenElement;
//             setIsFullscreen(isNowFullscreen);

//             if (!isNowFullscreen && isInitialized.current) {
//                 setViolations(prev => {
//                     const newCount = prev.fullscreenExits + 1;
//                     logViolation('fullscreen_exit', { count: newCount });
//                     updateAttemptViolations('fullscreen_exits', newCount);
//                     setWarningMessage('Please return to fullscreen mode to continue the test.');
//                     return { ...prev, fullscreenExits: newCount };
//                 });
//             }
//         };

//         document.addEventListener('fullscreenchange', handleFullscreenChange);
//         return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
//     }, [fullscreenRequired, logViolation, updateAttemptViolations]);

//     // Copy/Paste prevention
//     useEffect(() => {
//         const handleCopy = (e: ClipboardEvent) => {
//             e.preventDefault();
//             setViolations(prev => {
//                 const newCount = prev.copyAttempts + 1;
//                 logViolation('copy_attempt', { count: newCount });
//                 updateAttemptViolations('copy_attempts', newCount);
//                 setWarningMessage('Copying is not allowed during the test.');
//                 setTimeout(() => setWarningMessage(null), 3000);
//                 return { ...prev, copyAttempts: newCount };
//             });
//         };

//         const handlePaste = (e: ClipboardEvent) => {
//             e.preventDefault();
//             logViolation('paste_attempt');
//             setWarningMessage('Pasting is not allowed during the test.');
//             setTimeout(() => setWarningMessage(null), 3000);
//         };

//         const handleCut = (e: ClipboardEvent) => {
//             e.preventDefault();
//             logViolation('copy_attempt', { type: 'cut' });
//             setWarningMessage('Cutting is not allowed during the test.');
//             setTimeout(() => setWarningMessage(null), 3000);
//         };

//         document.addEventListener('copy', handleCopy);
//         document.addEventListener('paste', handlePaste);
//         document.addEventListener('cut', handleCut);

//         return () => {
//             document.removeEventListener('copy', handleCopy);
//             document.removeEventListener('paste', handlePaste);
//             document.removeEventListener('cut', handleCut);
//         };
//     }, [logViolation, updateAttemptViolations]);

//     // Right-click prevention
//     useEffect(() => {
//         const handleContextMenu = (e: MouseEvent) => {
//             e.preventDefault();
//             setViolations(prev => {
//                 const newCount = prev.rightClickAttempts + 1;
//                 logViolation('right_click', { count: newCount });
//                 updateAttemptViolations('right_click_attempts', newCount);
//                 setWarningMessage('Right-click is disabled during the test.');
//                 setTimeout(() => setWarningMessage(null), 3000);
//                 return { ...prev, rightClickAttempts: newCount };
//             });
//         };

//         document.addEventListener('contextmenu', handleContextMenu);
//         return () => document.removeEventListener('contextmenu', handleContextMenu);
//     }, [logViolation, updateAttemptViolations]);

//     // DevTools detection
//     useEffect(() => {
//         const detectDevTools = () => {
//             const threshold = 160;
//             if (
//                 window.outerWidth - window.innerWidth > threshold ||
//                 window.outerHeight - window.innerHeight > threshold
//             ) {
//                 logViolation('devtools_open');
//                 setWarningMessage('Developer tools detected. Please close them.');
//             }
//         };

//         const interval = setInterval(detectDevTools, 1000);
//         return () => clearInterval(interval);
//     }, [logViolation]);

//     // Keyboard shortcuts prevention
//     useEffect(() => {
//         const handleKeyDown = (e: KeyboardEvent) => {
//             // Prevent common shortcuts
//             if (
//                 (e.ctrlKey || e.metaKey) &&
//                 ['c', 'v', 'x', 'a', 'p', 's', 'u', 'i', 'j'].includes(e.key.toLowerCase())
//             ) {
//                 e.preventDefault();
//                 logViolation('keyboard_shortcut', { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey });
//                 setWarningMessage('Keyboard shortcuts are disabled during the test.');
//                 setTimeout(() => setWarningMessage(null), 3000);
//             }

//             // Prevent F12
//             if (e.key === 'F12') {
//                 e.preventDefault();
//                 logViolation('devtools_open', { method: 'F12' });
//             }
//         };

//         document.addEventListener('keydown', handleKeyDown);
//         return () => document.removeEventListener('keydown', handleKeyDown);
//     }, [logViolation]);

//     // Text selection prevention
//     useEffect(() => {
//         const handleSelectStart = (e: Event) => {
//             e.preventDefault();
//         };

//         document.addEventListener('selectstart', handleSelectStart);
//         return () => document.removeEventListener('selectstart', handleSelectStart);
//     }, []);

//     // Page reload/back button detection
//     useEffect(() => {
//         const handleBeforeUnload = (e: BeforeUnloadEvent) => {
//             e.preventDefault();
//             logViolation('page_reload');
//             e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.';
//             return e.returnValue;
//         };

//         const handlePopState = () => {
//             logViolation('back_button');
//             setWarningMessage('Navigation is not allowed during the test.');
//             setTimeout(() => setWarningMessage(null), 3000);
//             window.history.pushState(null, '', window.location.href);
//         };

//         window.addEventListener('beforeunload', handleBeforeUnload);
//         window.addEventListener('popstate', handlePopState);
//         window.history.pushState(null, '', window.location.href);

//         return () => {
//             window.removeEventListener('beforeunload', handleBeforeUnload);
//             window.removeEventListener('popstate', handlePopState);
//         };
//     }, [logViolation]);

//     const enterFullscreen = useCallback(async () => {
//         try {
//             await document.documentElement.requestFullscreen();
//             setIsFullscreen(true);
//             isInitialized.current = true;
//         } catch (error) {
//             console.error('Failed to enter fullscreen:', error);
//         }
//     }, []);

//     const exitFullscreen = useCallback(async () => {
//         try {
//             if (document.fullscreenElement) {
//                 await document.exitFullscreen();
//             }
//             setIsFullscreen(false);
//         } catch (error) {
//             console.error('Failed to exit fullscreen:', error);
//         }
//     }, []);

//     return {
//         violations,
//         isFullscreen,
//         warningMessage,
//         enterFullscreen,
//         exitFullscreen,
//         clearWarning: () => setWarningMessage(null),
//     };
// }
