// import { useEffect, useRef, useState } from 'react';
// import * as tf from '@tensorflow/tfjs';
// import * as blazeface from '@tensorflow-models/blazeface';

// interface AIProctorConfig {
//   attemptId: string;
//   isActive: boolean;
//   onViolation: (type: string, message: string) => void;
// }

// export type TrackingStatus = 'initializing' | 'detecting' | 'no_face' | 'multiple_faces' | 'looking_away' | 'looking_down';

// export function useAIProctor({ attemptId, isActive, onViolation }: AIProctorConfig) {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
//   const requestRef = useRef<number>();
//   const streamRef = useRef<MediaStream | null>(null);
  
//   const [isInitializing, setIsInitializing] = useState(true);
//   const [hasCamera, setHasCamera] = useState(false);
//   const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
//   const [aiStatus, setAiStatus] = useState<TrackingStatus>('initializing');

//   const violationCounters = useRef({
//     noFace: 0,
//     multipleFaces: 0,
//     lookingAway: 0,
//     lookingDown: 0,
//   });

//   // --- STEP 1: LOAD AI & GET CAMERA STREAM ---
//   useEffect(() => {
//     let isMounted = true;

//     const initResources = async () => {
//       if (!isActive) return;

//       try {
//         // 1. Load Model & Stream in parallel
//         const [model, stream] = await Promise.all([
//           (async () => {
//             await tf.ready();
//             return await blazeface.load();
//           })(),
//           (async () => {
//              if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//                throw new Error('No Camera API');
//              }
//              return await navigator.mediaDevices.getUserMedia({ 
//                video: { width: 640, height: 480, facingMode: 'user' },
//                audio: false 
//              });
//           })()
//         ]);

//         if (!isMounted) return;

//         // 2. Store them in Refs (Don't touch UI yet)
//         modelRef.current = model;
//         streamRef.current = stream;

//         // 3. Update State to Render the Video Element
//         setHasCamera(true);
//         setCameraPermission('granted');
//         setIsInitializing(false);

//       } catch (err: any) {
//         console.error("AI Init Failed:", err);
//         if (isMounted) {
//           setIsInitializing(false);
//           setCameraPermission('denied');
//         }
//       }
//     };

//     initResources();

//     return () => {
//       isMounted = false;
//       if (requestRef.current) cancelAnimationFrame(requestRef.current);
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, [isActive]);

//   // --- STEP 2: ATTACH STREAM TO VIDEO (Runs after UI updates) ---
//   useEffect(() => {
//     // We wait for 'hasCamera' to be true, which implies the <video> tag is now rendered
//     if (hasCamera && videoRef.current && streamRef.current) {
      
//       // Only attach if not already attached
//       if (videoRef.current.srcObject !== streamRef.current) {
//         videoRef.current.srcObject = streamRef.current;
        
//         videoRef.current.play()
//           .then(() => {
//             // Only start detection loop after video is actually playing
//             detectBehavior();
//           })
//           .catch(e => console.error("Video Play Error:", e));
//       }
//     }
//   }, [hasCamera, isInitializing]); // Dependencies ensure this runs AFTER Step 1 finishes

//   // --- STEP 3: DETECTION LOOP ---
//   const detectBehavior = async () => {
//     if (!modelRef.current || !videoRef.current || !isActive) return;

//     // Safety: ensure video is ready
//     if (videoRef.current.readyState < 2) { 
//        requestRef.current = requestAnimationFrame(detectBehavior);
//        return;
//     }

//     const returnTensors = false;
//     const predictions = await modelRef.current.estimateFaces(videoRef.current, returnTensors);

//     if (predictions.length === 0) {
//       // --- NO FACE ---
//       violationCounters.current.noFace++;
//       setAiStatus('no_face');

//       // 60 frames = approx 2 seconds
//       if (violationCounters.current.noFace > 60) {
//          onViolation('no_face', 'Face not visible. Stay in frame.');
//          violationCounters.current.noFace = 0; 
//       }
//     } else if (predictions.length > 1) {
//       // --- MULTIPLE FACES ---
//       violationCounters.current.multipleFaces++;
//       setAiStatus('multiple_faces');

//       if (violationCounters.current.multipleFaces > 30) { 
//         onViolation('multiple_faces', 'Multiple people detected!');
//         violationCounters.current.multipleFaces = 0;
//       }
//     } else {
//       // --- ONE FACE ANALYTICS ---
//       violationCounters.current.noFace = 0;
//       violationCounters.current.multipleFaces = 0;

//       const face = predictions[0] as any;
//       const start = face.topLeft as [number, number];
//       const end = face.bottomRight as [number, number];
//       const landmarks = face.landmarks as number[][];
      
//       const rightEye = landmarks[0];
//       const leftEye = landmarks[1];
//       const nose = landmarks[2];

//       // 1. Horizontal Check
//       const faceWidth = end[0] - start[0];
//       const eyesMidpointX = (rightEye[0] + leftEye[0]) / 2;
//       const horizontalDeviation = Math.abs(nose[0] - eyesMidpointX);
//       const normalizedDeviation = horizontalDeviation / faceWidth;

//       // 2. Vertical Check (Looking Down)
//       const eyesMidpointY = (rightEye[1] + leftEye[1]) / 2;
//       const faceHeight = end[1] - start[1];
//       const verticalDist = nose[1] - eyesMidpointY;
//       const verticalRatio = verticalDist / faceHeight;

//       if (normalizedDeviation > 0.20) {
//         violationCounters.current.lookingAway++;
//         setAiStatus('looking_away');
        
//         if (violationCounters.current.lookingAway > 45) { // ~1.5s
//            onViolation('looking_away', 'Suspicious gaze detected.');
//            violationCounters.current.lookingAway = 0;
//         }
//       } else if (verticalRatio > 0.65) { 
//          violationCounters.current.lookingDown++;
//          setAiStatus('looking_down');

//          if (violationCounters.current.lookingDown > 45) { // ~1.5s
//             onViolation('looking_down', 'Please keep your head up.');
//             violationCounters.current.lookingDown = 0;
//          }
//       } else {
//         setAiStatus('detecting');
//         violationCounters.current.lookingAway = Math.max(0, violationCounters.current.lookingAway - 2);
//         violationCounters.current.lookingDown = Math.max(0, violationCounters.current.lookingDown - 2);
//       }
//     }

//     requestRef.current = requestAnimationFrame(detectBehavior);
//   };

//   return {
//     videoRef,
//     isModelLoading: isInitializing,
//     hasCamera,
//     cameraPermission,
//     aiStatus
//   };