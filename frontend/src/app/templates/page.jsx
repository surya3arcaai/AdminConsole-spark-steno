import { fetchApi } from "@/lib/api";
import TemplateManager from "@/components/TemplateManager";

export default async function TemplatesPage() {
    const clinicalRes = await fetchApi(8003, "/clinical/") || [];
    const dischargeRes = await fetchApi(8003, "/discharge/") || [];

    let initialClinical = clinicalRes.items || clinicalRes || [];
    let initialDischarge = dischargeRes.items || dischargeRes || [];

    if (initialClinical.length === 0) {
        initialClinical = [
            {
                id: 'mock-c1',
                name: 'Standard Clinical Summary',
                type: 'clinical',
                version: 1,
                updated_at: new Date().toISOString(),
                content: JSON.stringify([
                    "History of presenting complaints",
                    "Past Medical/Surgical History",
                    "Family History",
                    "Lifestyle History",
                    "Physical Examination",
                    "Investigation Summary",
                    "Assessment and Discussion",
                    "Management Plan",
                    "Prescription"
                ])
            }
        ];
    }

    if (initialDischarge.length === 0) {
        initialDischarge = [
            {
                id: 'mock-d1',
                name: 'Standard Discharge Summary',
                type: 'discharge',
                version: 1,
                updated_at: new Date().toISOString(),
                content: JSON.stringify([
                    "Diagnosis",
                    "Reason for Admission",
                    "History of Present Illness",
                    "Past History",
                    "Examination",
                    "Lab Reports",
                    "Course in the Hospital",
                    "Recommendations",
                    "Follow-Up Plan"
                ])
            }
        ];
    }

    const demographicsRes = await fetchApi(8005, "/demographics/") || { locations: [] };
    const locations = demographicsRes.locations || [];

    return (
        <TemplateManager
            initialClinical={initialClinical}
            initialDischarge={initialDischarge}
            locations={locations}
        />
    );
}
