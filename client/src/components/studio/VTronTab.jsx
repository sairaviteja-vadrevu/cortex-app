import { replicate, fileToDataUri } from "../../utils/replicate";
import { useState, useRef } from "react";
import { addAsset } from "../../stores/assetStore";
import { Button } from "../ui/Button";
import { cardStyle, inputStyle, panelStyle } from "../../utils/theme";

export function VTronTab() {
  // V-Tron state
  const [personImage, setPersonImage] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [vtronResult, setVtronResult] = useState(null);
  const [vtronGenerating, setVtronGenerating] = useState(false);
  const [vtronError, setVtronError] = useState("");
  const [vtronStep, setVtronStep] = useState("");
  const [vtronCategory, setVtronCategory] = useState("upper_body");
  const [vtronDesc, setVtronDesc] = useState("");
  const [vtronBg, setVtronBg] = useState("keep");
  const [vtronPose, setVtronPose] = useState("original");
  const personRef = useRef(null);
  const productRef = useRef(null);

  // V-Tron handlers
  const handlePersonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonImage(file);
    setPersonPreview(URL.createObjectURL(file));
    setVtronResult(null);
  };

  const handleProductUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImage(file);
    setProductPreview(URL.createObjectURL(file));
    setVtronResult(null);
  };

  const handleVtronGenerate = async () => {
    if (!personImage || !productImage || vtronGenerating) return;
    setVtronGenerating(true);
    setVtronError("");
    setVtronResult(null);

    try {
      const personDataUri = await fileToDataUri(personImage);
      const productDataUri = await fileToDataUri(productImage);

      // Step 1: Virtual try-on with IDM-VTON at max quality
      setVtronStep("Fitting garment onto person...");
      const tryonOutput = await replicate("cuuupid/idm-vton", {
        human_img: personDataUri,
        garm_img: productDataUri,
        garment_des: vtronDesc || "clothing garment",
        category: vtronCategory,
        crop: true,
        steps: 40,
      });
      const tryonUrl = Array.isArray(tryonOutput) ? tryonOutput[0] : tryonOutput;

      // Step 2: Nano-banana refinement — this is where the magic happens
      setVtronStep("Perfecting the final look...");
      const bgPrompts = {
        keep: "Do NOT change the background at all. Keep the exact original background, every detail.",
        studio: "Change ONLY the background to a clean professional photography studio with soft white backdrop and even studio lighting. Do not touch the person or garment.",
        outdoor: "Change ONLY the background to a beautiful natural outdoor setting with soft golden hour sunlight and creamy bokeh. Do not touch the person or garment.",
        minimal: "Change ONLY the background to a clean solid light gray backdrop, like a fashion e-commerce catalogue. Do not touch the person or garment.",
      };
      const posePrompts = {
        original: "",
        standing: "Adjust the person to a confident straight standing pose facing the camera.",
        casual: "Adjust the person to a relaxed natural pose, body slightly angled, one hand on hip.",
        fashion: "Adjust the person to a dynamic fashion editorial pose with attitude.",
      };

      const refineParts = [
        "This is a virtual try-on photo. Your job is to make it look indistinguishable from a real photograph taken by a professional photographer.",
        "Fix ONLY these things: any visible seam or blending artifact where the garment meets skin, any unnatural edge or color mismatch, any lighting inconsistency on the garment.",
        "Do NOT add beautification, do NOT smooth skin, do NOT change the person's face or features, do NOT add filters or color grading. The goal is raw realism, not beauty.",
        "The garment must have natural fabric texture, realistic wrinkles, proper shadows where it folds, and correct interaction with the body underneath.",
        bgPrompts[vtronBg] || bgPrompts.keep,
        posePrompts[vtronPose] || "",
        "Output must look like it was shot on a DSLR camera — natural skin texture visible, no airbrushing, real lighting.",
      ].filter(Boolean).join(" ");

      const refineOutput = await replicate("google/nano-banana", {
        prompt: refineParts,
        image_input: [tryonUrl],
        aspect_ratio: "match_input_image",
        output_format: "png",
      });
      const resultUrl = Array.isArray(refineOutput) ? refineOutput[0] : refineOutput;

      setVtronResult(resultUrl);
      setVtronStep("");
    } catch (err) {
      console.error("V-Tron failed:", err);
      setVtronError(err.message || "Virtual try-on failed. Try again.");
      setVtronStep("");
    } finally {
      setVtronGenerating(false);
    }
  };

  const uploadBoxStyle = {
    flex: 1,
    minHeight: 220,
    borderRadius: 12,
    border: "3px dashed var(--surface-3)",
    background: "var(--surface-0)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
    position: "relative",
  };

  return (
    <>
      <section style={{ ...panelStyle, padding: 24, marginBottom: 32 }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text)", marginBottom: 4 }}>Virtual Try-On</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>
          Upload a person image and a garment image. The AI will generate the person wearing the garment with photorealistic quality.
        </p>

        {/* Category selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 500 }}>Category:</span>
          {[
            { id: "upper_body", label: "Upper Body" },
            { id: "lower_body", label: "Lower Body" },
            { id: "dresses", label: "Dresses" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setVtronCategory(cat.id)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                fontWeight: vtronCategory === cat.id ? 600 : 400,
                border: vtronCategory === cat.id ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                background: vtronCategory === cat.id ? "var(--accent)" : "var(--surface-0)",
                color: vtronCategory === cat.id ? "var(--accent-text)" : "var(--text-muted)",
                boxShadow: vtronCategory === cat.id ? "var(--neu-shadow-sm)" : "none",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Garment description */}
        <input
          value={vtronDesc}
          onChange={(e) => setVtronDesc(e.target.value)}
          placeholder="Describe the garment (e.g. Black leather jacket, Red floral dress)..."
          style={{ ...inputStyle, fontSize: 13, marginBottom: 14 }}
        />

        {/* Background option */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 500, minWidth: 75 }}>Background:</span>
          {[
            { id: "keep", label: "Keep Original" },
            { id: "studio", label: "Studio" },
            { id: "outdoor", label: "Outdoor" },
            { id: "minimal", label: "Minimal" },
          ].map((bg) => (
            <button
              key={bg.id}
              onClick={() => setVtronBg(bg.id)}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                fontWeight: vtronBg === bg.id ? 600 : 400,
                border: vtronBg === bg.id ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                background: vtronBg === bg.id ? "var(--accent)" : "var(--surface-0)",
                color: vtronBg === bg.id ? "var(--accent-text)" : "var(--text-muted)",
                boxShadow: vtronBg === bg.id ? "var(--neu-shadow-sm)" : "none",
              }}
            >
              {bg.label}
            </button>
          ))}
        </div>

        {/* Pose option */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 500, minWidth: 75 }}>Pose:</span>
          {[
            { id: "original", label: "Original" },
            { id: "standing", label: "Standing" },
            { id: "casual", label: "Casual" },
            { id: "fashion", label: "Fashion" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setVtronPose(p.id)}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
                fontWeight: vtronPose === p.id ? 600 : 400,
                border: vtronPose === p.id ? "2px solid var(--border)" : "2px solid var(--surface-3)",
                background: vtronPose === p.id ? "var(--accent)" : "var(--surface-0)",
                color: vtronPose === p.id ? "var(--accent-text)" : "var(--text-muted)",
                boxShadow: vtronPose === p.id ? "var(--neu-shadow-sm)" : "none",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {/* Person Image Upload */}
          <div
            style={uploadBoxStyle}
            onClick={() => personRef.current?.click()}
          >
            <input ref={personRef} type="file" accept="image/*" className="hidden" onChange={handlePersonUpload} />
            {personPreview ? (
              <img src={personPreview} alt="Person" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" />
                </svg>
                <span style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 500, marginTop: 8 }}>Person Image</span>
                <span style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 4 }}>Click to upload</span>
              </>
            )}
          </div>

          {/* Product Image Upload */}
          <div
            style={uploadBoxStyle}
            onClick={() => productRef.current?.click()}
          >
            <input ref={productRef} type="file" accept="image/*" className="hidden" onChange={handleProductUpload} />
            {productPreview ? (
              <img src={productPreview} alt="Product" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 500, marginTop: 8 }}>Product Image</span>
                <span style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 4 }}>Click to upload</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ color: "var(--text-dim)", fontSize: 11 }}>
            {personImage && productImage ? "Both images ready" : "Upload both images to generate"}
          </p>
          <Button onClick={handleVtronGenerate} disabled={!personImage || !productImage || vtronGenerating}>
            {vtronGenerating ? "Generating..." : "Generate Try-On"}
          </Button>
        </div>
      </section>

      {vtronGenerating && (
        <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ color: "var(--text)", margin: "0 auto 12px" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{vtronStep || "Processing..."}</p>
          <p style={{ color: "var(--text-dim)", fontSize: 12 }}>Try-on → Refine (2-3 minutes)</p>
        </div>
      )}

      {vtronError && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: "rgba(255,107,107,0.12)", border: "2px solid var(--accent-secondary)", marginBottom: 16 }}>
          <p style={{ color: "var(--accent-secondary)", fontSize: 12 }}>{vtronError}</p>
        </div>
      )}

      {vtronResult && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <img src={vtronResult} alt="V-Tron Result" style={{ width: "100%", maxHeight: 600, objectFit: "contain", backgroundColor: "var(--surface-0)" }} />
          <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Virtual Try-On Result</p>
            <Button variant="secondary" size="sm" onClick={() => { addAsset({ name: "V-Tron Result", type: "image", url: vtronResult, thumbnail: vtronResult, source: "ai-generated" }); }}>
              Save to Assets
            </Button>
          </div>
        </div>
      )}

      {!vtronResult && !vtronGenerating && !vtronError && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="var(--surface-3)" style={{ margin: "0 auto 12px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>Upload a person and product image to try on.</p>
        </div>
      )}
    </>
  );
}
