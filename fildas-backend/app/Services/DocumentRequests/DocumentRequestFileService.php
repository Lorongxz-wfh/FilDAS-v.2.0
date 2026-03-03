<?php

namespace App\Services\DocumentRequests;

use App\Services\DocumentPreviewService;

class DocumentRequestFileService
{
    public function ensureStorageRoot(): string
    {
        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        if (!is_dir($storageRoot)) {
            mkdir($storageRoot, 0775, true);
        }
        return $storageRoot;
    }

    /**
     * Save a single "example" file for a document request.
     * Returns array: [original_filename, file_path, preview_path]
     */
    public function saveRequestExampleFile(int $requestId, $file): array
    {
        $storageRoot = $this->ensureStorageRoot();

        $year = now()->year;
        $folder = $storageRoot . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . 'document_requests' . DIRECTORY_SEPARATOR . $requestId;
        if (!is_dir($folder)) {
            mkdir($folder, 0775, true);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $storedName = 'example.' . $extension;
        $fullPath = $folder . DIRECTORY_SEPARATOR . $storedName;

        $originalName = method_exists($file, 'getClientOriginalName') ? $file->getClientOriginalName() : null;

        $file->move($folder, $storedName);

        $previewFileName = DocumentPreviewService::generatePreview($folder, $fullPath);

        return [
            'original_filename' => $originalName,
            'file_path' => $year . '/document_requests/' . $requestId . '/' . $storedName,
            'preview_path' => $previewFileName
                ? ($year . '/document_requests/' . $requestId . '/' . $previewFileName)
                : null,
        ];
    }

    /**
     * Save a submission file.
     * Returns array: [original_filename, file_path, preview_path, mime, size_bytes]
     */
    public function saveSubmissionFile(int $submissionId, $file, int $index): array
    {
        $storageRoot = $this->ensureStorageRoot();

        $year = now()->year;
        $folder = $storageRoot . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . 'document_request_submissions' . DIRECTORY_SEPARATOR . $submissionId;
        if (!is_dir($folder)) {
            mkdir($folder, 0775, true);
        }

        // Capture metadata BEFORE move(), because move() can invalidate the tmp file handle/path.
        $originalName = method_exists($file, 'getClientOriginalName') ? $file->getClientOriginalName() : null;
        $mime = method_exists($file, 'getClientMimeType') ? $file->getClientMimeType() : null;
        $sizeBytes = method_exists($file, 'getSize') ? (int) $file->getSize() : null;

        $extension = strtolower($file->getClientOriginalExtension());
        $storedName = 'file_' . $index . '.' . $extension;
        $fullPath = $folder . DIRECTORY_SEPARATOR . $storedName;

        $file->move($folder, $storedName);

        $previewFileName = DocumentPreviewService::generatePreview($folder, $fullPath);

        return [
            'original_filename' => $originalName,
            'file_path' => $year . '/document_request_submissions/' . $submissionId . '/' . $storedName,
            'preview_path' => $previewFileName
                ? ($year . '/document_request_submissions/' . $submissionId . '/' . $previewFileName)
                : null,
            'mime' => $mime,
            'size_bytes' => $sizeBytes,
        ];
    }

    public function deletePath(?string $relativePath): void
    {
        if (!$relativePath) return;

        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        $p = $storageRoot . DIRECTORY_SEPARATOR . $relativePath;
        if (file_exists($p)) {
            @unlink($p);
        }
    }
}
