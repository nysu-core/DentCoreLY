import { PrismaClient, FieldType } from "@prisma/client";

const prisma = new PrismaClient();

type FieldDef = {
  label: string;
  fieldKey: string;
  type: FieldType;
  options?: string[];
  isRequired?: boolean;
};
type SectionDef = { title: string; fields: FieldDef[] };

async function buildTemplate(
  departmentId: string,
  name: string,
  moduleKey: string,
  sections: SectionDef[]
) {
  const existing = await prisma.formTemplate.findFirst({
    where: { departmentId, moduleKey, name },
  });
  if (existing) {
    console.log(`  ↳ Template "${name}" already exists — skipping.`);
    return;
  }
  const template = await prisma.formTemplate.create({
    data: { departmentId, name, moduleKey, isActive: true },
  });
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const s = sections[sIdx];
    const section = await prisma.formSection.create({
      data: { templateId: template.id, title: s.title, order: sIdx },
    });
    for (let fIdx = 0; fIdx < s.fields.length; fIdx++) {
      const f = s.fields[fIdx];
      await prisma.formField.create({
        data: {
          sectionId: section.id,
          label: f.label,
          fieldKey: f.fieldKey,
          type: f.type,
          options: f.options ?? null,
          isRequired: f.isRequired ?? false,
          order: fIdx,
        },
      });
    }
  }
  console.log(`  ✓ "${name}" — ${sections.length} sections.`);
}

