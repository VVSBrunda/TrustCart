import { useEffect, useState } from 'react';
import { api } from '../api';

export default function About() {
  const [ml, setMl] = useState(null);
  useEffect(() => { api.health().then(setMl).catch(() => setMl({ ml: { status: 'down' } })); }, []);
  return (
    <article className="prose">
      <h1>About Trust Cart</h1>
      <p><strong>The problem.</strong> Shoppers can't easily tell whether a product photo is genuine or edited, similar products can be priced very differently across stores, and trust signals are scattered. Trust Cart puts authenticity information and price context in one place.</p>

      <h2>How the AI image check works</h2>
      <ol>
        <li><strong>Pre-processing</strong> - the uploaded image is resized and normalised.</li>
        <li><strong>Feature extraction</strong> - the model looks at compression consistency, sensor-noise consistency, repeated (cloned) regions and file metadata.</li>
        <li><strong>Authenticity score</strong> - the signals are combined into a score from 0 to 100.</li>
        <li><strong>Decision / review</strong> - the score becomes a badge:
          <ul>
            <li><span className="pill clear">75+</span> <strong>Image Check: Passed</strong> - likely original</li>
            <li><span className="pill slight">45-74</span> <strong>Review Needed</strong> - inconclusive</li>
            <li><span className="pill flag">below 45</span> <strong>Potentially Edited</strong> - signs of editing found</li>
          </ul>
        </li>
      </ol>

      <h2>What a badge does <em>not</em> mean</h2>
      <p>A badge is an AI assessment - an indicator, not absolute proof. Normal product photography often involves legitimate retouching (colour correction, background clean-up), and a clean result does not guarantee a photo is truthful. If an image cannot be analysed, Trust Cart never marks it as original; it shows “Not checked”. Sellers can <strong>appeal</strong> a result and re-run the check.</p>

      <h2>Price comparison</h2>
      <p>Similar products are matched on title, brand, category and key attributes, so a different model is not mistaken for the same product. In this prototype, external prices come from a <strong>mock comparison dataset</strong>; a production system would use authorised APIs or partner feeds and show the source and time of every price.</p>

      <h2>System status</h2>
      <p className="muted">AI image-analysis service: {!ml ? 'checking…' : ml.ml?.status === 'ok' ? <strong className="success-text">online ({ml.ml.model})</strong> : <strong className="error-text">offline - uploads will be marked “Not checked”</strong>}</p>
    </article>
  );
}
