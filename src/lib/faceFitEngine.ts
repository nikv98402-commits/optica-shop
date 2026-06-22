import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FaceFitEngineStatus = 'idle' | 'loading' | 'ready' | 'no_face' | 'multiple_faces' | 'unsupported_photo' | 'error';

export interface FaceFitMeasurement {
  status: FaceFitEngineStatus;
  confidence: number;
  faceCount: number;
  eyeDistanceRatio: number;
  frameWidthHint: number;
  eyeLineTiltDeg: number;
  bridgeOffsetPct: number;
  overlayPoints: Array<{ id: string; x: number; y: number }>;
  checks: string[];
  limitations: string[];
}

const WASM_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function getFaceLandmarker() {
  faceLandmarkerPromise ??= FilesetResolver.forVisionTasks(WASM_ASSET_PATH).then((vision) =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL,
        delegate: 'CPU',
      },
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      runningMode: 'IMAGE',
      numFaces: 2,
    }),
  );

  return faceLandmarkerPromise;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = src;
  });
}

export function unsupportedPhotoMeasurement(fileName?: string): FaceFitMeasurement {
  const formatHint = fileName ? ` Файл: ${fileName}.` : '';

  return {
    status: 'unsupported_photo',
    confidence: 0,
    faceCount: 0,
    eyeDistanceRatio: 0,
    frameWidthHint: 66,
    eyeLineTiltDeg: 0,
    bridgeOffsetPct: 0,
    overlayPoints: [],
    checks: [`Не удалось открыть фото в браузере.${formatHint} Загрузите JPEG, PNG или WebP.`],
    limitations: ['HEIC/HEIF с iPhone часто не отображается в Chrome без конвертации. Фото не отправляется на сервер ViLu.'],
  };
}

function averagePoint(landmarks: NormalizedLandmark[], indexes: number[]) {
  const sum = indexes.reduce(
    (acc, index) => {
      const point = landmarks[index];
      return point ? { x: acc.x + point.x, y: acc.y + point.y } : acc;
    },
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / indexes.length,
    y: sum.y / indexes.length,
  };
}

function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function confidenceFrom({
  eyeDistanceRatio,
  faceWidthRatio,
  eyeLineTiltDeg,
  bridgeOffsetPct,
}: {
  eyeDistanceRatio: number;
  faceWidthRatio: number;
  eyeLineTiltDeg: number;
  bridgeOffsetPct: number;
}) {
  let confidence = 92;

  if (eyeDistanceRatio < 0.18) confidence -= 18;
  if (eyeDistanceRatio > 0.34) confidence -= 8;
  if (faceWidthRatio < 0.34) confidence -= 12;
  if (faceWidthRatio > 0.72) confidence -= 10;
  if (Math.abs(eyeLineTiltDeg) > 7) confidence -= 14;
  if (Math.abs(bridgeOffsetPct) > 6) confidence -= 10;

  return Math.max(42, Math.min(96, Math.round(confidence)));
}

export async function analyzeFacePhoto(photoUrl: string): Promise<FaceFitMeasurement> {
  try {
    const [faceLandmarker, image] = await Promise.all([getFaceLandmarker(), loadImage(photoUrl)]);
    const result = faceLandmarker.detect(image);
    const faceCount = result.faceLandmarks.length;

    if (faceCount === 0) {
      return {
        status: 'no_face',
        confidence: 0,
        faceCount,
        eyeDistanceRatio: 0,
        frameWidthHint: 66,
        eyeLineTiltDeg: 0,
        bridgeOffsetPct: 0,
        overlayPoints: [],
        checks: ['Лицо не найдено. Загрузите фото анфас при хорошем освещении.'],
        limitations: ['Без найденных ориентиров нельзя корректно оценить посадку оправы.'],
      };
    }

    if (faceCount > 1) {
      return {
        status: 'multiple_faces',
        confidence: 0,
        faceCount,
        eyeDistanceRatio: 0,
        frameWidthHint: 66,
        eyeLineTiltDeg: 0,
        bridgeOffsetPct: 0,
        overlayPoints: [],
        checks: ['На фото найдено больше одного лица. Для примерки нужно одно лицо крупным планом.'],
        limitations: ['Алгоритм не выбирает пользователя среди нескольких лиц.'],
      };
    }

    const landmarks = result.faceLandmarks[0];
    const leftEye = averagePoint(landmarks, [33, 133, 159, 145]);
    const rightEye = averagePoint(landmarks, [362, 263, 386, 374]);
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const noseBridge = landmarks[168] ?? landmarks[6];
    const noseTip = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };
    const faceWidthRatio = pointDistance(leftCheek, rightCheek);
    const eyeDistanceRatio = pointDistance(leftEye, rightEye);
    const eyeLineTiltDeg = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
    const bridgeOffsetPct = (noseBridge.x - eyeMidpoint.x) * 100;
    const frameWidthHint = Math.round(Math.min(82, Math.max(48, faceWidthRatio * 118)));
    const confidence = confidenceFrom({ eyeDistanceRatio, faceWidthRatio, eyeLineTiltDeg, bridgeOffsetPct });

    const checks = [
      `Глаза найдены, межзрачковая линия наклонена примерно на ${Math.abs(eyeLineTiltDeg).toFixed(1)} градуса.`,
      `Рекомендуемый стартовый масштаб оправы: ${frameWidthHint}%.`,
      Math.abs(bridgeOffsetPct) <= 6
        ? 'Центр переносицы близко к центру глаз, можно оценивать посадку.'
        : 'Лицо немного повернуто или смещено, лучше загрузить фото строго анфас.',
    ];

    return {
      status: 'ready',
      confidence,
      faceCount,
      eyeDistanceRatio: Number(eyeDistanceRatio.toFixed(3)),
      frameWidthHint,
      eyeLineTiltDeg: Number(eyeLineTiltDeg.toFixed(1)),
      bridgeOffsetPct: Number(bridgeOffsetPct.toFixed(1)),
      overlayPoints: [
        { id: 'left-eye', x: leftEye.x * 100, y: leftEye.y * 100 },
        { id: 'right-eye', x: rightEye.x * 100, y: rightEye.y * 100 },
        { id: 'bridge', x: noseBridge.x * 100, y: noseBridge.y * 100 },
        { id: 'nose', x: noseTip.x * 100, y: noseTip.y * 100 },
        { id: 'chin', x: chin.x * 100, y: chin.y * 100 },
        { id: 'forehead', x: forehead.x * 100, y: forehead.y * 100 },
      ],
      checks,
      limitations: [
        'Обычная камера не дает точную ширину лица в миллиметрах без калибровки.',
        'Алгоритм не оценивает давление дужек, вес оправы и комфорт на переносице.',
        'Финальную посадку, PD и совместимость линз должен подтвердить специалист в салоне.',
      ],
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Image failed to load') {
      return unsupportedPhotoMeasurement();
    }

    return {
      status: 'error',
      confidence: 0,
      faceCount: 0,
      eyeDistanceRatio: 0,
      frameWidthHint: 66,
      eyeLineTiltDeg: 0,
      bridgeOffsetPct: 0,
      overlayPoints: [],
      checks: ['Не удалось загрузить MediaPipe Face Landmarker. Базовая примерка продолжает работать.'],
      limitations: ['Проверьте сеть или повторите попытку позже. Фото не отправляется на сервер ViLu.'],
    };
  }
}
