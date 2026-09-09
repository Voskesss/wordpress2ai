export default function OverstapVisual() {
  return (
    <div
      className="transfer-visual"
      aria-label="Van je bestaande WordPress-website naar aanpassen met AI. Illustratief voorbeeld."
    >
      <div className="transfer-origin">
        <span className="wordpress-symbol">W</span>
        <div>
          <strong>Je bestaande WordPress-site</strong>
          <span>Jouw ontwerp. Jouw inhoud. Jouw domein.</span>
        </div>
        <span aria-hidden="true">↗</span>
      </div>
      <div className="transfer-connector">
        <span>We nemen mee</span>
        <div>
          URL’s <b>✓</b> &nbsp; Structuur <b>✓</b> &nbsp; SEO-instellingen{" "}
          <b>✓</b>
        </div>
      </div>
      <div className="transfer-window">
        <div className="transfer-browser">
          <span aria-hidden="true">● ● ●</span>
          <span>jouwwebsite.nl</span>
          <span>↗</span>
        </div>
        <div className="transfer-website">
          <div className="transfer-site-nav">
            <strong>
              Jouw bedrijf<span>.</span>
            </strong>
            <span>Diensten &nbsp; Over ons &nbsp; Contact</span>
          </div>
          <p>VERTROUWD VOOR JE BEZOEKERS</p>
          <h2>
            Dezelfde uitstraling.
            <br />
            Een nieuw begin.
          </h2>
          <div className="transfer-site-lines" aria-hidden="true">
            <i />
            <i />
          </div>
          <span className="transfer-site-button">Maak kennis →</span>
          <div className="transfer-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="transfer-request">
          <span>JIJ VRAAGT</span>
          <p>“Zet erbij dat we zaterdag open zijn.”</p>
        </div>
        <div className="transfer-result">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Je wijziging staat klaar.</strong>
            <p>Bekijk het voorbeeld. Jij beslist wat live gaat.</p>
          </div>
        </div>
      </div>
      <p className="transfer-footnote">Zo werkt het · Illustratief voorbeeld</p>
    </div>
  );
}
