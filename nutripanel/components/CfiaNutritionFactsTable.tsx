"use client";

/**
 * CFIA-compliant Bilingual Nutrition Facts table.
 * Matches Figure 3.1(B) Bilingual Standard Format and reference layout.
 *
 * Calories row: flex (not grid) — left block = Calories + thick rule; right block = % DV lines.
 * Thick rule under Calories only (3px); % Daily Value / % valeur quotidienne right-aligned.
 */
import type { CfiaLabel } from "@/lib/cfia-label-engine";

type Props = {
  label: CfiaLabel;
  servingHousehold?: string;
  servingHouseholdFr?: string;
};

function formatServing(
  servingSizeG: number,
  household?: string,
  householdFr?: string
): { en: string; fr: string } {
  const metric = `${Math.round(servingSizeG)} g`;
  if (household && householdFr) {
    return { en: `Per ${household} (${metric})`, fr: `pour ${householdFr} (${metric})` };
  }
  return { en: `Per ${metric}`, fr: `pour ${metric}` };
}

/* Divider weights per CFIA: thin 0.5pt, thick 2.5pt */
const THIN = "1px solid #000";           /* 0.5pt: between nutrients, under serving */
const THICK = "3px solid #000";          /* 2.5pt: under Calories (left only), under Sodium, under Iron */

export function CfiaNutritionFactsTable({
  label,
  servingHousehold,
  servingHouseholdFr,
}: Props) {
  const serving = formatServing(label.servingSizeG, servingHousehold, servingHouseholdFr);
  const p = label.perServing;
  const dv = label.dailyValuePercent ?? {
    fat: 0, saturatedPlusTrans: 0, fibre: 0, sugars: 0,
    sodium: 0, potassium: 0, calcium: 0, iron: 0,
  };

  return (
    <div
      className="cfia-nft inline-block bg-white text-black antialiased"
      style={{
        fontFamily: "Arial",
        border: "1px solid #000",
        padding: "4px",
        minWidth: "200px",
      }}
    >
      {/* Header: 13pt bold */}
      <div style={{ fontSize: "13pt", fontWeight: 700, lineHeight: 1 }}>
        Nutrition Facts
      </div>
      <div style={{ fontSize: "13pt", fontWeight: 700, lineHeight: "14pt" }}>
        Valeur nutritive
      </div>

      {/* Serving: 9pt; 11pt/10pt leading */}
      <div style={{ fontSize: "9pt", lineHeight: "11pt", marginTop: "1px" }}>
        {serving.en}
      </div>
      <div style={{ fontSize: "9pt", lineHeight: "10pt" }}>
        {serving.fr}
      </div>

      <div style={{ borderBottom: THIN, margin: "1px 0" }} />

      {/* Calories row: separate left/right blocks for independent positioning */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontSize: "10pt", fontWeight: 800, lineHeight: "14.5pt" }}>
            Calories {p.calories}
          </div>
          <div style={{ borderBottom: "3px solid rgb(0, 0, 0)", marginTop: "-2px" }} />
        </div>
        <div
          style={{
            marginLeft: "auto",
            textAlign: "right",
            fontSize: "6pt",
            fontWeight: 700,
            lineHeight: "3pt",
          }}
        >
          <div style={{ marginTop: "-1px" }}>
            <span style={{ marginRight: "4px" }}>% Daily Value</span>
            <span style={{ fontSize: "9pt", fontWeight: 400, verticalAlign: "-0.11em", lineHeight: 1, marginLeft: "-5px" }}>*</span>
          </div>
          <div style={{ marginTop: "-1px" }}>
            <span style={{ marginRight: "4px" }}>% valeur quotidienne</span>
            <span style={{ fontSize: "9pt", fontWeight: 400, verticalAlign: "-0.11em", lineHeight: 1, marginLeft: "-5px" }}>*</span>
          </div>
        </div>
      </div>

      <NutrientRow left={<><span style={{ fontWeight: 800 }}>Fat / Lipides</span> {p.fatG} g</>} right={`${dv.fat} %`} leading="12.5pt" />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: "0 0 auto", fontSize: "8pt", lineHeight: "9pt" }}>
          <div style={{ marginLeft: "8px" }}>Saturated / saturés {p.saturatedG} g</div>
          <div style={{ marginLeft: "8px", marginTop: "1px" }}>+ Trans / + trans {p.transG} g</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "8pt", textAlign: "right", width: "44px", flexShrink: 0 }}>
          {dv.saturatedPlusTrans} %
        </div>
      </div>
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />

      <NutrientRow left={<><span style={{ fontWeight: 800 }}>Carbohydrate / Glucides</span> {p.carbsG} g</>} leading="10pt" />
      <div style={{ marginBottom: "0.5px" }}>
        <NutrientRow left={<span style={{ marginLeft: "8px" }}>Fibre / Fibres {p.fibreG} g</span>} right={`${dv.fibre} %`} leading="9pt" />
      </div>
      <NutrientRow left={<span style={{ marginLeft: "8px" }}>Sugars / Sucres {p.sugarsG} g</span>} right={`${dv.sugars} %`} leading="9pt" />
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />

      <NutrientRow left={<><span style={{ fontWeight: 800 }}>Protein / Protéines</span> {p.proteinG} g</>} leading="10pt" />
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />
      <NutrientRow left={<><span style={{ fontWeight: 800 }}>Cholesterol / Cholestérol</span> {p.cholesterolMg} mg</>} leading="10pt" />
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />
      <NutrientRow left={<><span style={{ fontWeight: 800 }}>Sodium</span> {p.sodiumMg} mg</>} right={`${dv.sodium} %`} leading="10pt" />

      <div style={{ borderBottom: THICK, margin: "1px 0" }} />

      <NutrientRow left={<>Potassium {p.potassiumMg} mg</>} right={`${dv.potassium} %`} leading="12.5pt" />
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />
      <NutrientRow left={<>Calcium {p.calciumMg} mg</>} right={`${dv.calcium} %`} leading="10pt" />
      <div style={{ borderBottom: THIN, margin: "1px 0" }} />
      <NutrientRow left={<>Iron / Fer {p.ironMg} mg</>} right={`${dv.iron} %`} leading="10pt" />

      <div style={{ borderBottom: THICK, margin: "1px 0" }} />

      <div style={{ fontSize: "6.5pt", lineHeight: "9pt", marginTop: "2px" }}>
        <span>* 5 % or less is </span><b>a little</b><span>, 15 % or more is </span><b>a lot</b>
      </div>
      <div style={{ fontSize: "6.5pt", lineHeight: "7.5pt" }}>
        <span>* 5 % ou moins, c&apos;est </span><b>peu</b><span>, 15 % ou plus c&apos;est </span><b>beaucoup</b>
      </div>
    </div>
  );
}

function NutrientRow({
  left,
  right,
  leading = "9pt",
}: { left: React.ReactNode; right?: string; leading?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "8px",
        lineHeight: leading,
        fontSize: "8pt",
        marginTop: "0",
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>{left}</div>
      {right != null && (
        <div style={{ width: "44px", flexShrink: 0, textAlign: "right" }}>{right}</div>
      )}
    </div>
  );
}
