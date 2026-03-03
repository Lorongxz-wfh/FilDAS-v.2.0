<?php

namespace App\Services;

use App\Models\DocumentVersion;
use App\Services\DocumentPreviewService;

class DocumentVersionFileService
{
    public function saveVersionFile(DocumentVersion $version, $file): void
    {
        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        if (!is_dir($storageRoot)) {
            mkdir($storageRoot, 0775, true);
        }

        // Delete old
        $this->deleteVersionFiles($version);

        $year = now()->year;
        $folder = $storageRoot . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $version->id;
        if (!is_dir($folder)) {
            mkdir($folder, 0775, true);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $storedName = 'original.' . $extension;
        $fullPath = $folder . DIRECTORY_SEPARATOR . $storedName;

        $file->move($folder, $storedName);

        $version->original_filename = $file->getClientOriginalName();
        $version->file_path = $year . '/' . $version->id . '/' . $storedName;

        $previewFileName = DocumentPreviewService::generatePreview($folder, $fullPath);

        $version->preview_path = $previewFileName
            ? ($year . '/' . $version->id . '/' . $previewFileName)
            : null;

        $version->save();
    }

    public function deleteVersionFiles(DocumentVersion $version): void
    {
        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));

        if ($version->file_path) {
            $p = $storageRoot . DIRECTORY_SEPARATOR . $version->file_path;
            if (file_exists($p)) @unlink($p);
        }
        if ($version->preview_path) {
            $p = $storageRoot . DIRECTORY_SEPARATOR . $version->preview_path;
            if (file_exists($p)) @unlink($p);
        }
    }
}
