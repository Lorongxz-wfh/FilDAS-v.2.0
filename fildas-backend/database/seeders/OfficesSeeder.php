<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Office;

class OfficesSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            // President Office
            ['name' => "President's Office", 'code' => 'PO', 'type' => 'office', 'cluster_kind' => 'president'],
            ['name' => 'Human Resource', 'code' => 'HR', 'type' => 'office'],
            ['name' => 'Student Affairs Office', 'code' => 'SA', 'type' => 'office'],
            ['name' => 'Chaplaincy Office', 'code' => 'CH', 'type' => 'office'],
            ['name' => 'Alumni Affairs Office', 'code' => 'AA', 'type' => 'office'],

            // VP-Admin
            ['name' => 'VP-Admin', 'code' => 'VAD', 'type' => 'office', 'cluster_kind' => 'vp'],
            ['name' => 'Pollution Control', 'code' => 'PC', 'type' => 'office'],
            ['name' => 'Medical-Dental Clinic', 'code' => 'MD', 'type' => 'office'],
            ['name' => 'Security Office', 'code' => 'SO', 'type' => 'office'],
            ['name' => 'Sports Office', 'code' => 'SP', 'type' => 'office'],
            ['name' => 'Socio-Cultural Affairs', 'code' => 'SC', 'type' => 'office'],
            ['name' => 'Safety and Health', 'code' => 'SH', 'type' => 'office'],
            ['name' => 'Buildings and Grounds', 'code' => 'BG', 'type' => 'office'],
            ['name' => 'Mass Media', 'code' => 'MM', 'type' => 'office'],
            ['name' => 'Work-Study Program Office', 'code' => 'WP', 'type' => 'office'],
            ['name' => 'IT / MIS', 'code' => 'IT', 'type' => 'office'],

            // VP-Academic Affairs
            ['name' => 'VP-Academic Affairs', 'code' => 'VAR', 'type' => 'office', 'cluster_kind' => 'vp'],

            // Departments (Academic)
            ['name' => 'College of Nursing', 'code' => 'CN', 'type' => 'department'],
            ['name' => 'College of Business and Accountancy', 'code' => 'CB', 'type' => 'department'],
            ['name' => 'College of Teacher Education', 'code' => 'CT', 'type' => 'department'],
            ['name' => 'High School', 'code' => 'HS', 'type' => 'department'],
            ['name' => 'Elementary', 'code' => 'ES', 'type' => 'department'],
            ['name' => 'Preschool', 'code' => 'PS', 'type' => 'department'],
            ['name' => 'Graduate School', 'code' => 'GS', 'type' => 'department'],
            ['name' => 'College of Arts and Sciences', 'code' => 'AS', 'type' => 'department'],
            ['name' => 'College of Hospitality and Tourism Management', 'code' => 'TM', 'type' => 'department'],
            ['name' => 'College of Computer Studies', 'code' => 'CS', 'type' => 'department'],
            ['name' => 'College of Criminal Justice Education', 'code' => 'JE', 'type' => 'department'],
            ['name' => 'College of Engineering', 'code' => 'CE', 'type' => 'department'],

            // Still under VP-Academic Affairs (non-department offices)
            ['name' => 'Registrar', 'code' => 'AR', 'type' => 'office'],
            ['name' => 'Guidance Counseling Center', 'code' => 'GC', 'type' => 'office'],
            ['name' => 'University Library', 'code' => 'UL', 'type' => 'office'],
            ['name' => 'NSTP', 'code' => 'NS', 'type' => 'office'],

            // VP-Finance
            ['name' => 'VP-Finance', 'code' => 'VFI', 'type' => 'office', 'cluster_kind' => 'vp'],
            ['name' => 'Accounting Office', 'code' => 'AO', 'type' => 'office'],
            ['name' => 'Bookkeeping', 'code' => 'BO', 'type' => 'office'],
            ['name' => 'Business Manager', 'code' => 'BM', 'type' => 'office'],
            ['name' => 'Cashier', 'code' => 'CO', 'type' => 'office'],
            ['name' => 'Property Custodian', 'code' => 'PR', 'type' => 'office'],
            ['name' => 'University Enterprise', 'code' => 'UE', 'type' => 'office'],

            // VP-REQA
            ['name' => 'VP-REQA', 'code' => 'VRQ', 'type' => 'office', 'cluster_kind' => 'vp'],
            ['name' => 'Research and Continuing Education', 'code' => 'RC', 'type' => 'office'],
            ['name' => 'Community Extension / Outreach', 'code' => 'CX', 'type' => 'office'],
            ['name' => 'Quality Assurance', 'code' => 'QA', 'type' => 'office'],
            ['name' => 'International Programs', 'code' => 'IP', 'type' => 'office'],
        ];




        foreach ($offices as $office) {
            Office::updateOrCreate(
                ['code' => $office['code']],
                [
                    'name' => $office['name'],
                    'type' => $office['type'] ?? 'office',
                    'cluster_kind' => $office['cluster_kind'] ?? null,
                ]
            );
        }

        // 2nd pass: assign parent_office_id using office codes
        $parentByCode = [
            // President cluster
            'HR' => 'PO',
            'SA' => 'PO',
            'CH' => 'PO',
            'AA' => 'PO',

            // VP-Admin cluster
            'PC' => 'VAD',
            'MD' => 'VAD',
            'SO' => 'VAD',
            'SP' => 'VAD',
            'SC' => 'VAD',
            'SH' => 'VAD',
            'BG' => 'VAD',
            'MM' => 'VAD',
            'WP' => 'VAD',
            'IT' => 'VAD',

            // VP-Academic Affairs cluster
            'CN' => 'VAR',
            'CB' => 'VAR',
            'CT' => 'VAR',
            'HS' => 'VAR',
            'ES' => 'VAR',
            'PS' => 'VAR',
            'GS' => 'VAR',
            'AS' => 'VAR',
            'TM' => 'VAR',
            'CS' => 'VAR',
            'JE' => 'VAR',
            'CE' => 'VAR',
            'AR' => 'VAR',
            'GC' => 'VAR',
            'UL' => 'VAR',
            'NS' => 'VAR',

            // VP-Finance cluster
            'AO' => 'VFI',
            'BO' => 'VFI',
            'BM' => 'VFI',
            'CO' => 'VFI',
            'PR' => 'VFI',
            'UE' => 'VFI',

            // VP-REQA cluster
            'RC' => 'VRQ',
            'CX' => 'VRQ',
            'QA' => 'VRQ',
            'IP' => 'VRQ',

            // VPs report to President
            'VAD' => 'PO',
            'VAR' => 'PO',
            'VFI' => 'PO',
            'VRQ' => 'PO',
        ];


        // Update parent_office_id
        foreach ($parentByCode as $childCode => $parentCode) {
            $child = Office::where('code', $childCode)->first();
            $parent = Office::where('code', $parentCode)->first();

            if ($child && $parent) {
                $child->parent_office_id = $parent->id;
                $child->save();
            }
        }
    }
}
