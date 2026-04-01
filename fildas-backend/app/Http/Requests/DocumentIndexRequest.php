<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DocumentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => 'nullable|string',
            'status' => 'nullable|string',
            'doctype' => 'nullable|string|in:INTERNAL,EXTERNAL,FORMS',
            
            // date range
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',

            // pagination
            'page' => 'nullable|integer|min:1',
            'perPage' => 'nullable|integer|min:1|max:100',

            // legacy / optional
            'owner_office_id' => 'nullable|integer|exists:offices,id',
            'assigned_office_id' => 'nullable|integer|exists:offices,id',
            'office_id' => 'nullable|integer|exists:offices,id',

            // workflow filters
            'phase' => 'nullable|string',
            'version_number' => 'nullable|integer',

            // sorting
            'sort_by' => 'nullable|string|in:title,created_at,code,updated_at',
            'sort_dir' => 'nullable|string|in:asc,desc',
        ];
    }
}