async function main() {
  const dept = await prisma.department.findUniqueOrThrow({ where: { code: "ORTHO" } });
  console.log(`\nSeeding form templates for: ${dept.name}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // 1. MEDICAL HISTORY
  //    All checkboxes, text fields and sub-options from the record form
  // ═══════════════════════════════════════════════════════════════════
  await buildTemplate(dept.id, "Medical & Dental History", "medical_history", [
    {
      title: "A. Medical History",
      fields: [
        {
          label: "Medical Conditions",
          fieldKey: "medical_conditions",
          type: "MULTISELECT",
          options: [
            "Asthma",
            "Diabetes",
            "Heart problems",
            "Bleeding disorders",
            "Epilepsy",
            "Rheumatic fever",
            "Hepatitis A",
            "Hepatitis B",
            "Hepatitis C",
            "HIV / AIDS",
            "Hospitalization history",
            "Surgery history",
            "No conditions",
          ],
        },
        {
          label: "Other Condition (specify)",
          fieldKey: "medical_conditions_other",
          type: "TEXT",
        },
      ],
    },
    {
      title: "B. Allergies",
      fields: [
        {
          label: "Allergies",
          fieldKey: "allergies",
          type: "MULTISELECT",
          options: ["None", "Latex", "Penicillin", "Anesthetics"],
        },
        { label: "Food Allergy (specify)", fieldKey: "allergy_food",  type: "TEXT" },
        { label: "Other Allergy (specify)", fieldKey: "allergy_other", type: "TEXT" },
      ],
    },
    {
      title: "C. Medications",
      fields: [
        { label: "Current Medication", fieldKey: "current_medication", type: "TEXT" },
        { label: "Dose",               fieldKey: "medication_dose",    type: "TEXT" },
      ],
    },
    {
      title: "D. Family History",
      fields: [
        {
          label: "Family History",
          fieldKey: "family_history",
          type: "MULTISELECT",
          options: [
            "No significant history",
            "Similar orthodontic cases",
          ],
        },
        { label: "Genetic Disorders (specify)", fieldKey: "genetic_disorders", type: "TEXT" },
      ],
    },
    {
      title: "E. Habits",
      fields: [
        {
          label: "Habits",
          fieldKey: "habits",
          type: "MULTISELECT",
          options: [
            "Thumb sucking",
            "Lip sucking",
            "Tongue thrust",
            "Nail biting",
            "Bruxism",
            "Mouth breathing",
          ],
        },
        { label: "Other Habit (specify)", fieldKey: "habits_other", type: "TEXT" },
      ],
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 2. CLINICAL EXAMINATION
  //    Extraoral → Intraoral → Occlusion Analysis
  //    Every section and sub-option from the record form
  // ═══════════════════════════════════════════════════════════════════
  await buildTemplate(dept.id, "Orthodontic Clinical Examination", "examination", [

    // ── EXTRAORAL ─────────────────────────────────────────────────
    {
      title: "A. Extraoral — Facial Profile",
      fields: [
        {
          label: "Facial Profile",
          fieldKey: "facial_profile",
          type: "RADIO",
          options: ["Straight", "Convex", "Concave"],
          isRequired: true,
        },
      ],
    },
    {
      title: "B. Extraoral — Facial Form",
      fields: [
        {
          label: "Facial Form",
          fieldKey: "facial_form",
          type: "RADIO",
          options: ["Mesofacial", "Dolichofacial", "Brachyfacial"],
        },
      ],
    },
    {
      title: "C. Extraoral — Symmetry",
      fields: [
        {
          label: "Symmetry",
          fieldKey: "symmetry",
          type: "RADIO",
          options: ["Symmetrical", "Asymmetrical"],
        },
        {
          label: "Asymmetry Location",
          fieldKey: "asymmetry_location",
          type: "MULTISELECT",
          options: ["Upper", "Lower", "Chin deviation"],
        },
      ],
    },
    {
      title: "D. Extraoral — TMJ (Temporomandibular Joint)",
      fields: [
        {
          label: "TMJ Status",
          fieldKey: "tmj_status",
          type: "RADIO",
          options: ["Normal", "Clicking", "Deviation", "Pain"],
        },
        { label: "TMJ Notes", fieldKey: "tmj_notes", type: "TEXT" },
      ],
    },
    {
      title: "E. Extraoral — Lips",
      fields: [
        {
          label: "Lip Competency",
          fieldKey: "lip_competency",
          type: "RADIO",
          options: ["Competent", "Incompetent"],
        },
        {
          label: "Lip Shape",
          fieldKey: "lip_shape",
          type: "RADIO",
          options: ["Normal", "Short upper lip"],
        },
        {
          label: "Lip Strain",
          fieldKey: "lip_strain",
          type: "RADIO",
          options: ["Present", "Absent"],
        },
      ],
    },
    {
      title: "F. Extraoral — Nasolabial Angle",
      fields: [
        {
          label: "Nasolabial Angle",
          fieldKey: "nasolabial_angle",
          type: "RADIO",
          options: ["Normal", "Acute", "Obtuse"],
        },
      ],
    },

    // ── INTRAORAL ─────────────────────────────────────────────────
    {
      title: "G. Intraoral — Oral Hygiene",
      fields: [
        {
          label: "Oral Hygiene",
          fieldKey: "oral_hygiene",
          type: "RADIO",
          options: ["Good", "Fair", "Poor"],
          isRequired: true,
        },
        {
          label: "Periodontal Findings",
          fieldKey: "periodontal_findings",
          type: "MULTISELECT",
          options: ["Gingivitis", "Periodontitis", "Calculus present"],
        },
        { label: "Oral Hygiene Notes", fieldKey: "oral_hygiene_notes", type: "TEXTAREA" },
      ],
    },
    {
      title: "H. Intraoral — Arch Form",
      fields: [
        {
          label: "Upper Arch Form",
          fieldKey: "upper_arch_form",
          type: "RADIO",
          options: ["U-shaped", "V-shaped", "Square"],
        },
        {
          label: "Lower Arch Form",
          fieldKey: "lower_arch_form",
          type: "RADIO",
          options: ["U-shaped", "V-shaped", "Square"],
        },
      ],
    },
    {
      title: "I. Intraoral — Crowding / Spacing",
      fields: [
        {
          label: "Upper — Crowding or Spacing",
          fieldKey: "upper_crowding_or_spacing",
          type: "RADIO",
          options: ["Crowding", "Spacing", "Neither"],
        },
        { label: "Upper Amount (mm)", fieldKey: "upper_crowding_spacing_mm", type: "NUMBER" },
        {
          label: "Lower — Crowding or Spacing",
          fieldKey: "lower_crowding_or_spacing",
          type: "RADIO",
          options: ["Crowding", "Spacing", "Neither"],
        },
        { label: "Lower Amount (mm)", fieldKey: "lower_crowding_spacing_mm", type: "NUMBER" },
      ],
    },
    {
      title: "J. Intraoral — Teeth",
      fields: [
        { label: "Missing Teeth",         fieldKey: "missing_teeth",        type: "TEXT" },
        { label: "Extracted Teeth",       fieldKey: "extracted_teeth",      type: "TEXT" },
        { label: "Retained Primary Teeth",fieldKey: "retained_primary_teeth",type: "TEXT" },
        { label: "Supernumerary Teeth",   fieldKey: "supernumerary_teeth",  type: "TEXT" },
        { label: "Unerupted Teeth",       fieldKey: "unerupted_teeth",      type: "TEXT" },
      ],
    },

    // ── OCCLUSION ANALYSIS ────────────────────────────────────────
    {
      title: "K. Occlusion — Molar Relationship (Angle's Classification)",
      fields: [
        {
          label: "Molar Relationship",
          fieldKey: "molar_relationship",
          type: "RADIO",
          options: ["Class I", "Class II div 1", "Class II div 2", "Class III"],
          isRequired: true,
        },
      ],
    },
    {
      title: "L. Occlusion — Canine Relationship",
      fields: [
        {
          label: "Canine Relationship",
          fieldKey: "canine_relationship",
          type: "RADIO",
          options: ["Class I", "Class II", "Class III"],
        },
      ],
    },
    {
      title: "M. Occlusion — Overjet",
      fields: [
        { label: "Overjet (mm)", fieldKey: "overjet_mm", type: "NUMBER" },
        {
          label: "Overjet Classification",
          fieldKey: "overjet_classification",
          type: "RADIO",
          options: ["Normal", "Increased", "Edge-to-edge", "Reverse"],
        },
      ],
    },
    {
      title: "N. Occlusion — Overbite",
      fields: [
        { label: "Overbite (%)", fieldKey: "overbite_percent", type: "NUMBER" },
        {
          label: "Overbite Classification",
          fieldKey: "overbite_classification",
          type: "RADIO",
          options: ["Normal", "Deep", "Open bite"],
        },
      ],
    },
    {
      title: "O. Occlusion — Crossbite",
      fields: [
        {
          label: "Crossbite",
          fieldKey: "crossbite",
          type: "RADIO",
          options: ["None", "Anterior", "Posterior"],
        },
        {
          label: "Crossbite Laterality",
          fieldKey: "crossbite_laterality",
          type: "RADIO",
          options: ["Unilateral", "Bilateral"],
        },
      ],
    },
    {
      title: "P. Occlusion — Midline Deviation",
      fields: [
        {
          label: "Upper Midline",
          fieldKey: "upper_midline",
          type: "RADIO",
          options: ["Centred", "Deviated to right", "Deviated to left"],
        },
        { label: "Upper Midline Deviation (mm)", fieldKey: "upper_midline_mm", type: "NUMBER" },
        {
          label: "Lower Midline",
          fieldKey: "lower_midline",
          type: "RADIO",
          options: ["Centred", "Deviated to right", "Deviated to left"],
        },
        { label: "Lower Midline Deviation (mm)", fieldKey: "lower_midline_mm", type: "NUMBER" },
      ],
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 3. FINAL DIAGNOSIS
  //    Skeletal + Dental + Soft Tissue + Diagnostic Records
  // ═══════════════════════════════════════════════════════════════════
  await buildTemplate(dept.id, "Orthodontic Diagnosis", "diagnosis", [
    {
      title: "Final Diagnosis — Skeletal",
      fields: [
        {
          label: "Skeletal Classification",
          fieldKey: "skeletal_classification",
          type: "RADIO",
          options: ["Class I", "Class II", "Class III"],
          isRequired: true,
        },
      ],
    },
    {
      title: "Final Diagnosis — Dental",
      fields: [
        {
          label: "Dental Findings",
          fieldKey: "dental_findings",
          type: "MULTISELECT",
          options: [
            "Crowding",
            "Spacing",
            "Deep Bite",
            "Open Bite",
            "Crossbite",
          ],
        },
      ],
    },
    {
      title: "Final Diagnosis — Soft Tissue & Other",
      fields: [
        { label: "Soft Tissue Findings", fieldKey: "soft_tissue_findings", type: "TEXTAREA" },
        { label: "Other Findings",       fieldKey: "other_findings",       type: "TEXTAREA" },
      ],
    },
    {
      title: "Diagnostic Records",
      fields: [
        { label: "Intraoral Photos Taken",        fieldKey: "intraoral_photos",           type: "CHECKBOX" },
        { label: "No. of Intraoral Photos",        fieldKey: "intraoral_photos_count",     type: "NUMBER"   },
        { label: "Extraoral Photos Taken",         fieldKey: "extraoral_photos",           type: "CHECKBOX" },
        { label: "No. of Extraoral Photos",        fieldKey: "extraoral_photos_count",     type: "NUMBER"   },
        { label: "Panoramic X-Ray Taken",          fieldKey: "panoramic_xray",             type: "CHECKBOX" },
        { label: "Panoramic X-Ray Date",           fieldKey: "panoramic_xray_date",        type: "DATE"     },
        { label: "Cephalometric X-Ray Taken",      fieldKey: "cephalometric_xray",         type: "CHECKBOX" },
        { label: "Cephalometric X-Ray Date",       fieldKey: "cephalometric_xray_date",    type: "DATE"     },
        { label: "Study Models Taken",             fieldKey: "study_models",               type: "CHECKBOX" },
        { label: "Study Models Date",              fieldKey: "study_models_date",          type: "DATE"     },
        { label: "CBCT Taken",                     fieldKey: "cbct",                       type: "CHECKBOX" },
        { label: "CBCT Date",                      fieldKey: "cbct_date",                  type: "DATE"     },
      ],
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 4. TREATMENT PLAN
  //    Objectives + all 6 treatment type categories + visit log
  // ═══════════════════════════════════════════════════════════════════
  await buildTemplate(dept.id, "Orthodontic Treatment Plan", "treatment_plan", [
    {
      title: "Treatment Objectives & Plan",
      fields: [
        { label: "Treatment Objectives",               fieldKey: "objectives",                 type: "TEXTAREA", isRequired: true },
        { label: "Appliances Planned",                 fieldKey: "appliances_planned",         type: "TEXTAREA" },
        { label: "Extractions (specify teeth if any)", fieldKey: "extractions",                type: "TEXT"     },
        { label: "Estimated Duration (Months)",        fieldKey: "estimated_duration_months",  type: "NUMBER"   },
        {
          label: "Retention Plan",
          fieldKey: "retention_plan",
          type: "RADIO",
          options: ["Removable", "Fixed", "Both Removable and Fixed"],
        },
        { label: "Retainer Type", fieldKey: "retainer_type", type: "TEXT" },
      ],
    },
    {
      title: "Fixed Appliances",
      fields: [
        {
          label: "Fixed Appliance Type",
          fieldKey: "fixed_appliances",
          type: "MULTISELECT",
          options: [
            "Metal Brackets",
            "Ceramic Brackets",
            "Self-ligating Brackets",
            "Lingual Braces",
          ],
        },
      ],
    },
    {
      title: "Removable Appliances",
      fields: [
        {
          label: "Removable Appliance Type",
          fieldKey: "removable_appliances",
          type: "MULTISELECT",
          options: [
            "Hawley Retainer",
            "Essix Retainer",
            "Functional Appliance — Twin Block",
            "Functional Appliance — Bionator",
          ],
        },
      ],
    },
    {
      title: "Clear Aligners",
      fields: [
        {
          label: "Clear Aligner System",
          fieldKey: "clear_aligners",
          type: "MULTISELECT",
          options: ["Invisalign", "Other clear aligner system"],
        },
        { label: "Other Aligner System (specify)", fieldKey: "clear_aligners_other", type: "TEXT" },
      ],
    },
    {
      title: "Orthopedic Appliances",
      fields: [
        {
          label: "Orthopedic Appliance Type",
          fieldKey: "orthopedic_appliances",
          type: "MULTISELECT",
          options: [
            "Headgear",
            "Facemask",
            "Chin Cup",
            "Palatal Expander — Rapid (RME)",
            "Palatal Expander — Slow (SME)",
          ],
        },
      ],
    },
    {
      title: "Surgical Treatment",
      fields: [
        {
          label: "Surgical Procedure",
          fieldKey: "surgical_treatment",
          type: "MULTISELECT",
          options: [
            "Orthognathic Surgery",
            "Exposure and bonding of impacted teeth",
            "Frenectomy",
          ],
        },
      ],
    },
    {
      title: "Interceptive Treatment",
      fields: [
        {
          label: "Interceptive Treatment Type",
          fieldKey: "interceptive_treatment",
          type: "MULTISELECT",
          options: [
            "Space Maintainers",
            "Space Regainers",
            "Habit Breakers",
            "Expansion Devices",
          ],
        },
      ],
    },
    {
      title: "Treatment Visit Log",
      fields: [
        { label: "Visit Date",            fieldKey: "visit_date",          type: "DATE"     },
        { label: "Tool / Appliance Name", fieldKey: "tool_name",           type: "TEXT"     },
        { label: "Tool Size",             fieldKey: "tool_size",           type: "TEXT"     },
        {
          label: "Tool Type",
          fieldKey: "tool_type",
          type: "SELECT",
          options: [
            "Archwire",
            "Module / Ligature",
            "Coil Spring — Open",
            "Coil Spring — Closed",
            "Power Chain",
            "Elastics",
            "Band",
            "Bracket",
            "Aligner",
            "Retainer",
            "Other",
          ],
        },
        { label: "Mechanics Used",       fieldKey: "mechanics_used",      type: "TEXTAREA" },
        { label: "Actions Performed",    fieldKey: "actions_performed",   type: "TEXTAREA" },
        { label: "Appliances Adjusted",  fieldKey: "appliances_adjusted", type: "TEXT"     },
        { label: "Notes / Next Steps",   fieldKey: "notes_next_steps",    type: "TEXTAREA" },
      ],
    },
    {
      title: "Case Management",
      fields: [
        { label: "Orthodontist", fieldKey: "orthodontist", type: "TEXT" },
        { label: "Supervisor",   fieldKey: "supervisor",   type: "TEXT" },
      ],
    },
  ]);

  console.log("\n✅  All form templates seeded.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
