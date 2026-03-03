<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DocumentPreviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class PreviewController extends Controller
{
    // POST /api/previews (auth)
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx|max:10240',
        ]);

        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        if (!is_dir($storageRoot)) {
            mkdir($storageRoot, 0775, true);
        }

        $year = now()->year;
        $previewId = (string) Str::uuid();

        $folder = $storageRoot . DIRECTORY_SEPARATOR . 'previews' . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $previewId;
        if (!is_dir($folder)) {
            mkdir($folder, 0775, true);
        }

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());

        // store original
        $originalName = 'original.' . $ext;
        $originalFullPath = $folder . DIRECTORY_SEPARATOR . $originalName;
        $file->move($folder, $originalName);

        // if PDF: skip conversion; just copy to preview.pdf
        if ($ext === 'pdf') {
            @copy($originalFullPath, $folder . DIRECTORY_SEPARATOR . 'preview.pdf');
        } else {
            $previewFileName = DocumentPreviewService::generatePreview($folder, $originalFullPath);

            if (!$previewFileName) {
                return response()->json(['message' => 'Preview generation failed.'], 422);
            }

            // normalize name to preview.pdf for stable serving
            @rename($folder . DIRECTORY_SEPARATOR . $previewFileName, $folder . DIRECTORY_SEPARATOR . 'preview.pdf');
        }

        $signedUrl = URL::temporarySignedRoute(
            'previews.preview',
            now()->addMinutes(60),
            ['year' => $year, 'preview' => $previewId]
        );

        return response()->json([
            'id' => $previewId,
            'year' => $year,
            'url' => $signedUrl,
        ], 201);
    }

    // GET /api/previews/{year}/{preview}/preview (signed)
    public function previewSigned(Request $request, int $year, string $preview)
    {
        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        $fullPath = $storageRoot . DIRECTORY_SEPARATOR . 'previews' . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $preview . DIRECTORY_SEPARATOR . 'preview.pdf';

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'Preview not found.'], Response::HTTP_NOT_FOUND);
        }

        return response()->file($fullPath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="preview.pdf"',
        ]);
    }

    // DELETE /api/previews/{year}/{preview} (auth)
    public function destroy(Request $request, int $year, string $preview)
    {
        $storageRoot = base_path(env('DOC_STORAGE_PATH', '../documents'));
        $dir = $storageRoot . DIRECTORY_SEPARATOR . 'previews' . DIRECTORY_SEPARATOR . $year . DIRECTORY_SEPARATOR . $preview;

        $this->rrmdir($dir);

        return response()->json(['message' => 'Preview deleted.'], 200);
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) return;

        $items = scandir($dir);
        if (!$items) return;

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;

            if (is_dir($path)) $this->rrmdir($path);
            else @unlink($path);
        }

        @rmdir($dir);
    }
}
