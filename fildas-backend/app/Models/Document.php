<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'doctype',
        'owner_office_id',
        'review_office_id',
        'visibility_scope',
        'code',
        'school_year',
        'semester',
        'created_by',
    ];

    public function ownerOffice()
    {
        return $this->belongsTo(Office::class, 'owner_office_id');
    }

    public function reviewOffice()
    {
        return $this->belongsTo(Office::class, 'review_office_id');
    }


    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function versions()
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version_number');
    }

    public function sharedOffices()
    {
        return $this->belongsToMany(Office::class, 'document_shares', 'document_id', 'office_id')
            ->withTimestamps();
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'document_tag', 'document_id', 'tag_id');
    }

    public function latestVersion()
    {
        return $this->hasOne(DocumentVersion::class)
            ->latestOfMany('version_number')
            ->select([
                'document_versions.id',
                'document_versions.document_id',
                'document_versions.version_number',
                'document_versions.status',
                'document_versions.workflow_type',
                'document_versions.updated_at',
                'document_versions.created_at',
            ]);
    }

    public function latestDistributedVersion()
    {
        return $this->hasOne(DocumentVersion::class)
            ->where('status', 'Distributed')
            ->ofMany('version_number', 'max');
    }

    public static function generateCode(Office $office, string $doctype, int $sequence): string
    {
        $docTypeCode = $doctype === 'forms' ? 'F' : 'D';
        $nextNum = str_pad($sequence, 3, '0', STR_PAD_LEFT);
        return "FCU-EOMS-{$office->code}-{$nextNum}-{$docTypeCode}";
    }
}
