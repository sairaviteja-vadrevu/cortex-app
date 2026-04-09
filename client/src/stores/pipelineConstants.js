/* ─── Available models (Replicate only) ─── */
export const IMAGE_MODELS = [
  { id: "google/nano-banana", label: "Nano Banana" },
];

export const VIDEO_MODELS = [
  { id: "xai/grok-imagine-video", label: "Grok Video" },
  { id: "kwaivgi/kling-v3-video", label: "Kling V3" },
  { id: "kwaivgi/kling-v3-omni-video", label: "Kling V3 Omni" },
  { id: "tencent/hunyuan-video", label: "Hunyuan Video" },
  { id: "luma/ray", label: "Luma Ray" },
];

export const MERGE_MODEL = { id: "lucataco/video-merge", label: "Video Merge" };
export const AUDIO_MERGE_MODEL = { id: "lucataco/video-audio-merge", label: "Video + Audio Merge" };

export const IMAGE_SIZES = [
  { id: "landscape_16_9", label: "16:9" },
  { id: "portrait_4_3",   label: "4:3 Portrait" },
  { id: "square_hd",      label: "Square" },
  { id: "landscape_4_3",  label: "4:3 Landscape" },
];

export const RESOLUTIONS = [
  { id: "0.5K", label: "512px" },
  { id: "1K",   label: "1K" },
  { id: "2K",   label: "2K" },
];

export const OUTPUT_FORMATS = [
  { id: "png", label: "PNG" },
  { id: "jpeg", label: "JPEG" },
  { id: "webp", label: "WebP" },
];
