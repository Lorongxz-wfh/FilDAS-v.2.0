<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\DocumentTemplate;
use App\Models\TemplateTag;
use App\Models\Office;
use App\Models\User;

class TemplateSeeder extends Seeder
{
    /** Generate a minimal but valid 3-page-less PDF in memory (no external file needed). */
    private function makePdf(): string
    {
        $header = "%PDF-1.4\n";
        $obj1   = "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
        $obj2   = "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
        $obj3   = "3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n";

        $off1    = strlen($header);
        $off2    = $off1 + strlen($obj1);
        $off3    = $off2 + strlen($obj2);
        $xrefPos = $off3 + strlen($obj3);

        $xref = "xref\n0 4\n"
            . "0000000000 65535 f \n"
            . sprintf("%010d 00000 n \n", $off1)
            . sprintf("%010d 00000 n \n", $off2)
            . sprintf("%010d 00000 n \n", $off3)
            . "trailer\n<</Size 4 /Root 1 0 R>>\nstartxref\n{$xrefPos}\n%%EOF";

        return $header . $obj1 . $obj2 . $obj3 . $xref;
    }

    public function run(): void
    {
        $fixturePdf = database_path('seeders/fixtures/lorem_ipsum.pdf');
        $hasPdf     = file_exists($fixturePdf);

        $qa      = User::where('email', 'qa@example.com')->firstOrFail();
        $disk    = config('filesystems.default');

        // Use fixture PDF if available, otherwise generate a minimal valid PDF
        $pdfContent = $hasPdf ? file_get_contents($fixturePdf) : $this->makePdf();
        $pdfSize    = strlen($pdfContent);

        $officeId = fn (?string $code): ?int =>
            $code ? Office::where('code', $code)->value('id') : null;

        // 5 global templates (uploaded by QA, no office scope)
        // + 5 office-scoped templates (1 per academic office head)
        $definitions = [
            // ── Global (QA) ──────────────────────────────────────────────────
            [
                'name'        => 'Faculty Accomplishment Report Template',
                'description' => 'University-wide template for documenting faculty accomplishments in instruction, research, and extension services.',
                'office'      => null,
                'filename'    => 'Faculty_Accomplishment_Report_Template.pdf',
                'tags'        => ['faculty', 'accomplishment'],
            ],
            [
                'name'        => 'Document Request Form Template',
                'description' => 'Standard form template for submitting document requests to the QA office.',
                'office'      => null,
                'filename'    => 'Document_Request_Form_Template.pdf',
                'tags'        => ['request', 'form'],
            ],
            [
                'name'        => 'Memorandum Template',
                'description' => 'Official memorandum format for internal communications between offices and departments.',
                'office'      => null,
                'filename'    => 'Memorandum_Template.pdf',
                'tags'        => ['memo', 'communication'],
            ],
            [
                'name'        => 'Action Plan Template',
                'description' => 'Structured action plan format for documenting objectives, strategies, timelines, and responsible persons.',
                'office'      => null,
                'filename'    => 'Action_Plan_Template.pdf',
                'tags'        => ['planning', 'action-plan'],
            ],
            [
                'name'        => 'Meeting Minutes Template',
                'description' => 'Standard minutes of the meeting format including attendance, agenda items, discussions, and resolutions.',
                'office'      => null,
                'filename'    => 'Meeting_Minutes_Template.pdf',
                'tags'        => ['meeting', 'minutes'],
            ],

            // ── Office-scoped (1 per academic head) ──────────────────────────
            [
                'name'        => 'Course Syllabus Template',
                'description' => 'Standard course syllabus format aligned with CHED and institutional guidelines.',
                'office'      => 'CCS',
                'filename'    => 'CCS_Course_Syllabus_Template.pdf',
                'tags'        => ['syllabus', 'curriculum'],
            ],
            [
                'name'        => 'Business Case Study Format',
                'description' => 'Standardized template for business case study presentations and analytical reports.',
                'office'      => 'CBA',
                'filename'    => 'CBA_Business_Case_Study_Template.pdf',
                'tags'        => ['business', 'case-study'],
            ],
            [
                'name'        => 'Clinical Case Study Documentation Form',
                'description' => 'Template for documenting clinical nursing case studies and patient care plans.',
                'office'      => 'CN',
                'filename'    => 'CN_Clinical_Case_Study_Form.pdf',
                'tags'        => ['nursing', 'clinical'],
            ],
            [
                'name'        => 'Lesson Plan Template (RPMS-PPST)',
                'description' => 'Detailed lesson plan template following the RPMS-PPST framework for teacher education.',
                'office'      => 'CTE',
                'filename'    => 'CTE_Lesson_Plan_Template.pdf',
                'tags'        => ['lesson-plan', 'teaching'],
            ],
            [
                'name'        => 'Event and Catering Proposal Form',
                'description' => 'Template for hospitality and events management proposals including costing and menu planning.',
                'office'      => 'CHTM',
                'filename'    => 'CHTM_Event_Proposal_Template.pdf',
                'tags'        => ['events', 'catering'],
            ],
        ];

        foreach ($definitions as $def) {
            if (DocumentTemplate::where('name', $def['name'])->exists()) {
                continue;
            }

            $uuid       = Str::uuid();
            $storedPath = 'document_templates/' . $uuid . '.pdf';
            Storage::disk($disk)->put($storedPath, $pdfContent);

            $template = DocumentTemplate::create([
                'name'              => $def['name'],
                'description'       => $def['description'],
                'original_filename' => $def['filename'],
                'file_path'         => $storedPath,
                'file_size'         => $pdfSize,
                'mime_type'         => 'application/pdf',
                'uploaded_by'       => $qa->id,
                'office_id'         => $officeId($def['office']),
            ]);

            $tagIds = collect($def['tags'])->map(
                fn (string $name) => TemplateTag::firstOrCreate(['name' => $name])->id
            );

            $template->tags()->sync($tagIds);
        }

        $this->command->info('TemplateSeeder: seeded ' . count($definitions) . ' templates.');
    }
}
