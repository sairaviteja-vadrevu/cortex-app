import { apiFetch } from "./api";

const POLL_INTERVAL = 2000;

export async function replicate(model, input, onProgress) {
  let res = await apiFetch(`/api/models/${model}/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (res.status === 404) {
    const versionRes = await apiFetch(`/api/model-version/${model}`);
    if (!versionRes.ok) throw new Error(`Model ${model} not found`);
    const { version } = await versionRes.json();

    res = await apiFetch(`/api/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, input }),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate submit failed (${res.status}): ${text}`);
  }

  let prediction = await res.json();

  while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const pollRes = await apiFetch(`/api/predictions/${prediction.id}`);
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`Replicate poll failed (${pollRes.status}): ${text}`);
    }
    prediction = await pollRes.json();
    if (onProgress) onProgress(prediction);
  }

  if (prediction.status === "failed") throw new Error(prediction.error || "Replicate prediction failed");
  if (prediction.status === "canceled") throw new Error("Replicate prediction was canceled");

  return prediction.output;
}

export function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
